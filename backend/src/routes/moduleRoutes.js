import { Router } from 'express';
import { query } from '../db/database.js';

const moduleRouter = Router();

moduleRouter.get('/', async (_req, res) => {
  const modules = await query('SELECT * FROM modules ORDER BY id ASC');
  res.json({ modules: modules.rows });
});

moduleRouter.get('/:moduleId', async (req, res) => {
  const module = await query('SELECT * FROM modules WHERE id = $1', [req.params.moduleId]);

  if (module.rowCount === 0) {
    return res.status(404).json({ message: 'Module not found.' });
  }

  return res.json({ module: module.rows[0] });
});

export default moduleRouter;
