import { Router } from 'express';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/leaderboard?period=all|week|month
// Returns top 50 users ranked by points (all-time or earned within period)
router.get('/', async (req, res, next) => {
  try {
    const period = req.query.period || 'all';

    let rows;

    if (period === 'all') {
      ({ rows } = await pool.query(
        `SELECT
           u.id,
           u.name,
           u.initials,
           u."avatarUrl",
           u.campus,
           u.role,
           COALESCE(up.points, 0)       AS points,
           COALESCE(up."streakDays", 0) AS "streakDays",
           RANK() OVER (ORDER BY COALESCE(up.points, 0) DESC) AS rank
         FROM users u
         LEFT JOIN user_progress up ON up."userId" = u.id
         ORDER BY points DESC
         LIMIT 50`
      ));
    } else {
      const interval = period === 'week' ? '7 days' : '30 days';
      ({ rows } = await pool.query(
        `SELECT
           u.id, u.name, u.initials, u."avatarUrl", u.campus, u.role,
           COALESCE(up."streakDays", 0) AS "streakDays",
           COALESCE(SUM(pl.points), 0) AS points,
           RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC) AS rank
         FROM users u
         LEFT JOIN user_progress up ON up."userId" = u.id
         LEFT JOIN point_ledger pl
           ON pl."userId" = u.id
           AND pl."createdAt" >= NOW() - INTERVAL '${interval}'
         GROUP BY u.id, u.name, u.initials, u."avatarUrl", u.campus, u.role, up."streakDays"
         HAVING COALESCE(SUM(pl.points), 0) > 0
         ORDER BY points DESC
         LIMIT 50`
      ));
    }

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
