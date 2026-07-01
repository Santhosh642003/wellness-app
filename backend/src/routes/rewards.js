import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import dbPool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/rewards
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await dbPool.query(`SELECT * FROM rewards WHERE available=true ORDER BY "pointsCost"`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/rewards/pool-status
router.get('/pool-status', async (req, res, next) => {
  try {
    const { rows: [rp] } = await dbPool.query(
      `SELECT id, "semesterLabel", "budgetCents", "spentCents", "closedAt" FROM reward_pool WHERE "closedAt" IS NULL LIMIT 1`
    );
    if (!rp) return res.json({ isOpen: false });
    res.json({
      isOpen: true,
      semesterLabel: rp.semesterLabel,
      budgetCents: rp.budgetCents,
      spentCents: rp.spentCents,
      remaining: rp.budgetCents - rp.spentCents,
    });
  } catch (err) { next(err); }
});

// POST /api/rewards/redeem
// Requires Idempotency-Key header to prevent double-spend on retries.
// All checks (stock, balance, pool budget, per-student cap) run inside a transaction with FOR UPDATE locks.
router.post('/redeem', async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency-Key header is required' });
    }

    const { rewardId, userId } = z.object({ rewardId: z.string(), userId: z.string() }).parse(req.body);
    if (req.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Return previous result without double-charging if key already used
    const { rows: [existingRedemption] } = await dbPool.query(
      `SELECT rr.*, r.title, r.description, r."pointsCost", r.category
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr."rewardId"
       WHERE rr."idempotencyKey" = $1`,
      [idempotencyKey]
    );
    if (existingRedemption) {
      const { idempotencyKey: _k, ...redemption } = existingRedemption;
      const { rows: [prog] } = await dbPool.query(
        'SELECT points FROM user_progress WHERE "userId"=$1', [userId]
      );
      return res.status(201).json({ redemption, remainingPoints: prog?.points ?? 0 });
    }

    const client = await dbPool.connect();
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

      // Minimum redemption check
      if (reward.pointsCost < 200) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Minimum redemption is 200 points' });
      }

      // Lock user_progress row to prevent concurrent spend
      const { rows: [progress] } = await client.query(
        'SELECT * FROM user_progress WHERE "userId"=$1 FOR UPDATE', [userId]
      );
      if (!progress || progress.points < reward.pointsCost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points' });
      }

      // Lock the active reward_pool
      const { rows: [rp] } = await client.query(
        `SELECT * FROM reward_pool WHERE "closedAt" IS NULL LIMIT 1 FOR UPDATE`
      );
      if (!rp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No active semester — redemptions are currently closed' });
      }

      // Per-student semester redemption cap: 2000 points ($20)
      const { rows: [semSpend] } = await client.query(
        `SELECT COALESCE(SUM("pointsSpent"), 0) AS spent FROM reward_redemptions WHERE "userId"=$1 AND "poolId"=$2`,
        [userId, rp.id]
      );
      const alreadySpent = parseInt(semSpend.spent);
      if (alreadySpent + reward.pointsCost > 2000) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Semester redemption cap reached — you have ${2000 - alreadySpent} of 2000 points remaining this semester`,
        });
      }

      // Atomic budget enforcement: reject if pool would be over budget
      const { rows: [updatedPool] } = await client.query(
        `UPDATE reward_pool SET "spentCents"="spentCents"+$1
         WHERE id=$2 AND "spentCents"+$1 <= "budgetCents"
         RETURNING id, "spentCents", "budgetCents"`,
        [reward.pointsCost, rp.id]
      );
      if (!updatedPool) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Reward pool exhausted for this semester' });
      }

      const { rows: [r] } = await client.query(
        `INSERT INTO reward_redemptions (id, "userId", "rewardId", "pointsSpent", "idempotencyKey", "poolId")
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [randomUUID(), userId, rewardId, reward.pointsCost, idempotencyKey, rp.id]
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

      // Auto-close pool if budget is now fully used
      if (updatedPool.spentCents >= updatedPool.budgetCents) {
        await client.query(`UPDATE reward_pool SET "closedAt"=NOW() WHERE id=$1`, [rp.id]);
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
    const { rows } = await dbPool.query(
      `SELECT rr.*, r.title, r.description, r."pointsCost", r.category
       FROM reward_redemptions rr
       JOIN rewards r ON r.id=rr."rewardId"
       WHERE rr."userId"=$1
       ORDER BY rr."redeemedAt" DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
