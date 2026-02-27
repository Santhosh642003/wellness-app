import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const rewardRouter = Router();

rewardRouter.get('/', async (_req, res) => {
  const database = await initDatabase();
  const rewards = await database.all('SELECT * FROM rewards ORDER BY points_required ASC');
  res.json({ rewards });
});

export default rewardRouter;
