import { Router } from 'express';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/modules
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*,
              ump.completed, ump."watchedPercent", ump."quizPassed", ump."completedAt"
       FROM modules m
       LEFT JOIN user_module_progress ump ON ump."moduleId"=m.id AND ump."userId"=$1
       ORDER BY m."orderIndex"`,
      [req.userId]
    );
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
    const { rows } = await pool.query(
      `SELECT m.*,
              ump.completed, ump."watchedPercent", ump."quizPassed", ump."completedAt"
       FROM modules m
       LEFT JOIN user_module_progress ump ON ump."moduleId"=m.id AND ump."userId"=$2
       WHERE m.id=$1`,
      [req.params.moduleId, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Module not found' });
    const { completed, watchedPercent, quizPassed, completedAt, ...module } = rows[0];
    res.json({ ...module, userProgress: completed !== null ? { completed, watchedPercent, quizPassed, completedAt } : null });
  } catch (err) {
    next(err);
  }
});

export default router;
