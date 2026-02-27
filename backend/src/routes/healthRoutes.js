import { Router } from 'express';
import { query } from '../db/database.js';

const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const users = await query('SELECT COUNT(*)::int AS count FROM users');
  res.json({
    status: 'ok',
    service: 'wellness-api',
    database: 'postgres',
    users: users.rows[0].count,
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
