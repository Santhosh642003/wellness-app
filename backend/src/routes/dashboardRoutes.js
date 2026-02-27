import { Router } from 'express';
import { query } from '../db/database.js';

const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res) => {
  const currentUser = await query(
    'SELECT id, name, streak_days, points FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1',
    ['student'],
  );
  const modulesCount = await query('SELECT COUNT(*)::int AS count FROM modules');
  const challengesCount = await query('SELECT COUNT(*)::int AS count FROM challenges');
  const upcomingChallenges = await query('SELECT * FROM challenges ORDER BY scheduled_for ASC LIMIT 5');

  const user = currentUser.rows[0];

  res.json({
    profile: {
      id: user?.id,
      name: user?.name,
      streakDays: user?.streak_days ?? 0,
      points: user?.points ?? 0,
      rank: 18,
    },
    metrics: {
      totalModules: modulesCount.rows[0].count,
      completedModules: 1,
      upcomingChallenges: challengesCount.rows[0].count,
    },
    upcomingChallenges: upcomingChallenges.rows,
  });
});

dashboardRouter.get('/progress/overview', async (_req, res) => {
  const totals = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS total_students,
      (SELECT COUNT(*) FROM modules)::int AS total_modules,
      (SELECT COUNT(*) FROM quizzes WHERE is_active = TRUE)::int AS active_quizzes,
      (SELECT COUNT(*) FROM progress_events)::int AS total_progress_events
  `);

  const topStudents = await query(
    'SELECT id, name, email, points, streak_days FROM users WHERE role = $1 ORDER BY points DESC LIMIT 10',
    ['student'],
  );

  res.json({ totals: totals.rows[0], topStudents: topStudents.rows });
});

export default dashboardRouter;
