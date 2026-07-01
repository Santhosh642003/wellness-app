import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '../lib/db.js';
import { authenticate, requireSelf } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/users/:userId
router.get('/:userId', requireSelf, async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [req.params.userId]);
    const { rows: moduleProgresses } = await pool.query(
      `SELECT ump.*, m.title, m.slug, m.category, m."orderIndex", m."pointsValue", m.locked
       FROM user_module_progress ump
       JOIN modules m ON m.id = ump."moduleId"
       WHERE ump."userId"=$1
       ORDER BY m."orderIndex"`,
      [req.params.userId]
    );
    const { rows: redemptions } = await pool.query(
      `SELECT rr.*, r.title, r.description, r."pointsCost", r.category
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr."rewardId"
       WHERE rr."userId"=$1
       ORDER BY rr."redeemedAt" DESC LIMIT 20`,
      [req.params.userId]
    );
    const { password, ...safe } = user;
    res.json({ ...safe, progress, moduleProgresses, redemptions });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:userId/profile
const profileSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
  campus: z.string().optional(),
  major: z.string().max(100).optional(),
  graduationYear: z.string().max(10).optional(),
  yearOfStudy: z.string().max(50).optional(),
  ethnicity: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

router.patch('/:userId/profile', requireSelf, async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    const sets = [];
    const vals = [];
    let i = 1;
    if (data.name) {
      const parts = data.name.trim().split(' ');
      const initials = parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : data.name.slice(0, 2).toUpperCase();
      sets.push(`name=$${i++}`, `initials=$${i++}`);
      vals.push(data.name.trim(), initials);
    }
    if (data.role !== undefined) { sets.push(`role=$${i++}`); vals.push(data.role); }
    if (data.campus !== undefined) { sets.push(`campus=$${i++}`); vals.push(data.campus); }
    if (data.major !== undefined) { sets.push(`major=$${i++}`); vals.push(data.major); }
    if (data.graduationYear !== undefined) { sets.push(`"graduationYear"=$${i++}`); vals.push(data.graduationYear); }
    if (data.yearOfStudy !== undefined) { sets.push(`"yearOfStudy"=$${i++}`); vals.push(data.yearOfStudy); }
    if (data.ethnicity !== undefined) { sets.push(`ethnicity=$${i++}`); vals.push(data.ethnicity); }
    if (data.bio !== undefined) { sets.push(`bio=$${i++}`); vals.push(data.bio); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    sets.push(`"updatedAt"=$${i++}`);
    vals.push(new Date());
    vals.push(req.params.userId);
    const { rows: [user] } = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:userId/daily-claim
router.post('/:userId/daily-claim', requireSelf, async (req, res, next) => {
  try {
    const { rows: [progress] } = await pool.query(
      'SELECT * FROM user_progress WHERE "userId"=$1', [req.params.userId]
    );
    if (!progress) return res.status(404).json({ error: 'User progress not found' });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStreak = 1;
    if (progress.lastClaimDate) {
      const lastClaim = new Date(progress.lastClaimDate);
      const lastDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      if (lastDay.getTime() === today.getTime()) {
        return res.status(409).json({ error: 'Already claimed today' });
      }
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak = lastDay.getTime() === yesterday.getTime() ? progress.streakDays + 1 : 1;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [updated] } = await client.query(
        `UPDATE user_progress SET points=points+25, "streakDays"=$1, "lastClaimDate"=$2, "updatedAt"=NOW()
         WHERE "userId"=$3 RETURNING *`,
        [newStreak, now, req.params.userId]
      );
      await client.query(
        `INSERT INTO point_ledger (id, "userId", source, points) VALUES ($1,$2,'daily_login',25)`,
        [randomUUID(), req.params.userId]
      );
      await client.query('COMMIT');
      res.json({ claimed: true, pointsEarned: 25, streakDays: updated.streakDays, totalPoints: updated.points });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/module-progress
router.get('/:userId/module-progress', requireSelf, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ump.*, m.title, m.slug, m.category, m."orderIndex", m."pointsValue", m.locked
       FROM user_module_progress ump
       JOIN modules m ON m.id = ump."moduleId"
       WHERE ump."userId"=$1
       ORDER BY m."orderIndex"`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:userId/module-progress/:moduleId
const moduleProgressSchema = z.object({
  watchedPercent: z.number().min(0).max(100).optional(),
  videoProgress: z.record(z.string(), z.number().min(0).max(100)).optional(),
  completed: z.boolean().optional(),
});

router.patch('/:userId/module-progress/:moduleId', requireSelf, async (req, res, next) => {
  try {
    const data = moduleProgressSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [module] } = await client.query(
        'SELECT * FROM modules WHERE id=$1', [req.params.moduleId]
      );
      if (!module) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Module not found' });
      }

      // Read current completion state BEFORE the upsert so the guard is accurate
      const { rows: [existing] } = await client.query(
        'SELECT completed FROM user_module_progress WHERE "userId"=$1 AND "moduleId"=$2',
        [req.params.userId, req.params.moduleId]
      );
      const wasCompleted = existing?.completed ?? false;

      // Build INSERT columns and ON CONFLICT UPDATE clauses separately
      const insertCols = [];
      const insertVals = [];
      const updateClauses = [];

      let resolvedWatchedPercent = data.watchedPercent;
      if (data.videoProgress && Object.keys(data.videoProgress).length > 0) {
        const percs = Object.values(data.videoProgress);
        resolvedWatchedPercent = Math.round(percs.reduce((a, b) => a + b, 0) / percs.length);
        insertCols.push('"videoProgress"');
        insertVals.push(JSON.stringify(data.videoProgress));
        updateClauses.push(`"videoProgress"=EXCLUDED."videoProgress"`);
      }

      if (resolvedWatchedPercent !== undefined) {
        insertCols.push('"watchedPercent"');
        insertVals.push(resolvedWatchedPercent);
        // Use GREATEST so progress never decreases on re-saves or reconnects
        updateClauses.push(`"watchedPercent"=GREATEST(user_module_progress."watchedPercent", EXCLUDED."watchedPercent")`);
      }

      if (data.completed !== undefined) {
        insertCols.push('completed');
        insertVals.push(data.completed);
        updateClauses.push(`completed=EXCLUDED.completed`);
        if (data.completed) {
          insertCols.push('"completedAt"');
          insertVals.push(new Date());
          updateClauses.push(`"completedAt"=COALESCE(user_module_progress."completedAt", EXCLUDED."completedAt")`);
        }
      }

      insertCols.push('"updatedAt"');
      insertVals.push(new Date());
      updateClauses.push(`"updatedAt"=EXCLUDED."updatedAt"`);

      const n = insertVals.length;
      const valPlaceholders = insertVals.map((_, i) => `$${i + 1}`).join(',');

      const { rows: [progress] } = await client.query(
        `INSERT INTO user_module_progress (id, "userId", "moduleId", ${insertCols.join(',')})
         VALUES ($${n + 1},$${n + 2},$${n + 3},${valPlaceholders})
         ON CONFLICT ("userId","moduleId") DO UPDATE SET ${updateClauses.join(',')}
         RETURNING *`,
        [...insertVals, randomUUID(), req.params.userId, req.params.moduleId]
      );

      // Award points only on first completion; wasCompleted was read before the upsert
      if (data.completed && !wasCompleted) {
        await client.query(
          `UPDATE user_progress SET points=points+$1, "updatedAt"=NOW() WHERE "userId"=$2`,
          [module.pointsValue, req.params.userId]
        );
        await client.query(
          `INSERT INTO point_ledger (id, "userId", source, points, "refId") VALUES ($1,$2,'module_completion',$3,$4)`,
          [randomUUID(), req.params.userId, module.pointsValue, req.params.moduleId]
        );
        const { rows: [nextModule] } = await client.query(
          `SELECT * FROM modules WHERE "orderIndex"=$1`, [module.orderIndex + 1]
        );
        if (nextModule) {
          await client.query(
            `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [randomUUID(), req.params.userId, nextModule.id]
          );
        }
      }

      await client.query('COMMIT');
      res.json(progress);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:userId/quiz
const quizSchema = z.object({
  moduleId: z.string().optional(),
  quizType: z.enum(['module', 'biweekly']),
  score: z.number().min(0),
  totalPoints: z.number().min(0),
  answers: z.array(z.any()),
});

router.post('/:userId/quiz', requireSelf, async (req, res, next) => {
  try {
    const data = quizSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Enforce 14-day cooldown for bi-weekly quiz
      if (data.quizType === 'biweekly') {
        const { rows: [recent] } = await client.query(
          `SELECT "createdAt" FROM quiz_attempts WHERE "userId"=$1 AND "quizType"='biweekly'
           AND "createdAt" > NOW() - INTERVAL '14 days' ORDER BY "createdAt" DESC LIMIT 1`,
          [req.params.userId]
        );
        if (recent) {
          await client.query('ROLLBACK');
          const nextAvailable = new Date(recent.createdAt);
          nextAvailable.setDate(nextAvailable.getDate() + 14);
          return res.status(409).json({ error: 'Already completed this period', nextAvailable: nextAvailable.toISOString() });
        }
      }

      const passed = data.score / data.totalPoints >= 0.7;
      const pointsEarned = passed ? Math.round(data.score * 0.5) : 0;

      const { rows: [attempt] } = await client.query(
        `INSERT INTO quiz_attempts (id, "userId", "moduleId", "quizType", score, "totalPoints", passed, answers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [randomUUID(), req.params.userId, data.moduleId || null, data.quizType,
         data.score, data.totalPoints, passed, JSON.stringify(data.answers)]
      );

      if (passed && pointsEarned > 0) {
        await client.query(
          `UPDATE user_progress SET points=points+$1, "updatedAt"=NOW() WHERE "userId"=$2`,
          [pointsEarned, req.params.userId]
        );
        await client.query(
          `INSERT INTO point_ledger (id, "userId", source, points, "refId") VALUES ($1,$2,'quiz_pass',$3,$4)`,
          [randomUUID(), req.params.userId, pointsEarned, attempt.id]
        );
      }

      if (passed && data.moduleId) {
        const { rows: [mod] } = await client.query('SELECT * FROM modules WHERE id=$1', [data.moduleId]);
        const { rows: [existingProg] } = await client.query(
          'SELECT completed FROM user_module_progress WHERE "userId"=$1 AND "moduleId"=$2',
          [req.params.userId, data.moduleId]
        );

        await client.query(
          `INSERT INTO user_module_progress (id, "userId", "moduleId", "quizPassed", completed, "completedAt", "watchedPercent")
           VALUES ($1,$2,$3,true,true,NOW(),100)
           ON CONFLICT ("userId","moduleId") DO UPDATE
             SET "quizPassed"=true,
                 completed=true,
                 "completedAt"=COALESCE(user_module_progress."completedAt", NOW()),
                 "watchedPercent"=GREATEST(user_module_progress."watchedPercent", 100)`,
          [randomUUID(), req.params.userId, data.moduleId]
        );

        if (!existingProg?.completed && mod) {
          await client.query(
            `UPDATE user_progress SET points=points+$1, "updatedAt"=NOW() WHERE "userId"=$2`,
            [mod.pointsValue, req.params.userId]
          );
          await client.query(
            `INSERT INTO point_ledger (id, "userId", source, points, "refId") VALUES ($1,$2,'module_completion',$3,$4)`,
            [randomUUID(), req.params.userId, mod.pointsValue, data.moduleId]
          );
          const { rows: [nextMod] } = await client.query(
            `SELECT id FROM modules WHERE "orderIndex"=$1`, [mod.orderIndex + 1]
          );
          if (nextMod) {
            await client.query(
              `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
              [randomUUID(), req.params.userId, nextMod.id]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ ...attempt, pointsEarned });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/bookmarks
router.get('/:userId/bookmarks', requireSelf, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b."moduleId", b."createdAt",
              m.title, m.slug, m.category, m."orderIndex", m."pointsValue", m."videoUrl",
              m.description, m.duration
       FROM bookmarks b
       JOIN modules m ON m.id = b."moduleId"
       WHERE b."userId" = $1
       ORDER BY b."createdAt" DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/users/:userId/bookmarks/:moduleId
router.post('/:userId/bookmarks/:moduleId', requireSelf, async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO bookmarks (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [randomUUID(), req.params.userId, req.params.moduleId]
    );
    res.status(201).json({ bookmarked: true, moduleId: req.params.moduleId });
  } catch (err) { next(err); }
});

// DELETE /api/users/:userId/bookmarks/:moduleId
router.delete('/:userId/bookmarks/:moduleId', requireSelf, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM bookmarks WHERE "userId"=$1 AND "moduleId"=$2`,
      [req.params.userId, req.params.moduleId]
    );
    res.json({ bookmarked: false, moduleId: req.params.moduleId });
  } catch (err) { next(err); }
});

// GET /api/users/:userId/activity
router.get('/:userId/activity', requireSelf, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT TO_CHAR(day::date, 'YYYY-MM-DD') AS date
       FROM (
         SELECT "createdAt" AS day FROM quiz_attempts
         WHERE "userId" = $1 AND "createdAt" >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "completedAt" AS day FROM user_module_progress
         WHERE "userId" = $1 AND "completedAt" IS NOT NULL
           AND "completedAt" >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "updatedAt" AS day FROM user_module_progress
         WHERE "userId" = $1 AND "watchedPercent" > 0
           AND "updatedAt" >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "lastClaimDate" AS day FROM user_progress
         WHERE "userId" = $1 AND "lastClaimDate" IS NOT NULL
       ) sub
       WHERE day IS NOT NULL
       ORDER BY date DESC`,
      [req.params.userId]
    );
    res.json(rows.map((r) => r.date));
  } catch (err) {
    next(err);
  }
});

export default router;
