import { Router } from 'express';
import { initDatabase } from '../db/database.js';

const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res) => {
  const database = await initDatabase();
  const currentUser = await database.get('SELECT id, name, streak_days, points FROM users WHERE role = ? LIMIT 1', ['student']);
  const modulesCount = await database.get('SELECT COUNT(*) AS count FROM modules');
  const challengesCount = await database.get('SELECT COUNT(*) AS count FROM challenges');
  const upcomingChallenges = await database.all('SELECT * FROM challenges ORDER BY scheduled_for ASC LIMIT 5');

  res.json({
    profile: {
      id: currentUser.id,
      name: currentUser.name,
      streakDays: currentUser.streak_days,
      points: currentUser.points,
      rank: 18,
    },
    metrics: {
      totalModules: modulesCount.count,
      completedModules: 1,
      upcomingChallenges: challengesCount.count,
    },
    upcomingChallenges,
  });
});

dashboardRouter.get('/progress/overview', async (_req, res) => {
  const database = await initDatabase();

  const totals = await database.get(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
      (SELECT COUNT(*) FROM modules) AS total_modules,
      (SELECT COUNT(*) FROM quizzes WHERE is_active = 1) AS active_quizzes,
      (SELECT COUNT(*) FROM progress_events) AS total_progress_events
  `);

  const topStudents = await database.all(
    'SELECT id, name, email, points, streak_days FROM users WHERE role = ? ORDER BY points DESC LIMIT 10',
    ['student'],
  );

  res.json({ totals, topStudents });
});

export default dashboardRouter;
