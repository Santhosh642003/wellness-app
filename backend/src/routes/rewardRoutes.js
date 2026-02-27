import { Router } from 'express';
import { query } from '../db/database.js';

const rewardRouter = Router();

rewardRouter.get('/', async (_req, res) => {
  const rewards = await query('SELECT * FROM rewards ORDER BY points_required ASC');
  res.json({ rewards: rewards.rows });
});

export default rewardRouter;
