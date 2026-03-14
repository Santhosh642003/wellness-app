import { Router } from 'express';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/leaderboard
// Returns top 50 users ranked by total points
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.initials,
         u.campus,
         u.role,
         COALESCE(up.points, 0)       AS points,
         COALESCE(up."streakDays", 0) AS "streakDays",
         RANK() OVER (ORDER BY COALESCE(up.points, 0) DESC) AS rank
       FROM users u
       LEFT JOIN user_progress up ON up."userId" = u.id
       ORDER BY points DESC
       LIMIT 50`
    );

    res.json(rows.map((r) => ({
      ...r,
      rank: Number(r.rank),
      points: Number(r.points),
      streakDays: Number(r.streakDays),
      isCurrentUser: r.id === req.userId,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
