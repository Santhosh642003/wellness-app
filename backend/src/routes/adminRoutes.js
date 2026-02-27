import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const adminRouter = Router();

adminRouter.get('/users', async (_req, res) => {
  const db = await initDatabase();
  const users = await db.all('SELECT id, name, email, role, streak_days, points, created_at FROM users ORDER BY id ASC');
  res.json({ users });
});

adminRouter.post('/users', async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' });
  }

  const db = await initDatabase();
  const result = await db.run(
    'INSERT INTO users (name, email, password, role, streak_days, points) VALUES (?, ?, ?, ?, 0, 0)',
    [name, email, password, role],
  );

  const user = await db.get('SELECT id, name, email, role, streak_days, points FROM users WHERE id = ?', [result.lastID]);
  return res.status(201).json({ user });
});

adminRouter.get('/quizzes', async (_req, res) => {
  const db = await initDatabase();
  const quizzes = await db.all('SELECT * FROM quizzes ORDER BY id ASC');
  res.json({ quizzes });
});

adminRouter.post('/quizzes', async (req, res) => {
  const { title, quiz_type = 'biweekly', is_active = 1 } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'title is required.' });
  }

  const db = await initDatabase();
  const result = await db.run(
    'INSERT INTO quizzes (title, quiz_type, is_active) VALUES (?, ?, ?)',
    [title, quiz_type, is_active ? 1 : 0],
  );

  const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [result.lastID]);
  return res.status(201).json({ quiz });
});

adminRouter.patch('/quizzes/:id', async (req, res) => {
  const { title, quiz_type, is_active } = req.body;
  const db = await initDatabase();
  const existing = await db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);

  if (!existing) {
    return res.status(404).json({ message: 'Quiz not found.' });
  }

  await db.run('UPDATE quizzes SET title = ?, quiz_type = ?, is_active = ? WHERE id = ?', [
    title ?? existing.title,
    quiz_type ?? existing.quiz_type,
    is_active === undefined ? existing.is_active : is_active ? 1 : 0,
    req.params.id,
  ]);

  const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
  return res.json({ quiz });
});

adminRouter.get('/rewards', async (_req, res) => {
  const db = await initDatabase();
  const rewards = await db.all('SELECT * FROM rewards ORDER BY id ASC');
  res.json({ rewards });
});

adminRouter.post('/rewards', async (req, res) => {
  const { name, points_required, stock } = req.body;
  if (!name || points_required === undefined || stock === undefined) {
    return res.status(400).json({ message: 'name, points_required, and stock are required.' });
  }

  const db = await initDatabase();
  const result = await db.run('INSERT INTO rewards (name, points_required, stock) VALUES (?, ?, ?)', [
    name,
    points_required,
    stock,
  ]);

  const reward = await db.get('SELECT * FROM rewards WHERE id = ?', [result.lastID]);
  return res.status(201).json({ reward });
});

adminRouter.get('/progress', async (_req, res) => {
  const db = await initDatabase();
  const progressByUser = await db.all(`
    SELECT u.id AS user_id, u.name, u.email, u.points, u.streak_days,
           COUNT(pe.id) AS events_count,
           COALESCE(SUM(pe.points_delta), 0) AS total_points_from_events
    FROM users u
    LEFT JOIN progress_events pe ON pe.user_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.points DESC
  `);

  res.json({ progressByUser });
});

adminRouter.post('/progress/event', async (req, res) => {
  const { user_id, event_type, points_delta = 0, metadata = null } = req.body;
  if (!user_id || !event_type) {
    return res.status(400).json({ message: 'user_id and event_type are required.' });
  }

  const db = await initDatabase();
  const user = await db.get('SELECT id, points FROM users WHERE id = ?', [user_id]);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const result = await db.run(
    'INSERT INTO progress_events (user_id, event_type, points_delta, metadata) VALUES (?, ?, ?, ?)',
    [user_id, event_type, points_delta, metadata ? JSON.stringify(metadata) : null],
  );

  await db.run('UPDATE users SET points = points + ? WHERE id = ?', [points_delta, user_id]);
  const event = await db.get('SELECT * FROM progress_events WHERE id = ?', [result.lastID]);

  return res.status(201).json({ event });
});

export default adminRouter;
