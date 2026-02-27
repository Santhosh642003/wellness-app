import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const moduleRouter = Router();

moduleRouter.get('/', async (_req, res) => {
  const database = await initDatabase();
  const modules = await database.all('SELECT * FROM modules ORDER BY id ASC');
  res.json({ modules });
});

moduleRouter.get('/:moduleId', async (req, res) => {
  const database = await initDatabase();
  const module = await database.get('SELECT * FROM modules WHERE id = ?', [req.params.moduleId]);

  if (!module) {
    return res.status(404).json({ message: 'Module not found.' });
  }

  return res.json({ module });
});

export default moduleRouter;
