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
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [req.params.userId]);
    if (!progress) return res.status(404).json({ error: 'User progress not found' });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (progress.lastClaimDate) {
      const lastClaim = new Date(progress.lastClaimDate);
      const lastDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      if (lastDay.getTime() === today.getTime()) {
        return res.status(409).json({ error: 'Already claimed today' });
      }
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const streakContinues = lastDay.getTime() === yesterday.getTime();
      const { rows: [updated] } = await pool.query(
        `UPDATE user_progress SET points=points+25, "streakDays"=$1, "lastClaimDate"=$2 WHERE "userId"=$3 RETURNING *`,
        [streakContinues ? progress.streakDays + 1 : 1, now, req.params.userId]
      );
      return res.json({ claimed: true, pointsEarned: 25, streakDays: updated.streakDays, totalPoints: updated.points });
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE user_progress SET points=points+25, "streakDays"=1, "lastClaimDate"=$1 WHERE "userId"=$2 RETURNING *`,
      [now, req.params.userId]
    );
    res.json({ claimed: true, pointsEarned: 25, streakDays: updated.streakDays, totalPoints: updated.points });
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
  completed: z.boolean().optional(),
});

router.patch('/:userId/module-progress/:moduleId', requireSelf, async (req, res, next) => {
  try {
    const data = moduleProgressSchema.parse(req.body);
    const { rows: [module] } = await pool.query('SELECT * FROM modules WHERE id=$1', [req.params.moduleId]);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const sets = [];
    const vals = [];
    let i = 1;
    if (data.watchedPercent !== undefined) { sets.push(`"watchedPercent"=$${i++}`); vals.push(data.watchedPercent); }
    if (data.completed !== undefined) {
      sets.push(`completed=$${i++}`);
      vals.push(data.completed);
      if (data.completed) { sets.push(`"completedAt"=$${i++}`); vals.push(new Date()); }
    }
    sets.push(`"updatedAt"=$${i++}`);
    vals.push(new Date());

    const { rows: [progress] } = await pool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId", ${sets.map((s, idx) => s.split('=')[0]).join(',')})
       VALUES ($${i++},$${i++},$${i++},${vals.map((_, idx) => `$${idx + 1}`).join(',')})
       ON CONFLICT ("userId","moduleId") DO UPDATE SET ${sets.join(',')}
       RETURNING *`,
      [...vals, randomUUID(), req.params.userId, req.params.moduleId]
    );

    if (data.completed) {
      await pool.query(
        `INSERT INTO user_progress (id, "userId", points) VALUES ($1,$2,$3)
         ON CONFLICT ("userId") DO UPDATE SET points=user_progress.points+$3`,
        [randomUUID(), req.params.userId, module.pointsValue]
      );
      // Seed progress row for the next module so the per-user lock query works
      const { rows: [nextModule] } = await pool.query(
        `SELECT * FROM modules WHERE "orderIndex"=$1`, [module.orderIndex + 1]
      );
      if (nextModule) {
        await pool.query(
          `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [randomUUID(), req.params.userId, nextModule.id]
        );
      }
    }

    res.json(progress);
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

    // Enforce 14-day cooldown for bi-weekly quiz
    if (data.quizType === 'biweekly') {
      const { rows: [recent] } = await pool.query(
        `SELECT created_at FROM quiz_attempts WHERE "userId"=$1 AND "quizType"='biweekly'
         AND created_at > NOW() - INTERVAL '14 days' ORDER BY created_at DESC LIMIT 1`,
        [req.params.userId]
      );
      if (recent) {
        const nextAvailable = new Date(recent.created_at);
        nextAvailable.setDate(nextAvailable.getDate() + 14);
        return res.status(409).json({ error: 'Already completed this period', nextAvailable: nextAvailable.toISOString() });
      }
    }

    const passed = data.score / data.totalPoints >= 0.7;
    const pointsEarned = passed ? Math.round(data.score * 0.5) : 0;

    const { rows: [attempt] } = await pool.query(
      `INSERT INTO quiz_attempts (id, "userId", "moduleId", "quizType", score, "totalPoints", passed, answers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [randomUUID(), req.params.userId, data.moduleId || null, data.quizType, data.score, data.totalPoints, passed, JSON.stringify(data.answers)]
    );

    if (passed && pointsEarned > 0) {
      await pool.query(
        `INSERT INTO user_progress (id, "userId", points) VALUES ($1,$2,$3)
         ON CONFLICT ("userId") DO UPDATE SET points=user_progress.points+$3`,
        [randomUUID(), req.params.userId, pointsEarned]
      );
      if (data.moduleId) {
        await pool.query(
          `INSERT INTO user_module_progress (id, "userId", "moduleId", "quizPassed") VALUES ($1,$2,$3,true)
           ON CONFLICT ("userId","moduleId") DO UPDATE SET "quizPassed"=true`,
          [randomUUID(), req.params.userId, data.moduleId]
        );
      }
    }

    res.status(201).json({ ...attempt, pointsEarned });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/activity
// Returns active dates (YYYY-MM-DD) for the last 90 days derived from
// quiz attempts, module completions, and daily claims.
router.get('/:userId/activity', requireSelf, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT TO_CHAR(day::date, 'YYYY-MM-DD') AS date
       FROM (
         SELECT created_at AS day
         FROM quiz_attempts
         WHERE "userId" = $1 AND created_at >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "completedAt" AS day
         FROM user_module_progress
         WHERE "userId" = $1 AND "completedAt" IS NOT NULL
           AND "completedAt" >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "updatedAt" AS day
         FROM user_module_progress
         WHERE "userId" = $1 AND "watchedPercent" > 0
           AND "updatedAt" >= NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT "lastClaimDate" AS day
         FROM user_progress
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
