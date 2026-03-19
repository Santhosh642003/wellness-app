import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().endsWith('@njit.edu', { message: 'Must be an NJIT email address' }),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().optional(),
  campus: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const nameParts = data.name.trim().split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : data.name.slice(0, 2).toUpperCase();

    const hashed = await bcrypt.hash(data.password, 12);
    const userId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, email, name, password, initials, role, campus)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, data.email.toLowerCase(), data.name.trim(), hashed, initials,
         data.role || 'Student', data.campus || 'NJIT Newark']
      );
      await client.query(`INSERT INTO user_progress (id, "userId") VALUES ($1,$2)`, [randomUUID(), userId]);
      const { rows: modules } = await client.query('SELECT id FROM modules');
      for (const m of modules) {
        await client.query(
          `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [randomUUID(), userId, m.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [userId]);
    res.status(201).json({ token: signToken(userId), user: { ...safeUser(user), progress } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [user.id]);
    res.json({ token: signToken(user.id), user: { ...safeUser(user), progress } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = z.object({ credential: z.string() }).parse(req.body);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google auth not configured' });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();

    if (!email.endsWith('@njit.edu')) {
      return res.status(403).json({ error: 'Only NJIT email addresses (@njit.edu) are allowed' });
    }

    const { rows: existing } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    let user = existing[0];

    if (!user) {
      const fullName = payload.name || email.split('@')[0];
      const nameParts = fullName.trim().split(' ');
      const initials = nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
      const userId = randomUUID();

      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');
        await dbClient.query(
          `INSERT INTO users (id, email, name, password, initials, role, campus)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [userId, email, fullName.trim(), '', initials, 'Student', 'NJIT Newark']
        );
        await dbClient.query(`INSERT INTO user_progress (id, "userId") VALUES ($1,$2)`, [randomUUID(), userId]);
        const { rows: modules } = await dbClient.query('SELECT id FROM modules');
        for (const m of modules) {
          await dbClient.query(
            `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [randomUUID(), userId, m.id]
          );
        }
        await dbClient.query('COMMIT');
      } catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
      } finally {
        dbClient.release();
      }

      const { rows: [newUser] } = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
      user = newUser;
    }

    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [user.id]);
    res.json({ token: signToken(user.id), user: { ...safeUser(user), progress } });
  } catch (err) {
    if (err.message?.includes('Invalid token')) return res.status(401).json({ error: 'Invalid Google token' });
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [req.userId]);
    res.json({ ...safeUser(rows[0]), progress });
  } catch (err) {
    next(err);
  }
});

export default router;
