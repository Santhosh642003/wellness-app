import { Router } from 'express';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Per-user locked status: module is unlocked if it's the first (orderIndex=0)
// OR if the previous module has been completed by this user.
const PER_USER_MODULES_QUERY = `
  SELECT
    m.id, m.slug, m.title, m.description, m.duration, m.category,
    m."orderIndex", m."pointsValue", m."videoUrl", m."createdAt",
    CASE
      WHEN m."orderIndex" = 0 THEN false
      WHEN prev_prog.completed = true THEN false
      ELSE true
    END AS locked,
    ump.completed,
    ump."watchedPercent",
    ump."quizPassed",
    ump."completedAt"
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
    res.json(rows.map(({ completed, watchedPercent, quizPassed, completedAt, ...module }) => ({
      ...module,
      userProgress: completed !== null ? { completed, watchedPercent, quizPassed, completedAt } : null,
    })));
  } catch (err) {
    next(err);
  }
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
    const { completed, watchedPercent, quizPassed, completedAt, ...module } = rows[0];
    res.json({ ...module, userProgress: completed !== null ? { completed, watchedPercent, quizPassed, completedAt } : null });
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/:moduleId/quiz
router.get('/:moduleId/quiz', async (req, res, next) => {
  try {
    const { rows: [quiz] } = await pool.query(
      `SELECT * FROM quizzes WHERE "moduleId"=$1 AND type='module' LIMIT 1`,
      [req.params.moduleId]
    );
    if (!quiz) return res.status(404).json({ error: 'No quiz found for this module' });
    const { rows: questions } = await pool.query(
      `SELECT * FROM quiz_questions WHERE "quizId"=$1 ORDER BY "orderIndex"`,
      [quiz.id]
    );
    res.json({ ...quiz, questions });
  } catch (err) { next(err); }
});

// GET /api/modules/quiz/biweekly
router.get('/quiz/biweekly', async (req, res, next) => {
  try {
    const { rows: [quiz] } = await pool.query(`SELECT * FROM quizzes WHERE type='biweekly' LIMIT 1`);
    if (!quiz) return res.status(404).json({ error: 'Biweekly quiz not found' });
    const { rows: questions } = await pool.query(
      `SELECT * FROM quiz_questions WHERE "quizId"=$1 ORDER BY "orderIndex"`,
      [quiz.id]
    );
    res.json({ ...quiz, questions });
  } catch (err) { next(err); }
});

export default router;
