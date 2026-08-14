import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID, randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../lib/email.js';
import { awardPoints } from '../lib/points.js';

const router = Router();

// In-memory login rate limiter: max 10 failed attempts per IP per 15 min.
// KNOWN LIMITATION (M1): both this Map and express-rate-limit's default store are
// process-local — state is not shared across multiple instances. Acceptable while
// the app runs as a single Railway replica; if horizontal scaling is added, replace
// with a Redis-backed store (e.g. rate-limit-redis / ioredis).
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

// Purge stale entries every 30 minutes so the Map doesn't grow unbounded under scan traffic
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000).unref();

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
  role: z.string().optional(),
  campus: z.string().optional(),
  otpCode: z.string().length(6, 'Verification code must be 6 digits'),
  referralCode: z.string().max(12).optional(),
});

function generateReferralCode(name) {
  const prefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `${prefix}${suffix}`;
}

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

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email=$1', [normalEmail]);
    if (existing[0]) return res.status(409).json({ error: 'An account with this email already exists' });

    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM email_otps WHERE email=$1 AND "createdAt" > NOW() - INTERVAL '15 minutes'`,
      [normalEmail]
    );
    if (parseInt(recent[0].count) >= 3) {
      return res.status(429).json({ error: 'Too many verification attempts. Please wait 15 minutes.' });
    }

    await pool.query(
      `DELETE FROM email_otps WHERE email=$1 AND ("expiresAt" < NOW() OR "usedAt" IS NOT NULL)`,
      [normalEmail]
    );

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const codeHash = await bcrypt.hash(code, 10);

    await pool.query(
      `INSERT INTO email_otps (id, email, code, "expiresAt") VALUES ($1,$2,$3,$4)`,
      [randomUUID(), normalEmail, codeHash, expiresAt]
    );

    const result = await sendOtpEmail(normalEmail, code);

    res.json({
      sent: true,
      ...(result?.devMode && process.env.ALLOW_DEV_CODES === 'true'
        ? { devCode: code, devNote: 'SMTP not configured — code shown for dev only' }
        : {}),
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

    // Verify OTP — fetch by email only (code is bcrypt-hashed in DB), then compare
    const { rows: [otp] } = await pool.query(
      `SELECT * FROM email_otps WHERE email=$1 AND "expiresAt" > NOW() AND "usedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [normalEmail]
    );
    const otpValid = otp && await bcrypt.compare(data.otpCode, otp.code);
    if (!otpValid) return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });

    // Mark OTP as used
    await pool.query(`UPDATE email_otps SET "usedAt"=NOW() WHERE id=$1`, [otp.id]);

    const nameParts = data.name.trim().split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : data.name.slice(0, 2).toUpperCase();

    const hashed = await bcrypt.hash(data.password, 14); // bcrypt cost 14 for strong hashing
    const userId = randomUUID();

    // Generate unique referral code for this user
    let referralCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      referralCode = generateReferralCode(data.name);
      const { rows: check } = await pool.query('SELECT id FROM users WHERE "referralCode"=$1', [referralCode]);
      if (!check[0]) break;
      if (attempt === 4) return res.status(500).json({ error: 'Could not generate unique referral code, please try again' });
    }

    // Resolve referrer if referralCode provided
    let referrerId = null;
    if (data.referralCode) {
      const { rows: [referrer] } = await pool.query(
        'SELECT id FROM users WHERE "referralCode"=$1', [data.referralCode.toUpperCase()]
      );
      if (referrer) referrerId = referrer.id;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, email, name, password, initials, role, campus, major, "yearOfStudy", "emailVerified", "referralCode")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)`,
        [userId, normalEmail, data.name.trim(), hashed, initials,
         data.role || 'Student', data.campus || 'NJIT Newark',
         data.major || null, data.yearOfStudy || null,
         referralCode]
      );
      await client.query(`INSERT INTO user_progress (id, "userId") VALUES ($1,$2)`, [randomUUID(), userId]);
      const { rows: modules } = await client.query('SELECT id FROM modules');
      for (const m of modules) {
        await client.query(
          `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [randomUUID(), userId, m.id]
        );
      }
      // 200-pt joining bonus — lifetime cap of 200 makes it naturally once-ever
      try {
        await awardPoints(client, { userId, source: 'joining_bonus', points: 200, capPoints: 200, capScope: 'lifetime' });
      } catch (_) { /* lifetime awards don't throw NO_ACTIVE_SEMESTER */ }
      // Create referral record (referrer payout is deferred until invitee completes 3 modules)
      // Invitee gets 25 pts immediately on signup as a welcome bonus
      if (referrerId) {
        await client.query(
          `INSERT INTO referrals (id, "referrerId", "referredId", "pointsAwarded") VALUES ($1,$2,$3,0)`,
          [randomUUID(), referrerId, userId]
        );
        // Invitee welcome bonus — no cap (naturally once-ever via UNIQUE referredId constraint)
        await awardPoints(client, { userId, source: 'referral_referred', points: 25, refId: referrerId });
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

      const googleReferralCode = generateReferralCode(fullName);

      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');
        await dbClient.query(
          `INSERT INTO users (id, email, name, password, initials, role, campus, "emailVerified", "referralCode")
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
          [userId, email, fullName.trim(), '', initials, 'Student', 'NJIT Newark', googleReferralCode]
        );
        await dbClient.query(`INSERT INTO user_progress (id, "userId") VALUES ($1,$2)`, [randomUUID(), userId]);
        const { rows: modules } = await dbClient.query('SELECT id FROM modules');
        for (const m of modules) {
          await dbClient.query(
            `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [randomUUID(), userId, m.id]
          );
        }
        // 200-pt joining bonus for new Google users
        try {
          await awardPoints(dbClient, { userId, source: 'joining_bonus', points: 200, capPoints: 200, capScope: 'lifetime' });
        } catch (_) { /* lifetime awards don't throw NO_ACTIVE_SEMESTER */ }
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

// POST /api/auth/forgot-password
// Accepts any NJIT email; always returns 200 to avoid account enumeration.
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({
      email: z.string().email().endsWith('@njit.edu', { message: 'Must be an NJIT email address' }),
    }).parse(req.body);

    const normalEmail = email.toLowerCase();
    const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [normalEmail]);
    // Always respond 200 — don't reveal whether the email exists
    if (!rows[0]) return res.json({ sent: true });

    // Rate-limit: max 3 reset requests per email per hour
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM password_resets WHERE "userId"=$1 AND "createdAt" > NOW() - INTERVAL '1 hour'`,
      [rows[0].id]
    );
    if (parseInt(recent[0].count) >= 3) return res.json({ sent: true });

    // Expire any previous unused tokens for this user
    await pool.query(
      `UPDATE password_resets SET "usedAt"=NOW() WHERE "userId"=$1 AND "usedAt" IS NULL`,
      [rows[0].id]
    );

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      `INSERT INTO password_resets (id, "userId", token, "expiresAt") VALUES ($1,$2,$3,$4)`,
      [randomUUID(), rows[0].id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const result = await sendPasswordResetEmail(normalEmail, resetUrl);

    res.json({
      sent: true,
      ...(result?.devMode && process.env.ALLOW_DEV_CODES === 'true'
        ? { devUrl: resetUrl, devNote: 'SMTP not configured — URL shown for dev only' }
        : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = z.object({
      token: z.string().uuid(),
      password: passwordSchema,
    }).parse(req.body);

    const { rows: [reset] } = await pool.query(
      `SELECT * FROM password_resets WHERE token=$1 AND "expiresAt" > NOW() AND "usedAt" IS NULL`,
      [token]
    );
    if (!reset) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });

    const hashed = await bcrypt.hash(password, 14);
    await pool.query(`UPDATE users SET password=$1, "updatedAt"=NOW() WHERE id=$2`, [hashed, reset.userId]);
    await pool.query(`UPDATE password_resets SET "usedAt"=NOW() WHERE id=$1`, [reset.id]);

    res.json({ success: true });
  } catch (err) {
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
