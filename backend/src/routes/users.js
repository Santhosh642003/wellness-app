import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, requireSelf } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/users/:userId
router.get('/:userId', requireSelf, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.userId },
      include: {
        progress: true,
        moduleProgresses: {
          include: { module: true },
          orderBy: { module: { orderIndex: 'asc' } },
        },
        redemptions: {
          include: { reward: true },
          orderBy: { redeemedAt: 'desc' },
          take: 20,
        },
      },
    });

    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:userId/profile
const profileSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
  campus: z.string().optional(),
});

router.patch('/:userId/profile', requireSelf, async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    const updates = { ...data };

    if (data.name) {
      const parts = data.name.trim().split(' ');
      updates.initials = parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : data.name.slice(0, 2).toUpperCase();
      updates.name = data.name.trim();
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: updates,
    });

    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:userId/daily-claim
router.post('/:userId/daily-claim', requireSelf, async (req, res, next) => {
  try {
    const progress = await prisma.userProgress.findUnique({
      where: { userId: req.params.userId },
    });

    if (!progress) {
      return res.status(404).json({ error: 'User progress not found' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (progress.lastClaimDate) {
      const lastClaim = new Date(progress.lastClaimDate);
      const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      if (lastClaimDay.getTime() === today.getTime()) {
        return res.status(409).json({ error: 'Already claimed today' });
      }

      // Check if streak continues (claimed yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const streakContinues = lastClaimDay.getTime() === yesterday.getTime();

      const dailyPoints = 25;
      const updated = await prisma.userProgress.update({
        where: { userId: req.params.userId },
        data: {
          points: { increment: dailyPoints },
          streakDays: streakContinues ? { increment: 1 } : 1,
          lastClaimDate: now,
        },
      });

      return res.json({
        claimed: true,
        pointsEarned: dailyPoints,
        streakDays: updated.streakDays,
        totalPoints: updated.points,
      });
    }

    // First ever claim
    const updated = await prisma.userProgress.update({
      where: { userId: req.params.userId },
      data: {
        points: { increment: 25 },
        streakDays: 1,
        lastClaimDate: now,
      },
    });

    res.json({
      claimed: true,
      pointsEarned: 25,
      streakDays: updated.streakDays,
      totalPoints: updated.points,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/module-progress
router.get('/:userId/module-progress', requireSelf, async (req, res, next) => {
  try {
    const progresses = await prisma.userModuleProgress.findMany({
      where: { userId: req.params.userId },
      include: { module: true },
      orderBy: { module: { orderIndex: 'asc' } },
    });
    res.json(progresses);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:userId/module-progress/:moduleId
const moduleProgressSchema = z.object({
  watchedPercent: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

router.patch('/:userId/module-progress/:moduleId', requireSelf, async (req, res, next) => {
  try {
    const data = moduleProgressSchema.parse(req.body);

    const module = await prisma.module.findUniqueOrThrow({
      where: { id: req.params.moduleId },
    });

    const updates = { ...data };
    if (data.completed && data.completed === true) {
      updates.completedAt = new Date();
    }

    const progress = await prisma.userModuleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: req.params.userId,
          moduleId: req.params.moduleId,
        },
      },
      update: updates,
      create: {
        userId: req.params.userId,
        moduleId: req.params.moduleId,
        ...updates,
      },
    });

    // Award points if newly completed
    if (data.completed && updates.completedAt) {
      await prisma.userProgress.upsert({
        where: { userId: req.params.userId },
        update: { points: { increment: module.pointsValue } },
        create: { userId: req.params.userId, points: module.pointsValue },
      });
    }

    // Unlock next module when this one completes
    if (data.completed) {
      const nextModule = await prisma.module.findFirst({
        where: { orderIndex: module.orderIndex + 1 },
      });
      if (nextModule) {
        await prisma.module.update({
          where: { id: nextModule.id },
          data: { locked: false },
        });
        await prisma.userModuleProgress.upsert({
          where: {
            userId_moduleId: {
              userId: req.params.userId,
              moduleId: nextModule.id,
            },
          },
          update: {},
          create: { userId: req.params.userId, moduleId: nextModule.id },
        });
      }
    }

    res.json(progress);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:userId/quiz
const quizSchema = z.object({
  moduleId: z.string().optional(),
  quizType: z.enum(['module', 'biweekly']),
  score: z.number().min(0),
  totalPoints: z.number().min(0),
  answers: z.array(z.any()),
});

router.post('/:userId/quiz', requireSelf, async (req, res, next) => {
  try {
    const data = quizSchema.parse(req.body);
    const passed = data.score / data.totalPoints >= 0.7;
    const pointsEarned = passed ? Math.round(data.score * 0.5) : 0;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.params.userId,
        moduleId: data.moduleId || null,
        quizType: data.quizType,
        score: data.score,
        totalPoints: data.totalPoints,
        passed,
        answers: data.answers,
      },
    });

    if (passed && pointsEarned > 0) {
      await prisma.userProgress.upsert({
        where: { userId: req.params.userId },
        update: { points: { increment: pointsEarned } },
        create: { userId: req.params.userId, points: pointsEarned },
      });

      // Mark quiz as passed in module progress
      if (data.moduleId) {
        await prisma.userModuleProgress.upsert({
          where: {
            userId_moduleId: {
              userId: req.params.userId,
              moduleId: data.moduleId,
            },
          },
          update: { quizPassed: true },
          create: {
            userId: req.params.userId,
            moduleId: data.moduleId,
            quizPassed: true,
          },
        });
      }
    }

    res.status(201).json({ ...attempt, pointsEarned });
  } catch (err) {
    next(err);
  }
});

export default router;
