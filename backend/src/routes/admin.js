import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import pool from '../lib/db.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { awardPoints } from '../lib/points.js';
import { uploadFile, deleteFile } from '../lib/storage.js';
import { sendQuizLiveEmail, sendAnnouncementEmail } from '../lib/email.js';
import { fileTypeFromBuffer } from 'file-type';

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Use memory storage — the file buffer is passed to the storage module
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const BLOCKED_EXTENSIONS = new Set(['html', 'htm', 'js', 'mjs', 'cjs', 'ts', 'exe', 'bat', 'sh', 'php', 'py', 'rb', 'pl', 'svg']);

const router = Router();

// POST /api/admin/auth/login
router.post('/auth/login', adminLoginLimiter, async (req, res, next) => {
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
    const [users, points, completions, redemptions, quizzes, modules, newUsers, rewards, topUsers] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COALESCE(SUM(points),0) as total, COALESCE(AVG(points),0) as avg FROM user_progress'),
      pool.query('SELECT COUNT(*) FROM user_module_progress WHERE completed=true'),
      pool.query(`SELECT COUNT(*) as count, COALESCE(SUM("pointsSpent"),0) as pts FROM reward_redemptions`),
      pool.query('SELECT COUNT(*) FILTER (WHERE passed=true) as passed, COUNT(*) as total FROM quiz_attempts'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE locked=false) as unlocked FROM modules'),
      pool.query(`SELECT COUNT(*) FROM users WHERE "createdAt" > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE available=true) as available FROM rewards`),
      pool.query(`SELECT u.name, u.email, u."avatarUrl", COALESCE(p.points,0) as points
                  FROM users u LEFT JOIN user_progress p ON p."userId"=u.id
                  ORDER BY p.points DESC NULLS LAST LIMIT 5`),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalPointsDistributed: parseInt(points.rows[0].total),
      avgPointsPerUser: Math.round(parseFloat(points.rows[0].avg)),
      totalCompletions: parseInt(completions.rows[0].count),
      totalRedemptions: parseInt(redemptions.rows[0].count),
      totalPointsRedeemed: parseInt(redemptions.rows[0].pts),
      totalQuizzesPassed: parseInt(quizzes.rows[0].passed),
      totalQuizAttempts: parseInt(quizzes.rows[0].total),
      quizPassRate: quizzes.rows[0].total > 0 ? Math.round((parseInt(quizzes.rows[0].passed) / parseInt(quizzes.rows[0].total)) * 100) : 0,
      totalModules: parseInt(modules.rows[0].total),
      unlockedModules: parseInt(modules.rows[0].unlocked),
      newUsersThisWeek: parseInt(newUsers.rows[0].count),
      totalRewards: parseInt(rewards.rows[0].total),
      availableRewards: parseInt(rewards.rows[0].available),
      topUsers: topUsers.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.initials, u."avatarUrl", u.role, u.campus, u."createdAt",
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
    const fileType = await fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !fileType.mime.startsWith('video/')) {
      return res.status(400).json({ error: 'File content does not match a valid video format' });
    }
    const url = await uploadFile(req.file.buffer, `file.${fileType.ext}`, fileType.mime);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/images/upload
router.post('/images/upload', uploadImage.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const fileType = await fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !fileType.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'File content does not match a valid image format' });
    }
    const url = await uploadFile(req.file.buffer, `file.${fileType.ext}`, fileType.mime);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/documents/upload
router.post('/documents/upload', uploadDocument.single('document'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const fileType = await fileTypeFromBuffer(req.file.buffer);
    let filename, mime;
    if (fileType) {
      if (!ALLOWED_DOC_MIMES.has(fileType.mime)) {
        return res.status(400).json({ error: 'File type not allowed. Upload PDF or Office documents only.' });
      }
      filename = `file.${fileType.ext}`;
      mime = fileType.mime;
    } else {
      // file-type can't detect (e.g. plain text) — verify extension is not dangerous
      const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';
      if (BLOCKED_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: 'File type not allowed.' });
      }
      filename = req.file.originalname;
      mime = req.file.mimetype;
    }
    const url = await uploadFile(req.file.buffer, filename, mime);
    const sizeKB = req.file.size / 1024;
    const size = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;
    const ext = filename.split('.').pop()?.toLowerCase() || 'file';
    res.json({ url, size, fileType: ext, originalName: req.file.originalname });
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

const videoItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  url: z.string(),
  duration: z.string().optional(),
  transcript: z.array(z.object({ time: z.number(), text: z.string() })).optional(),
});
const documentItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  url: z.string(),
  fileType: z.string().optional(),
  size: z.string().optional(),
});

router.post('/modules', async (req, res, next) => {
  try {
    const d = z.object({
      slug: z.string(), title: z.string(), description: z.string(), duration: z.string(),
      category: z.string(), orderIndex: z.number(), pointsValue: z.number().optional(),
      locked: z.boolean().optional(), videoUrl: z.string().optional(),
      thumbnailUrl: z.string().nullable().optional(),
      keyPoints: z.array(z.string()).optional(),
      transcript: z.array(z.object({ time: z.number(), text: z.string() })).optional(),
      videos: z.array(videoItemSchema).optional(),
      documents: z.array(documentItemSchema).optional(),
    }).parse(req.body);

    // Assign stable IDs to video/doc items that don't have one
    const videos = (d.videos || []).map((v) => ({ ...v, id: v.id || randomUUID() }));
    const documents = (d.documents || []).map((doc) => ({ ...doc, id: doc.id || randomUUID() }));
    // Derive videoUrl from first video for backward-compat
    const videoUrl = d.videoUrl || videos[0]?.url || '';

    const { rows: [m] } = await pool.query(
      `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked, "videoUrl", "thumbnailUrl", "keyPoints", transcript, videos, documents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [randomUUID(), d.slug, d.title, d.description, d.duration, d.category, d.orderIndex,
       d.pointsValue??100, d.locked??true, videoUrl, d.thumbnailUrl||null,
       JSON.stringify(d.keyPoints||[]), JSON.stringify(d.transcript||[]),
       JSON.stringify(videos), JSON.stringify(documents)]
    );
    res.status(201).json(m);
  } catch (err) { next(err); }
});

router.patch('/modules/:id', async (req, res, next) => {
  try {
    const raw = z.object({
      title: z.string().optional(), description: z.string().optional(),
      duration: z.string().optional(), category: z.string().optional(),
      orderIndex: z.number().optional(), pointsValue: z.number().optional(),
      locked: z.boolean().optional(), videoUrl: z.string().optional(),
      thumbnailUrl: z.string().nullable().optional(),
      keyPoints: z.array(z.string()).optional(),
      transcript: z.array(z.object({ time: z.number(), text: z.string() })).optional(),
      videos: z.array(videoItemSchema).optional(),
      documents: z.array(documentItemSchema).optional(),
    }).parse(req.body);

    const d = { ...raw };
    if (d.keyPoints !== undefined) d.keyPoints = JSON.stringify(d.keyPoints);
    if (d.transcript !== undefined) d.transcript = JSON.stringify(d.transcript);
    if (d.videos !== undefined) {
      const videos = d.videos.map((v) => ({ ...v, id: v.id || randomUUID() }));
      d.videos = JSON.stringify(videos);
      // Sync videoUrl to first video for backward-compat
      if (!d.videoUrl && videos.length > 0) d.videoUrl = videos[0].url;
    }
    if (d.documents !== undefined) {
      d.documents = JSON.stringify(d.documents.map((doc) => ({ ...doc, id: doc.id || randomUUID() })));
    }

    const fields = Object.keys(d);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const { rows: [m] } = await pool.query(
      `UPDATE modules SET ${sets.join(',')} WHERE id=$${fields.length + 1} RETURNING *`,
      [...Object.values(d), req.params.id]
    );
    if (!m) return res.status(404).json({ error: 'Module not found' });
    res.json(m);
  } catch (err) { next(err); }
});

router.delete('/modules/:id', async (req, res, next) => {
  try {
    const { rows: [mod] } = await pool.query('SELECT "videoUrl" FROM modules WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM modules WHERE id=$1', [req.params.id]);
    if (mod?.videoUrl) deleteFile(mod.videoUrl).catch(() => {});
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
    const d = z.object({
      title: z.string().optional(),
      passingScore: z.number().optional(),
      scheduledAt: z.string().nullable().optional(),
      sendLiveEmail: z.boolean().optional(), // trigger "quiz live" email blast
    }).parse(req.body);
    const { sendLiveEmail, ...updateData } = d;
    const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
    if (!fields.length && !sendLiveEmail) return res.status(400).json({ error: 'Nothing to update' });

    let q;
    if (fields.length) {
      const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
      const vals = fields.map(k => updateData[k]);
      const { rows: [updated] } = await pool.query(
        `UPDATE quizzes SET ${sets.join(',')},"updatedAt"=NOW() WHERE id=$${fields.length + 1} RETURNING *`,
        [...vals, req.params.id]
      );
      if (!updated) return res.status(404).json({ error: 'Quiz not found' });
      q = updated;
    } else {
      const { rows: [existing] } = await pool.query('SELECT * FROM quizzes WHERE id=$1', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Quiz not found' });
      q = existing;
    }

    // Optionally send "quiz is live" email to all users
    if (sendLiveEmail) {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const quizUrl = q.type === 'biweekly' ? `${appUrl}/quiz/biweekly` : `${appUrl}/quiz/module/${q.moduleId}`;
      pool.query('SELECT email FROM users').then(({ rows: users }) => {
        for (const user of users) {
          sendQuizLiveEmail(user.email, q.title, quizUrl).catch(() => {});
        }
      }).catch(() => {});
    }

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
    const d = z.object({ title: z.string(), description: z.string(), pointsCost: z.number(), category: z.string(), stock: z.number().optional(), available: z.boolean().optional(), imageUrl: z.string().nullable().optional() }).parse(req.body);
    const { rows: [r] } = await pool.query(
      `INSERT INTO rewards (id, title, description, "pointsCost", category, stock, available, "imageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [randomUUID(), d.title, d.description, d.pointsCost, d.category, d.stock??-1, d.available??true, d.imageUrl??null]
    );
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.patch('/rewards/:id', async (req, res, next) => {
  try {
    const d = z.object({ title: z.string().optional(), description: z.string().optional(), pointsCost: z.number().optional(), category: z.string().optional(), stock: z.number().optional(), available: z.boolean().optional(), imageUrl: z.string().nullable().optional() }).parse(req.body);
    const fields = Object.keys(d).filter(k => d[k] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const vals = fields.map(k => d[k]);
    const { rows: [r] } = await pool.query(`UPDATE rewards SET ${sets.join(',')} WHERE id=$${fields.length+1} RETURNING *`, [...vals, req.params.id]);
    if (!r) return res.status(404).json({ error: 'Reward not found' });
    res.json(r);
  } catch (err) { next(err); }
});

router.delete('/rewards/:id', async (req, res, next) => {
  try {
    const { rows: [reward] } = await pool.query('SELECT "imageUrl" FROM rewards WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM rewards WHERE id=$1', [req.params.id]);
    if (reward?.imageUrl) deleteFile(reward.imageUrl).catch(() => {});
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

// --- NOTIFICATIONS (admin CRUD) ---
router.get('/notifications', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM notifications ORDER BY "createdAt" DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/notifications', async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(1),
      body: z.string().default(''),
      imageUrl: z.string().nullable().optional(),
      active: z.boolean().default(true),
      sendEmail: z.boolean().default(false),
    }).parse(req.body);
    const { rows: [n] } = await pool.query(
      `INSERT INTO notifications (id, title, body, "imageUrl", active) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [randomUUID(), d.title, d.body, d.imageUrl || null, d.active]
    );

    // Optionally send announcement email to all users
    if (d.sendEmail && d.active) {
      pool.query('SELECT email FROM users').then(({ rows: users }) => {
        for (const user of users) {
          sendAnnouncementEmail(user.email, d.title, d.body).catch(() => {});
        }
      }).catch(() => {});
    }

    res.status(201).json(n);
  } catch (err) { next(err); }
});

router.patch('/notifications/:id', async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      imageUrl: z.string().nullable().optional(),
      active: z.boolean().optional(),
    }).parse(req.body);
    const fields = Object.keys(d).filter(k => d[k] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    const sets = fields.map((k, i) => `"${k}"=$${i + 1}`);
    const vals = fields.map(k => d[k]);
    const { rows: [n] } = await pool.query(
      `UPDATE notifications SET ${sets.join(',')},"updatedAt"=NOW() WHERE id=$${fields.length + 1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.json(n);
  } catch (err) { next(err); }
});

router.delete('/notifications/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/users/:id/points', async (req, res, next) => {
  try {
    const { delta, reason } = z.object({
      delta: z.number().int(),
      reason: z.string().optional(),
    }).parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_progress (id, "userId", points) VALUES ($1,$2,0) ON CONFLICT ("userId") DO NOTHING`,
        [randomUUID(), req.params.id]
      );
      const { rows: [userCheck] } = await client.query('SELECT id FROM users WHERE id=$1', [req.params.id]);
      if (!userCheck) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      await awardPoints(client, { userId: req.params.id, source: 'admin_adjustment', points: delta, refId: reason || null });
      const { rows: [p] } = await client.query('SELECT points FROM user_progress WHERE "userId"=$1', [req.params.id]);
      await client.query('COMMIT');
      res.json({ points: p.points, delta, reason });
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

// GET /api/admin/stats/analytics — time-series data for charts (last 30 days)
router.get('/stats/analytics', async (req, res, next) => {
  try {
    const [registrations, completions, quizAttempts, dailyClaims] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('day',"createdAt"),'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM users
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day',"createdAt")
        ORDER BY date`),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('day',"completedAt"),'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM user_module_progress
        WHERE completed=true AND "completedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day',"completedAt")
        ORDER BY date`),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('day',"createdAt"),'YYYY-MM-DD') AS date,
               COUNT(*) AS count,
               COUNT(*) FILTER (WHERE passed=true) AS passed
        FROM quiz_attempts
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day',"createdAt")
        ORDER BY date`),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('day',"lastClaimDate"),'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM user_progress
        WHERE "lastClaimDate" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day',"lastClaimDate")
        ORDER BY date`),
    ]);

    res.json({
      registrations: registrations.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      completions: completions.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      quizAttempts: quizAttempts.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count),
        passed: parseInt(r.passed),
      })),
      dailyClaims: dailyClaims.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
    });
  } catch (err) { next(err); }
});

router.post('/users/bulk', async (req, res, next) => {
  try {
    const { userIds, action, points, reason } = z.object({
      userIds: z.array(z.string()).min(1).max(100),
      action: z.enum(['award-points', 'revoke-points']),
      points: z.number().int().positive().optional(),
      reason: z.string().optional(),
    }).parse(req.body);

    if ((action === 'award-points' || action === 'revoke-points') && !points) {
      return res.status(400).json({ error: 'points required for this action' });
    }

    const delta = action === 'award-points' ? points : -points;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const placeholders = userIds.map((_, i) => `$${i + 2}`).join(',');
      await client.query(
        `UPDATE user_progress SET points = GREATEST(0, points + $1), "updatedAt" = NOW() WHERE "userId" IN (${placeholders})`,
        [delta, ...userIds]
      );

      if (userIds.length > 0) {
        const ledgerValues = userIds.map((_, i) => {
          const b = i * 4;
          return `($${b + 1}, $${b + 2}, 'admin_adjustment', $${b + 3}, $${b + 4}, NULL)`;
        }).join(',');
        const ledgerParams = userIds.flatMap((uid) => [randomUUID(), uid, delta, reason || null]);
        await client.query(
          `INSERT INTO point_ledger (id, "userId", source, points, "refId", "semesterLabel") VALUES ${ledgerValues}`,
          ledgerParams
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, affected: userIds.length, action, delta });
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

// --- REWARD POOL ---
router.get('/reward-pool', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM reward_pool ORDER BY "createdAt" DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/reward-pool', async (req, res, next) => {
  try {
    const { semesterLabel, budgetCents } = z.object({
      semesterLabel: z.string().min(1),
      budgetCents: z.number().int().positive(),
    }).parse(req.body);

    const { rows: [existing] } = await pool.query(
      `SELECT "semesterLabel" FROM reward_pool WHERE "closedAt" IS NULL LIMIT 1`
    );
    if (existing) {
      return res.status(409).json({
        error: `Semester "${existing.semesterLabel}" is still open. Close it before opening a new one.`,
      });
    }

    const { rows: [rp] } = await pool.query(
      `INSERT INTO reward_pool (id, "semesterLabel", "budgetCents") VALUES ($1,$2,$3) RETURNING *`,
      [randomUUID(), semesterLabel, budgetCents]
    );
    res.status(201).json(rp);
  } catch (err) { next(err); }
});

router.patch('/reward-pool/:id', async (req, res, next) => {
  try {
    const d = z.object({
      budgetCents: z.number().int().positive().optional(),
      close: z.boolean().optional(),
    }).parse(req.body);

    const sets = [];
    const vals = [];
    let i = 1;
    if (d.budgetCents !== undefined) { sets.push(`"budgetCents"=$${i++}`); vals.push(d.budgetCents); }
    if (d.close) { sets.push(`"closedAt"=$${i++}`); vals.push(new Date()); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows: [rp] } = await pool.query(
      `UPDATE reward_pool SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rp) return res.status(404).json({ error: 'Pool not found' });
    res.json(rp);
  } catch (err) { next(err); }
});

// --- EVENTS CRUD ---
router.get('/events', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM events ORDER BY "startsAt" DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/events', async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      checkInCode: z.string().min(1),
      startsAt: z.string(),
      endsAt: z.string(),
    }).parse(req.body);
    const { rows: [ev] } = await pool.query(
      `INSERT INTO events (id, title, description, "checkInCode", "startsAt", "endsAt") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), d.title, d.description || null, d.checkInCode, new Date(d.startsAt), new Date(d.endsAt)]
    );
    res.status(201).json(ev);
  } catch (err) { next(err); }
});

router.patch('/events/:id', async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      checkInCode: z.string().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }).parse(req.body);

    const sets = [];
    const vals = [];
    let i = 1;
    if (d.title !== undefined) { sets.push(`title=$${i++}`); vals.push(d.title); }
    if (d.description !== undefined) { sets.push(`description=$${i++}`); vals.push(d.description); }
    if (d.checkInCode !== undefined) { sets.push(`"checkInCode"=$${i++}`); vals.push(d.checkInCode); }
    if (d.startsAt !== undefined) { sets.push(`"startsAt"=$${i++}`); vals.push(new Date(d.startsAt)); }
    if (d.endsAt !== undefined) { sets.push(`"endsAt"=$${i++}`); vals.push(new Date(d.endsAt)); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows: [ev] } = await pool.query(
      `UPDATE events SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    res.json(ev);
  } catch (err) { next(err); }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM events WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/admin/events/:id/rotate-code — regenerate the check-in code
router.post('/events/:id/rotate-code', async (req, res, next) => {
  try {
    const newCode = Math.random().toString(36).toUpperCase().slice(2, 8);
    const { rows: [ev] } = await pool.query(
      `UPDATE events SET "checkInCode"=$1 WHERE id=$2 RETURNING *`,
      [newCode, req.params.id]
    );
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    res.json(ev);
  } catch (err) { next(err); }
});

router.get('/events/:id/checkins', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ec.*, u.name, u.email FROM event_checkins ec JOIN users u ON u.id=ec."userId" WHERE ec."eventId"=$1 ORDER BY ec."checkedInAt"`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
