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
// Requires Idempotency-Key header to prevent double-spend on retries.
// All checks (stock, balance) run inside a transaction with FOR UPDATE locks.
router.post('/redeem', async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency-Key header is required' });
    }

    const { rewardId, userId } = z.object({ rewardId: z.string(), userId: z.string() }).parse(req.body);
    if (req.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Return the previous result without double-charging if key already used
    const { rows: [existing] } = await pool.query(
      `SELECT rr.*, r.title, r.description, r."pointsCost", r.category
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr."rewardId"
       WHERE rr."idempotencyKey" = $1`,
      [idempotencyKey]
    );
    if (existing) {
      const { idempotencyKey: _k, ...redemption } = existing;
      const { rows: [prog] } = await pool.query(
        'SELECT points FROM user_progress WHERE "userId"=$1', [userId]
      );
      return res.status(201).json({ redemption, remainingPoints: prog?.points ?? 0 });
    }

    const client = await pool.connect();
    let redemption, updatedProgress;
    try {
      await client.query('BEGIN');

      // Lock reward row first to prevent concurrent oversell
      const { rows: [reward] } = await client.query(
        'SELECT * FROM rewards WHERE id=$1 FOR UPDATE', [rewardId]
      );
      if (!reward) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Reward not found' }); }
      if (!reward.available) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Reward is no longer available' }); }
      if (reward.stock === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Reward is out of stock' }); }

      // Lock user_progress row to prevent concurrent spend
      const { rows: [progress] } = await client.query(
        'SELECT * FROM user_progress WHERE "userId"=$1 FOR UPDATE', [userId]
      );
      if (!progress || progress.points < reward.pointsCost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points' });
      }

      const { rows: [r] } = await client.query(
        `INSERT INTO reward_redemptions (id, "userId", "rewardId", "pointsSpent", "idempotencyKey")
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [randomUUID(), userId, rewardId, reward.pointsCost, idempotencyKey]
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
