import { Router } from 'express';
import { query } from '../db/database.js';

const progressRouter = Router();

progressRouter.get('/modules/:moduleId', async (req, res) => {
  const userId = Number(req.query.userId || 1);
  const moduleId = Number(req.params.moduleId);

  const row = await query(
    'SELECT * FROM module_progress WHERE user_id = $1 AND module_id = $2',
    [userId, moduleId],
  );

  if (row.rowCount === 0) {
    return res.json({ progress: { user_id: userId, module_id: moduleId, progress_percent: 0, last_position_seconds: 0, completed: false } });
  }

  return res.json({ progress: row.rows[0] });
});

progressRouter.put('/modules/:moduleId', async (req, res) => {
  const userId = Number(req.body.userId || 1);
  const moduleId = Number(req.params.moduleId);
  const progressPercent = Number(req.body.progressPercent || 0);
  const lastPositionSeconds = Number(req.body.lastPositionSeconds || 0);
  const completed = progressPercent >= 99.5;

  const result = await query(
    `INSERT INTO module_progress (user_id, module_id, progress_percent, last_position_seconds, completed)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, module_id)
     DO UPDATE SET progress_percent = EXCLUDED.progress_percent,
                   last_position_seconds = EXCLUDED.last_position_seconds,
                   completed = EXCLUDED.completed,
                   updated_at = NOW()
     RETURNING *`,
    [userId, moduleId, progressPercent, lastPositionSeconds, completed],
  );

  return res.json({ progress: result.rows[0] });
});

export default progressRouter;
