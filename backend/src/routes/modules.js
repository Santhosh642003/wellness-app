import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Per-user locked status: module is unlocked if it's the first (orderIndex=0)
// OR if the previous module has been completed by this user.
const PER_USER_MODULES_QUERY = `
  SELECT
    m.id, m.slug, m.title, m.description, m.duration, m.category,
    m."orderIndex", m."pointsValue", m."videoUrl", m."thumbnailUrl", m."createdAt",
    m."keyPoints", m.transcript,
    COALESCE(m.videos, '[]'::jsonb) AS videos,
    COALESCE(m.documents, '[]'::jsonb) AS documents,
    CASE
      WHEN m.locked = false THEN false
      WHEN m."orderIndex" = 0 THEN false
      WHEN prev_prog.completed = true THEN false
      ELSE true
    END AS locked,
    ump.completed,
    ump."watchedPercent",
    ump."quizPassed",
    ump."completedAt",
    COALESCE(ump."videoProgress", '{}'::jsonb) AS "videoProgress",
    COALESCE(ump."videoTimestamps", '{}'::jsonb) AS "videoTimestamps"
  FROM modules m
  LEFT JOIN user_module_progress ump
    ON ump."moduleId" = m.id AND ump."userId" = $1
  LEFT JOIN modules prev_m
    ON prev_m."orderIndex" = m."orderIndex" - 1
  LEFT JOIN user_module_progress prev_prog
    ON prev_prog."moduleId" = prev_m.id AND prev_prog."userId" = $1
  ORDER BY m."orderIndex"
`;

// GET /api/modules
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(PER_USER_MODULES_QUERY, [req.userId]);
    res.json(rows.map(({ completed, watchedPercent, quizPassed, completedAt, videoProgress, videoTimestamps, ...module }) => ({
      ...module,
      userProgress: completed !== null ? { completed, watchedPercent, quizPassed, completedAt, videoProgress, videoTimestamps } : null,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/quiz/biweekly  ← MUST come before /:moduleId to avoid param capture
router.get('/quiz/biweekly', async (req, res, next) => {
  try {
    const { rows: [quiz] } = await pool.query(`SELECT * FROM quizzes WHERE type='biweekly' LIMIT 1`);
    if (!quiz) return res.status(404).json({ error: 'Biweekly quiz not found' });

    // Check scheduled date — quiz is locked if scheduledAt is set and in the future
    if (quiz.scheduledAt && new Date(quiz.scheduledAt) > new Date()) {
      return res.json({ scheduledLock: true, scheduledAt: quiz.scheduledAt });
    }

    // Check if user already attempted within the last 14 days
    const { rows: [recentAttempt] } = await pool.query(
      `SELECT * FROM quiz_attempts WHERE "userId"=$1 AND "quizType"='biweekly'
       AND "createdAt" > NOW() - INTERVAL '14 days'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [req.userId]
    );

    if (recentAttempt) {
      const nextAvailable = new Date(recentAttempt.createdAt);
      nextAvailable.setDate(nextAvailable.getDate() + 14);
      return res.json({
        ...quiz,
        questions: [],
        alreadyAttempted: true,
        score: recentAttempt.score,
        totalPoints: recentAttempt.totalPoints,
        passed: recentAttempt.passed,
        nextAvailable: nextAvailable.toISOString(),
      });
    }

    const { rows: questions } = await pool.query(
      `SELECT * FROM quiz_questions WHERE "quizId"=$1 ORDER BY "orderIndex"`,
      [quiz.id]
    );
    res.json({ ...quiz, questions, alreadyAttempted: false });
  } catch (err) { next(err); }
});

// GET /api/modules/:moduleId
router.get('/:moduleId', async (req, res, next) => {
  try {
    const query = PER_USER_MODULES_QUERY.replace(
      'ORDER BY m."orderIndex"',
      'WHERE m.id = $2\n  ORDER BY m."orderIndex"'
    );
    const { rows } = await pool.query(query, [req.userId, req.params.moduleId]);
    if (!rows[0]) return res.status(404).json({ error: 'Module not found' });
    const { completed, watchedPercent, quizPassed, completedAt, videoProgress, videoTimestamps, ...module } = rows[0];
    res.json({ ...module, userProgress: completed !== null ? { completed, watchedPercent, quizPassed, completedAt, videoProgress, videoTimestamps } : null });
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/:moduleId/quiz
// Returns quiz with retake cooldown enforcement (24-hour cooldown for module quizzes)
router.get('/:moduleId/quiz', async (req, res, next) => {
  try {
    const { rows: [quiz] } = await pool.query(
      `SELECT * FROM quizzes WHERE "moduleId"=$1 AND type='module' LIMIT 1`,
      [req.params.moduleId]
    );
    if (!quiz) return res.status(404).json({ error: 'No quiz found for this module' });

    // Check 24-hour retake cooldown (skip if user already passed)
    const { rows: [lastAttempt] } = await pool.query(
      `SELECT * FROM quiz_attempts
       WHERE "userId"=$1 AND "moduleId"=$2 AND "quizType"='module'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [req.userId, req.params.moduleId]
    );

    if (lastAttempt && !lastAttempt.passed) {
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
      const nextAvailable = new Date(lastAttempt.createdAt.getTime() + cooldownMs);
      if (nextAvailable > new Date()) {
        return res.json({
          ...quiz,
          questions: [],
          alreadyAttempted: true,
          passed: false,
          score: lastAttempt.score,
          totalPoints: lastAttempt.totalPoints,
          nextAvailable: nextAvailable.toISOString(),
        });
      }
    }

    const { rows: questions } = await pool.query(
      `SELECT * FROM quiz_questions WHERE "quizId"=$1 ORDER BY "orderIndex"`,
      [quiz.id]
    );
    res.json({ ...quiz, questions, alreadyAttempted: !!lastAttempt, passed: lastAttempt?.passed ?? false });
  } catch (err) { next(err); }
});

// GET /api/modules/:moduleId/comments
router.get('/:moduleId/comments', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.body, c."createdAt", c."updatedAt",
              u.name AS "userName", u.initials AS "userInitials", u.role AS "userRole",
              c."userId" = $2 AS "isOwn"
       FROM comments c
       JOIN users u ON u.id = c."userId"
       WHERE c."moduleId" = $1
       ORDER BY c."createdAt" ASC`,
      [req.params.moduleId, req.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/modules/:moduleId/comments
router.post('/:moduleId/comments', async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);
    const { rows: [comment] } = await pool.query(
      `INSERT INTO comments (id, "userId", "moduleId", body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [randomUUID(), req.userId, req.params.moduleId, body.trim()]
    );
    const { rows: [user] } = await pool.query('SELECT name, initials, role FROM users WHERE id=$1', [req.userId]);
    res.status(201).json({
      ...comment,
      userName: user.name,
      userInitials: user.initials,
      userRole: user.role,
      isOwn: true,
    });
  } catch (err) { next(err); }
});

// DELETE /api/modules/:moduleId/comments/:commentId
router.delete('/:moduleId/comments/:commentId', async (req, res, next) => {
  try {
    const { rows: [comment] } = await pool.query(
      'SELECT "userId" FROM comments WHERE id=$1 AND "moduleId"=$2',
      [req.params.commentId, req.params.moduleId]
    );
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.commentId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
