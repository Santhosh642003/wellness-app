import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import path from 'path';
import { z } from 'zod';
import multer from 'multer';
import pool from '../lib/db.js';
import { adminAuth } from '../middleware/adminAuth.js';

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

// POST /api/admin/auth/login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email=$1', [email.toLowerCase()]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) { next(err); }
});

router.use(adminAuth);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [users, points, completions, redemptions, quizzes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COALESCE(SUM(points),0) as total FROM user_progress'),
      pool.query('SELECT COUNT(*) FROM user_module_progress WHERE completed=true'),
      pool.query('SELECT COUNT(*) FROM reward_redemptions'),
      pool.query('SELECT COUNT(*) FROM quiz_attempts WHERE passed=true'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalPointsDistributed: parseInt(points.rows[0].total),
      totalCompletions: parseInt(completions.rows[0].count),
      totalRedemptions: parseInt(redemptions.rows[0].count),
      totalQuizzesPassed: parseInt(quizzes.rows[0].count),
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.initials, u.role, u.campus, u."createdAt",
              COALESCE(p.points,0) as points, COALESCE(p."streakDays",0) as "streakDays", p."lastClaimDate",
              COUNT(ump.id) FILTER (WHERE ump.completed=true) as "modulesCompleted"
       FROM users u
       LEFT JOIN user_progress p ON p."userId"=u.id
       LEFT JOIN user_module_progress ump ON ump."userId"=u.id
       GROUP BY u.id, p.points, p."streakDays", p."lastClaimDate"
       ORDER BY u."createdAt" DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [progress, moduleProgress, quizAttempts, redemptions] = await Promise.all([
      pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [req.params.id]),
      pool.query(`SELECT ump.*, m.title, m.slug FROM user_module_progress ump JOIN modules m ON m.id=ump."moduleId" WHERE ump."userId"=$1 ORDER BY m."orderIndex"`, [req.params.id]),
      pool.query('SELECT * FROM quiz_attempts WHERE "userId"=$1 ORDER BY "createdAt" DESC', [req.params.id]),
      pool.query(`SELECT rr.*, r.title, r."pointsCost" FROM reward_redemptions rr JOIN rewards r ON r.id=rr."rewardId" WHERE rr."userId"=$1 ORDER BY rr."redeemedAt" DESC`, [req.params.id]),
    ]);
    const { password, ...safe } = user;
    res.json({ ...safe, progress: progress.rows[0], moduleProgress: moduleProgress.rows, quizAttempts: quizAttempts.rows, redemptions: redemptions.rows });
  } catch (err) { next(err); }
});

// POST /api/admin/videos/upload
router.post('/videos/upload', uploadVideo.single('video'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/images/upload
router.post('/images/upload', uploadImage.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    next(err);
  }
});

// --- MODULES CRUD ---
router.get('/modules', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM modules ORDER BY "orderIndex"');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/modules', async (req, res, next) => {
  try {
    const d = z.object({ slug: z.string(), title: z.string(), description: z.string(), duration: z.string(), category: z.string(), orderIndex: z.number(), pointsValue: z.number().optional(), locked: z.boolean().optional(), videoUrl: z.string().optional() }).parse(req.body);
    const { rows: [m] } = await pool.query(
      `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked, "videoUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [randomUUID(), d.slug, d.title, d.description, d.duration, d.category, d.orderIndex, d.pointsValue??100, d.locked??true, d.videoUrl??'']
    );
    res.status(201).json(m);
  } catch (err) { next(err); }
});

router.patch('/modules/:id', async (req, res, next) => {
  try {
    const d = z.object({ title: z.string().optional(), description: z.string().optional(), duration: z.string().optional(), category: z.string().optional(), orderIndex: z.number().optional(), pointsValue: z.number().optional(), locked: z.boolean().optional(), videoUrl: z.string().optional() }).parse(req.body);
    const fields = Object.keys(d);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const { rows: [m] } = await pool.query(`UPDATE modules SET ${sets.join(',')} WHERE id=$${fields.length + 1} RETURNING *`, [...Object.values(d), req.params.id]);
    if (!m) return res.status(404).json({ error: 'Module not found' });
    res.json(m);
  } catch (err) { next(err); }
});

router.delete('/modules/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM modules WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- QUIZZES CRUD ---
router.get('/quizzes', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, m.title as "moduleTitle", COUNT(qq.id) as "questionCount"
       FROM quizzes q LEFT JOIN modules m ON m.id=q."moduleId" LEFT JOIN quiz_questions qq ON qq."quizId"=q.id
       GROUP BY q.id, m.title ORDER BY q.type, m.title`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/quizzes', async (req, res, next) => {
  try {
    const d = z.object({ moduleId: z.string().nullable().optional(), type: z.enum(['module','biweekly']), title: z.string(), passingScore: z.number().optional() }).parse(req.body);
    const { rows: [q] } = await pool.query(
      `INSERT INTO quizzes (id, "moduleId", type, title, "passingScore") VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [randomUUID(), d.moduleId||null, d.type, d.title, d.passingScore??70]
    );
    res.status(201).json(q);
  } catch (err) { next(err); }
});

router.patch('/quizzes/:id', async (req, res, next) => {
  try {
    const d = z.object({ title: z.string().optional(), passingScore: z.number().optional() }).parse(req.body);
    const fields = Object.keys(d);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const { rows: [q] } = await pool.query(`UPDATE quizzes SET ${sets.join(',')},"updatedAt"=NOW() WHERE id=$${fields.length+1} RETURNING *`, [...Object.values(d), req.params.id]);
    res.json(q);
  } catch (err) { next(err); }
});

router.delete('/quizzes/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM quizzes WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- QUIZ QUESTIONS CRUD ---
router.get('/quizzes/:quizId/questions', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM quiz_questions WHERE "quizId"=$1 ORDER BY "orderIndex"', [req.params.quizId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/quiz-questions', async (req, res, next) => {
  try {
    const d = z.object({ quizId: z.string(), question: z.string(), options: z.array(z.string()).min(2), answerIndex: z.number(), points: z.number().optional(), explanation: z.string().optional(), orderIndex: z.number().optional() }).parse(req.body);
    const { rows: [q] } = await pool.query(
      `INSERT INTO quiz_questions (id, "quizId", question, options, "answerIndex", points, explanation, "orderIndex") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [randomUUID(), d.quizId, d.question, JSON.stringify(d.options), d.answerIndex, d.points??10, d.explanation||null, d.orderIndex??0]
    );
    res.status(201).json(q);
  } catch (err) { next(err); }
});

router.patch('/quiz-questions/:id', async (req, res, next) => {
  try {
    const d = z.object({ question: z.string().optional(), options: z.array(z.string()).optional(), answerIndex: z.number().optional(), points: z.number().optional(), explanation: z.string().optional(), orderIndex: z.number().optional() }).parse(req.body);
    const sets = [];
    const vals = [];
    let i = 1;
    if (d.question) { sets.push(`question=$${i++}`); vals.push(d.question); }
    if (d.options) { sets.push(`options=$${i++}`); vals.push(JSON.stringify(d.options)); }
    if (d.answerIndex !== undefined) { sets.push(`"answerIndex"=$${i++}`); vals.push(d.answerIndex); }
    if (d.points !== undefined) { sets.push(`points=$${i++}`); vals.push(d.points); }
    if (d.explanation !== undefined) { sets.push(`explanation=$${i++}`); vals.push(d.explanation); }
    if (d.orderIndex !== undefined) { sets.push(`"orderIndex"=$${i++}`); vals.push(d.orderIndex); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows: [q] } = await pool.query(`UPDATE quiz_questions SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals);
    res.json(q);
  } catch (err) { next(err); }
});

router.delete('/quiz-questions/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM quiz_questions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- REWARDS CRUD ---
router.get('/rewards', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rewards ORDER BY "pointsCost"');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/rewards', async (req, res, next) => {
  try {
    const d = z.object({ title: z.string(), description: z.string(), pointsCost: z.number(), category: z.string(), stock: z.number().optional(), available: z.boolean().optional() }).parse(req.body);
    const { rows: [r] } = await pool.query(
      `INSERT INTO rewards (id, title, description, "pointsCost", category, stock, available) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), d.title, d.description, d.pointsCost, d.category, d.stock??-1, d.available??true]
    );
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.patch('/rewards/:id', async (req, res, next) => {
  try {
    const d = z.object({ title: z.string().optional(), description: z.string().optional(), pointsCost: z.number().optional(), category: z.string().optional(), stock: z.number().optional(), available: z.boolean().optional(), imageUrl: z.string().optional() }).parse(req.body);
    const fields = Object.keys(d);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const { rows: [r] } = await pool.query(`UPDATE rewards SET ${sets.join(',')} WHERE id=$${fields.length+1} RETURNING *`, [...Object.values(d), req.params.id]);
    res.json(r);
  } catch (err) { next(err); }
});

router.delete('/rewards/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM rewards WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- REDEMPTIONS ---
router.get('/redemptions', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.*, u.name as "userName", u.email as "userEmail", r.title as "rewardTitle", r.category as "rewardCategory"
       FROM reward_redemptions rr
       JOIN users u ON u.id=rr."userId"
       JOIN rewards r ON r.id=rr."rewardId"
       ORDER BY rr."redeemedAt" DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
