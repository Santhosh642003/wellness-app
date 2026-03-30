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
      // Calculate points earned within the period from quiz attempts + module completions
      const interval = period === 'week' ? '7 days' : '30 days';
      ({ rows } = await pool.query(
        `WITH period_points AS (
           -- Points from passed quiz attempts within period
           SELECT "userId", COALESCE(SUM(CASE WHEN passed THEN FLOOR(score * 0.5) ELSE 0 END), 0) AS quiz_pts
           FROM quiz_attempts
           WHERE "createdAt" >= NOW() - INTERVAL '${interval}'
           GROUP BY "userId"
         ),
         module_pts AS (
           -- Points from module completions within period
           SELECT ump."userId",
                  COALESCE(SUM(m."pointsValue"), 0) AS mod_pts
           FROM user_module_progress ump
           JOIN modules m ON m.id = ump."moduleId"
           WHERE ump.completed = true
             AND ump."completedAt" >= NOW() - INTERVAL '${interval}'
           GROUP BY ump."userId"
         )
         SELECT
           u.id,
           u.name,
           u.initials,
           u.campus,
           u.role,
           COALESCE(pp.quiz_pts, 0) + COALESCE(mp.mod_pts, 0) AS points,
           COALESCE(up."streakDays", 0) AS "streakDays",
           RANK() OVER (ORDER BY COALESCE(pp.quiz_pts, 0) + COALESCE(mp.mod_pts, 0) DESC) AS rank
         FROM users u
         LEFT JOIN user_progress up ON up."userId" = u.id
         LEFT JOIN period_points pp ON pp."userId" = u.id
         LEFT JOIN module_pts mp ON mp."userId" = u.id
         WHERE COALESCE(pp.quiz_pts, 0) + COALESCE(mp.mod_pts, 0) > 0
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
