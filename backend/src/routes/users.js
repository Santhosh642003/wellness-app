import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import multer from 'multer';
import pool from '../lib/db.js';
import { authenticate, requireSelf } from '../middleware/auth.js';
import { awardPoints } from '../lib/points.js';
import { uploadFile, deleteFile } from '../lib/storage.js';
import { fileTypeFromBuffer } from 'file-type';

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(authenticate);

// GET /api/users/:userId
router.get('/:userId', requireSelf, async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [req.params.userId]);
    const { rows: moduleProgresses } = await pool.query(
      `SELECT ump.*, m.title, m.slug, m.category, m."orderIndex", m."pointsValue",
              CASE
                WHEN m.locked = false THEN false
                WHEN m."orderIndex" = 0 THEN false
                WHEN prev_prog.completed = true THEN false
                ELSE true
              END AS locked
       FROM user_module_progress ump
       JOIN modules m ON m.id = ump."moduleId"
       LEFT JOIN modules prev_m ON prev_m."orderIndex" = m."orderIndex" - 1
       LEFT JOIN user_module_progress prev_prog
         ON prev_prog."moduleId" = prev_m.id AND prev_prog."userId" = $1
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
  preferredName: z.string().max(100).optional(),
  role: z.string().optional(),
  campus: z.string().optional(),
  college: z.string().max(120).optional(),
  major: z.string().max(100).optional(),
  graduationYear: z.string().max(10).optional(),
  yearOfStudy: z.string().max(50).optional(),
  gender: z.string().max(100).optional(),
  pronouns: z.string().max(100).optional(),
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
    if (data.preferredName !== undefined) { sets.push(`"preferredName"=$${i++}`); vals.push(data.preferredName); }
    if (data.role !== undefined) { sets.push(`role=$${i++}`); vals.push(data.role); }
    if (data.campus !== undefined) { sets.push(`campus=$${i++}`); vals.push(data.campus); }
    if (data.college !== undefined) { sets.push(`college=$${i++}`); vals.push(data.college); }
    if (data.major !== undefined) { sets.push(`major=$${i++}`); vals.push(data.major); }
    if (data.graduationYear !== undefined) { sets.push(`"graduationYear"=$${i++}`); vals.push(data.graduationYear); }
    if (data.yearOfStudy !== undefined) { sets.push(`"yearOfStudy"=$${i++}`); vals.push(data.yearOfStudy); }
    if (data.gender !== undefined) { sets.push(`gender=$${i++}`); vals.push(data.gender); }
    if (data.pronouns !== undefined) { sets.push(`pronouns=$${i++}`); vals.push(data.pronouns); }
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

// POST /api/users/:userId/avatar
router.post('/:userId/avatar', requireSelf, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const fileType = await fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !fileType.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'File content does not match a valid image format' });
    }
    const { rows: [user] } = await pool.query('SELECT "avatarUrl" FROM users WHERE id=$1', [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const url = await uploadFile(req.file.buffer, `file.${fileType.ext}`, fileType.mime);
    if (user.avatarUrl) await deleteFile(user.avatarUrl);
    const { rows: [updated] } = await pool.query(
      'UPDATE users SET "avatarUrl"=$1, "updatedAt"=$2 WHERE id=$3 RETURNING *',
      [url, new Date(), req.params.userId]
    );
    const { password, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

async function checkAndPayReferral(client, referredUserId) {
  const { rows: [{ count }] } = await client.query(
    `SELECT COUNT(*) FROM user_module_progress WHERE "userId"=$1 AND completed=true`,
    [referredUserId]
  );
  if (parseInt(count) < 3) return;

  const { rows: [referral] } = await client.query(
    `SELECT * FROM referrals WHERE "referredId"=$1 AND "paidAt" IS NULL`,
    [referredUserId]
  );
  if (!referral) return;

  try {
    await awardPoints(client, {
      userId: referral.referrerId,
      source: 'referral_referrer',
      points: 100,
      refId: referredUserId,
      capPoints: 500,
      capScope: 'semester',
    });
    await client.query(
      `UPDATE referrals SET "paidAt"=NOW(), "pointsAwarded"=100, "modulesAtPayout"=$1 WHERE id=$2`,
      [parseInt(count), referral.id]
    );
  } catch (err) {
    if (err.code === 'NO_ACTIVE_SEMESTER') return; // retry on next completion
    throw err;
  }
}

// POST /api/users/:userId/daily-claim
router.post('/:userId/daily-claim', requireSelf, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock progress row to prevent concurrent double-claim
      const { rows: [progress] } = await client.query(
        'SELECT * FROM user_progress WHERE "userId"=$1 FOR UPDATE',
        [req.params.userId]
      );
      if (!progress) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User progress not found' });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let newStreak = 1;

      if (progress.lastClaimDate) {
        const lastClaim = new Date(progress.lastClaimDate);
        const lastDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
        if (lastDay.getTime() === today.getTime()) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Already claimed today' });
        }
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newStreak = lastDay.getTime() === yesterday.getTime() ? progress.streakDays + 1 : 1;
      }

      // Update streak/lastClaimDate unconditionally
      await client.query(
        `UPDATE user_progress SET "streakDays"=$1, "lastClaimDate"=$2, "updatedAt"=NOW() WHERE "userId"=$3`,
        [newStreak, now, req.params.userId]
      );

      // Award points — swallow NO_ACTIVE_SEMESTER (streak still saved)
      let awarded = 0;
      try {
        const result = await awardPoints(client, {
          userId: req.params.userId,
          source: 'daily_login',
          points: 10,
          capPoints: 300,
          capScope: 'semester',
        });
        awarded = result.awarded;
      } catch (err) {
        if (err.code !== 'NO_ACTIVE_SEMESTER') throw err;
      }

      const { rows: [updated] } = await client.query(
        'SELECT points FROM user_progress WHERE "userId"=$1',
        [req.params.userId]
      );

      await client.query('COMMIT');
      res.json({ claimed: true, pointsEarned: awarded, streakDays: newStreak, totalPoints: updated.points });
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
  videoTimestamps: z.record(z.string(), z.number().min(0)).optional(),
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

      if (data.videoTimestamps && Object.keys(data.videoTimestamps).length > 0) {
        insertCols.push('"videoTimestamps"');
        insertVals.push(JSON.stringify(data.videoTimestamps));
        updateClauses.push(`"videoTimestamps"=EXCLUDED."videoTimestamps"`);
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
        await awardPoints(client, {
          userId: req.params.userId,
          source: 'module_completion',
          points: module.pointsValue,
          refId: req.params.moduleId,
        });
        await checkAndPayReferral(client, req.params.userId);
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
  score: z.number().min(0).max(10000),
  totalPoints: z.number().min(1).max(10000),
  answers: z.array(z.any()).max(100),
});

router.post('/:userId/quiz', requireSelf, async (req, res, next) => {
  try {
    const data = quizSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Enforce 14-day cooldown for bi-weekly quiz (also backed by UNIQUE constraint on period)
      let biweeklyPeriod = null;
      if (data.quizType === 'biweekly') {
        // Stable 14-day bucket: floor(unix_days / 14). Two requests in the same window get the
        // same period string; the UNIQUE index rejects the second one atomically.
        biweeklyPeriod = `biweekly-${Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000))}`;
        const { rows: [recent] } = await client.query(
          `SELECT "createdAt" FROM quiz_attempts WHERE "userId"=$1 AND period=$2 LIMIT 1`,
          [req.params.userId, biweeklyPeriod]
        );
        if (recent) {
          await client.query('ROLLBACK');
          const nextAvailable = new Date(recent.createdAt);
          nextAvailable.setDate(nextAvailable.getDate() + 14);
          return res.status(409).json({ error: 'Already completed this period', nextAvailable: nextAvailable.toISOString() });
        }
      }

      // C1: Module quizzes are one-time — block replay once the user has already passed
      if (data.quizType === 'module' && data.moduleId) {
        const { rows: [priorPass] } = await client.query(
          `SELECT id FROM quiz_attempts WHERE "userId"=$1 AND "moduleId"=$2 AND "quizType"='module' AND passed=true LIMIT 1`,
          [req.params.userId, data.moduleId]
        );
        if (priorPass) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'You have already passed this module quiz' });
        }
      }

      // C2: Fetch real max points from the DB; clamp client-supplied score to that ceiling
      let validatedScore = data.score;
      let validatedTotalPoints = data.totalPoints;
      if (data.quizType === 'module' && data.moduleId) {
        const { rows: [qt] } = await client.query(
          `SELECT COALESCE(SUM(qq.points), 0)::int AS total
           FROM quizzes q
           JOIN quiz_questions qq ON qq."quizId" = q.id
           WHERE q."moduleId" = $1 AND q.type = 'module'`,
          [data.moduleId]
        );
        if (qt?.total > 0) {
          validatedTotalPoints = qt.total;
          validatedScore = Math.min(data.score, validatedTotalPoints);
        }
      } else if (data.quizType === 'biweekly') {
        const { rows: [qt] } = await client.query(
          `SELECT COALESCE(SUM(qq.points), 0)::int AS total
           FROM quizzes q
           JOIN quiz_questions qq ON qq."quizId" = q.id
           WHERE q.type = 'biweekly'`
        );
        if (qt?.total > 0) {
          validatedTotalPoints = qt.total;
          validatedScore = Math.min(data.score, validatedTotalPoints);
        }
      }

      const passed = validatedTotalPoints > 0 && validatedScore / validatedTotalPoints >= 0.7;
      const pointsEarned = passed ? (data.quizType === 'biweekly' ? 200 : Math.round(validatedScore * 0.5)) : 0;

      const { rows: [attempt] } = await client.query(
        `INSERT INTO quiz_attempts (id, "userId", "moduleId", "quizType", score, "totalPoints", passed, answers, period)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [randomUUID(), req.params.userId, data.moduleId || null, data.quizType,
         validatedScore, validatedTotalPoints, passed, JSON.stringify(data.answers), biweeklyPeriod]
      );

      if (passed && pointsEarned > 0) {
        try {
          await awardPoints(client, {
            userId: req.params.userId,
            source: data.quizType === 'biweekly' ? 'biweekly_quiz_pass' : 'quiz_pass',
            points: pointsEarned,
            refId: attempt.id,
            ...(data.quizType === 'biweekly' ? { capPoints: 1600, capScope: 'semester' } : {}),
          });
        } catch (err) {
          if (err.code !== 'NO_ACTIVE_SEMESTER') throw err;
          // biweekly points skipped — quiz attempt still commits below
        }
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
          await awardPoints(client, {
            userId: req.params.userId,
            source: 'module_completion',
            points: mod.pointsValue,
            refId: data.moduleId,
          });
          await checkAndPayReferral(client, req.params.userId);
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
      // M8: unique constraint violation on (userId, quizType, period) means a concurrent
      // request already committed this period's attempt — treat as "already attempted"
      if (err.code === '23505' && err.constraint?.includes('biweekly_period')) {
        return res.status(409).json({ error: 'Already completed this period' });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/points-summary
router.get('/:userId/points-summary', requireSelf, async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const { rows: [openPool] } = await pool.query(
      `SELECT "semesterLabel" FROM reward_pool WHERE "closedAt" IS NULL LIMIT 1`
    );
    const semesterLabel = openPool?.semesterLabel || null;

    const semesterSources = [
      { source: 'daily_login', cap: 300, label: 'Daily Login' },
      { source: 'biweekly_quiz_pass', cap: 1600, label: 'Bi-Weekly Quiz' },
      { source: 'event_checkin', cap: 1500, label: 'Event Check-ins' },
      { source: 'referral_referrer', cap: 500, label: 'Referrals' },
    ];
    const lifetimeSources = [
      { source: 'joining_bonus', cap: 200, label: 'Joining Bonus' },
    ];

    const sources = [];

    for (const s of semesterSources) {
      let earned = 0;
      if (semesterLabel) {
        const { rows: [row] } = await pool.query(
          `SELECT COALESCE(SUM(points), 0) AS total FROM point_ledger WHERE "userId"=$1 AND source=$2 AND "semesterLabel"=$3`,
          [userId, s.source, semesterLabel]
        );
        earned = parseInt(row.total);
      }
      sources.push({ ...s, scope: 'semester', earned, headroom: Math.max(0, s.cap - earned) });
    }

    for (const s of lifetimeSources) {
      const { rows: [row] } = await pool.query(
        `SELECT COALESCE(SUM(points), 0) AS total FROM point_ledger WHERE "userId"=$1 AND source=$2`,
        [userId, s.source]
      );
      const earned = parseInt(row.total);
      sources.push({ ...s, scope: 'lifetime', earned, headroom: Math.max(0, s.cap - earned) });
    }

    const { rows: [lifetimeRow] } = await pool.query(
      `SELECT COALESCE(SUM(points), 0) AS earned FROM point_ledger WHERE "userId"=$1 AND points > 0`,
      [userId]
    );

    res.json({ semesterLabel, sources, lifetimeEarned: parseInt(lifetimeRow.earned) });
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

// GET /api/users/:userId/referrals
router.get('/:userId/referrals', requireSelf, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r."referredId", r."pointsAwarded", r."paidAt", r."modulesAtPayout", r."createdAt",
              u.name AS "referredName",
              COUNT(ump.id) FILTER (WHERE ump.completed=true) AS "modulesCompleted"
       FROM referrals r
       JOIN users u ON u.id = r."referredId"
       LEFT JOIN user_module_progress ump ON ump."userId" = r."referredId"
       WHERE r."referrerId" = $1
       GROUP BY r.id, r."referredId", r."pointsAwarded", r."paidAt", r."modulesAtPayout", r."createdAt", u.name
       ORDER BY r."createdAt" DESC`,
      [req.params.userId]
    );
    res.json(rows.map((r) => ({
      ...r,
      modulesCompleted: parseInt(r.modulesCompleted),
      status: r.paidAt ? 'paid' : parseInt(r.modulesCompleted) >= 3 ? 'processing' : 'pending',
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
