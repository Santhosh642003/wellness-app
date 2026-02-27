import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const db = await initDatabase();
  const users = await db.get('SELECT COUNT(*) AS count FROM users');

  res.json({
    status: 'ok',
    service: 'wellness-api',
    database: 'sqlite',
    users: users.count,
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
