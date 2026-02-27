import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const database = await initDatabase();

  const user = await database.get(
    'SELECT id, name, email, role FROM users WHERE email = ? AND password = ?',
    [email, password],
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.json({
    token: `dev-token-${user.id}`,
    user,
  });
});

export default authRouter;
