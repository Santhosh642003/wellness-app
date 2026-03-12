import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/modules
router.get('/', async (req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        userProgresses: {
          where: { userId: req.userId },
          select: {
            completed: true,
            watchedPercent: true,
            quizPassed: true,
            completedAt: true,
          },
        },
      },
    });

    const result = modules.map((m) => {
      const { userProgresses, ...module } = m;
      return { ...module, userProgress: userProgresses[0] || null };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/:moduleId
router.get('/:moduleId', async (req, res, next) => {
  try {
    const module = await prisma.module.findUniqueOrThrow({
      where: { id: req.params.moduleId },
      include: {
        userProgresses: {
          where: { userId: req.userId },
          select: {
            completed: true,
            watchedPercent: true,
            quizPassed: true,
            completedAt: true,
          },
        },
      },
    });

    const { userProgresses, ...rest } = module;
    res.json({ ...rest, userProgress: userProgresses[0] || null });
  } catch (err) {
    next(err);
  }
});

export default router;
