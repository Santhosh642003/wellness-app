import { Router } from 'express';
import { query } from '../db/database.js';

const adminRouter = Router();

adminRouter.get('/users', async (_req, res) => {
  const users = await query('SELECT id, name, email, role, streak_days, points, created_at FROM users ORDER BY id ASC');
  res.json({ users: users.rows });
});

adminRouter.post('/users', async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' });
  }

  const result = await query(
    'INSERT INTO users (name, email, password, role, streak_days, points) VALUES ($1, $2, $3, $4, 0, 0) RETURNING id, name, email, role, streak_days, points',
    [name, email, password, role],
  );
  return res.status(201).json({ user: result.rows[0] });
});

adminRouter.get('/quizzes', async (_req, res) => {
  const quizzes = await query('SELECT * FROM quizzes ORDER BY id ASC');
  res.json({ quizzes: quizzes.rows });
});

adminRouter.post('/quizzes', async (req, res) => {
  const { title, quiz_type = 'biweekly', is_active = true, questions = [] } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'title is required.' });
  }

  const result = await query(
    'INSERT INTO quizzes (title, quiz_type, is_active, questions) VALUES ($1, $2, $3, $4::jsonb) RETURNING *',
    [title, quiz_type, is_active, JSON.stringify(questions)],
  );

  return res.status(201).json({ quiz: result.rows[0] });
});

adminRouter.get('/rewards', async (_req, res) => {
  const rewards = await query('SELECT * FROM rewards ORDER BY id ASC');
  res.json({ rewards: rewards.rows });
});

adminRouter.post('/rewards', async (req, res) => {
  const { name, points_required, stock } = req.body;
  if (!name || points_required === undefined || stock === undefined) {
    return res.status(400).json({ message: 'name, points_required, and stock are required.' });
  }

  const result = await query(
    'INSERT INTO rewards (name, points_required, stock) VALUES ($1, $2, $3) RETURNING *',
    [name, points_required, stock],
  );

  return res.status(201).json({ reward: result.rows[0] });
});

adminRouter.get('/modules', async (_req, res) => {
  const modules = await query('SELECT * FROM modules ORDER BY id ASC');
  res.json({ modules: modules.rows });
});

adminRouter.post('/modules', async (req, res) => {
  const { title, category, duration_minutes, description, video_url = null, transcript = [] } = req.body;
  if (!title || !category || !duration_minutes || !description) {
    return res.status(400).json({ message: 'title, category, duration_minutes, and description are required.' });
  }

  const result = await query(
    `INSERT INTO modules (title, category, duration_minutes, description, video_url, transcript)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [title, category, duration_minutes, description, video_url, JSON.stringify(transcript)],
  );

  return res.status(201).json({ module: result.rows[0] });
});

adminRouter.get('/progress', async (_req, res) => {
  const progressByUser = await query(`
    SELECT u.id AS user_id, u.name, u.email, u.points, u.streak_days,
           COUNT(pe.id)::int AS events_count,
           COALESCE(SUM(pe.points_delta), 0)::int AS total_points_from_events
    FROM users u
    LEFT JOIN progress_events pe ON pe.user_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.points DESC
  `);

  res.json({ progressByUser: progressByUser.rows });
});

export default adminRouter;
