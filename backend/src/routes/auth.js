import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
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

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashed,
        name: data.name.trim(),
        initials,
        role: data.role || 'Student',
        campus: data.campus || 'NJIT Newark',
        progress: {
          create: { points: 0, streakDays: 0 },
        },
      },
      include: { progress: true },
    });

    // Initialize module progress for all modules
    const modules = await prisma.module.findMany({ select: { id: true } });
    if (modules.length > 0) {
      await prisma.userModuleProgress.createMany({
        data: modules.map((m) => ({ userId: user.id, moduleId: m.id })),
        skipDuplicates: true,
      });
    }

    const token = signToken(user.id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { progress: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      include: { progress: true },
    });
    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
