import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/rewards
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM rewards WHERE available=true ORDER BY "pointsCost"`);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/rewards/redeem
router.post('/redeem', async (req, res, next) => {
  try {
    const { rewardId, userId } = z.object({ rewardId: z.string(), userId: z.string() }).parse(req.body);
    if (req.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { rows: [reward] } = await pool.query('SELECT * FROM rewards WHERE id=$1', [rewardId]);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });
    if (!reward.available) return res.status(400).json({ error: 'Reward is no longer available' });
    if (reward.stock === 0) return res.status(400).json({ error: 'Reward is out of stock' });

    const { rows: [progress] } = await pool.query('SELECT * FROM user_progress WHERE "userId"=$1', [userId]);
    if (!progress || progress.points < reward.pointsCost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    const client = await pool.connect();
    let redemption, updatedProgress;
    try {
      await client.query('BEGIN');
      const { rows: [r] } = await client.query(
        `INSERT INTO reward_redemptions (id, "userId", "rewardId", "pointsSpent") VALUES ($1,$2,$3,$4) RETURNING *`,
        [randomUUID(), userId, rewardId, reward.pointsCost]
      );
      redemption = r;
      const { rows: [p] } = await client.query(
        `UPDATE user_progress SET points=points-$1 WHERE "userId"=$2 RETURNING *`,
        [reward.pointsCost, userId]
      );
      updatedProgress = p;
      if (reward.stock > 0) {
        await client.query(`UPDATE rewards SET stock=stock-1 WHERE id=$1`, [rewardId]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({ redemption: { ...redemption, reward }, remainingPoints: updatedProgress.points });
  } catch (err) {
    next(err);
  }
});

// GET /api/rewards/history/:userId
router.get('/history/:userId', async (req, res, next) => {
  try {
    if (req.userId !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query(
      `SELECT rr.*, r.title, r.description, r."pointsCost", r.category
       FROM reward_redemptions rr
       JOIN rewards r ON r.id=rr."rewardId"
       WHERE rr."userId"=$1
       ORDER BY rr."redeemedAt" DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
