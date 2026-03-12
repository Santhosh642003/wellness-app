import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/rewards
router.get('/', async (req, res, next) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { available: true },
      orderBy: { pointsCost: 'asc' },
    });
    res.json(rewards);
  } catch (err) {
    next(err);
  }
});

// POST /api/rewards/redeem
const redeemSchema = z.object({
  rewardId: z.string(),
  userId: z.string(),
});

router.post('/redeem', async (req, res, next) => {
  try {
    const { rewardId, userId } = redeemSchema.parse(req.body);

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [reward, progress] = await Promise.all([
      prisma.reward.findUniqueOrThrow({ where: { id: rewardId } }),
      prisma.userProgress.findUnique({ where: { userId } }),
    ]);

    if (!reward.available) {
      return res.status(400).json({ error: 'Reward is no longer available' });
    }

    if (reward.stock === 0) {
      return res.status(400).json({ error: 'Reward is out of stock' });
    }

    if (!progress || progress.points < reward.pointsCost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Transaction: deduct points, record redemption, update stock
    const [redemption, updatedProgress] = await prisma.$transaction([
      prisma.rewardRedemption.create({
        data: {
          userId,
          rewardId,
          pointsSpent: reward.pointsCost,
        },
        include: { reward: true },
      }),
      prisma.userProgress.update({
        where: { userId },
        data: { points: { decrement: reward.pointsCost } },
      }),
      ...(reward.stock > 0
        ? [prisma.reward.update({
            where: { id: rewardId },
            data: { stock: { decrement: 1 } },
          })]
        : []),
    ]);

    res.status(201).json({
      redemption,
      remainingPoints: updatedProgress.points,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/rewards/history/:userId
router.get('/history/:userId', async (req, res, next) => {
  try {
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const history = await prisma.rewardRedemption.findMany({
      where: { userId: req.params.userId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
