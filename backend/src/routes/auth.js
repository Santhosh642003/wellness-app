import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendOtpEmail } from '../lib/email.js';

const router = Router();

// In-memory login rate limiter: max 10 failed attempts per IP per 15 min
const loginAttempts = new Map(); // ip -> { count, resetAt }
function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 0, resetAt: now + 15 * 60 * 1000 });
    return false; // not rate limited
  }
  return entry.count >= 10;
}
function recordFailedLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (entry) entry.count++;
}
function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Strong password: 8+ chars, uppercase, lowercase, number, special char
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  email: z.string().email().endsWith('@njit.edu', { message: 'Must be an NJIT email address' }),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  major: z.string().max(100).optional(),
  yearOfStudy: z.string().optional(),
  ethnicity: z.string().optional(),
  role: z.string().optional(),
  campus: z.string().optional(),
  otpCode: z.string().length(6, 'Verification code must be 6 digits'),
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

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res, next) => {
  try {
    const { email } = z.object({
      email: z.string().email().endsWith('@njit.edu', { message: 'Must be an NJIT email address' }),
    }).parse(req.body);

    const normalEmail = email.toLowerCase();

    // Check if email already registered
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email=$1', [normalEmail]);
    if (existing[0]) return res.status(409).json({ error: 'An account with this email already exists' });

    // Rate limit: max 3 OTPs per email per 15 minutes
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM email_otps WHERE email=$1 AND "createdAt" > NOW() - INTERVAL '15 minutes'`,
      [normalEmail]
    );
    if (parseInt(recent[0].count) >= 3) {
      return res.status(429).json({ error: 'Too many verification attempts. Please wait 15 minutes.' });
    }

    // Clean up expired or used OTPs for this email to keep the table lean
    await pool.query(
      `DELETE FROM email_otps WHERE email=$1 AND ("expiresAt" < NOW() OR "usedAt" IS NOT NULL)`,
      [normalEmail]
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO email_otps (id, email, code, "expiresAt") VALUES ($1,$2,$3,$4)`,
      [randomUUID(), normalEmail, code, expiresAt]
    );

    const result = await sendOtpEmail(normalEmail, code);

    res.json({
      sent: true,
      // Only return the code in dev mode when SMTP is not configured
      ...(result?.devMode ? { devCode: code, devNote: 'SMTP not configured — code shown for dev only' } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const normalEmail = data.email.toLowerCase();

    // Verify OTP
    const { rows: [otp] } = await pool.query(
      `SELECT * FROM email_otps WHERE email=$1 AND code=$2 AND "expiresAt" > NOW() AND "usedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [normalEmail, data.otpCode]
    );
    if (!otp) return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });

    // Mark OTP as used
    await pool.query(`UPDATE email_otps SET "usedAt"=NOW() WHERE id=$1`, [otp.id]);

    const nameParts = data.name.trim().split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : data.name.slice(0, 2).toUpperCase();

    const hashed = await bcrypt.hash(data.password, 14); // bcrypt cost 14 for strong hashing
    const userId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, email, name, password, initials, role, campus, major, "yearOfStudy", ethnicity, "emailVerified")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
        [userId, normalEmail, data.name.trim(), hashed, initials,
         data.role || 'Student', data.campus || 'NJIT Newark',
         data.major || null, data.yearOfStudy || null, data.ethnicity || null]
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
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (checkLoginRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many failed login attempts. Please wait 15 minutes.' });
    }
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) { recordFailedLogin(ip); return res.status(401).json({ error: 'Invalid email or password' }); }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { recordFailedLogin(ip); return res.status(401).json({ error: 'Invalid email or password' }); }
    clearLoginAttempts(ip);
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
          `INSERT INTO users (id, email, name, password, initials, role, campus, "emailVerified")
           VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
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
