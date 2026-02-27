import { Router } from 'express';
import { query } from '../db/database.js';

const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await query(
    'SELECT id, name, email, role FROM users WHERE email = $1 AND password = $2',
    [email, password],
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const user = result.rows[0];
  return res.json({ token: `dev-token-${user.id}`, user });
});

export default authRouter;
