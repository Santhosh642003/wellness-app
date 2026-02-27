import { query } from './database.js';

export async function seedData() {
  const usersCount = await query('SELECT COUNT(*)::int AS count FROM users');
  if (usersCount.rows[0].count === 0) {
    await query(
      `INSERT INTO users (name, email, password, role, streak_days, points)
       VALUES
        ('Alex Rivera', 'student@njit.edu', 'demo1234', 'student', 9, 1260),
        ('Campus Admin', 'admin@njit.edu', 'admin1234', 'admin', 0, 0)`
    );
  }

  const modulesCount = await query('SELECT COUNT(*)::int AS count FROM modules');
  if (modulesCount.rows[0].count === 0) {
    await query(
      `INSERT INTO modules (title, category, duration_minutes, description, video_url, transcript)
       VALUES
       ('Stress Management Basics','Mental Wellness',14,'Learn practical techniques for reducing day-to-day stress.','https://cdn.coverr.co/videos/coverr-girl-doing-yoga-1579/1080p.mp4','[{"time":0,"text":"Welcome to stress management basics."},{"time":8,"text":"Let us begin with breathing and posture."}]'::jsonb),
       ('Sleep and Recovery','Physical Wellness',11,'Build healthier sleep habits to improve focus and energy.',NULL,'[]'::jsonb),
       ('Healthy Productivity','Academic Wellness',16,'Balance coursework with mental health using proven routines.',NULL,'[]'::jsonb)`
    );
  }

  const quizzesCount = await query('SELECT COUNT(*)::int AS count FROM quizzes');
  if (quizzesCount.rows[0].count === 0) {
    await query(
      `INSERT INTO quizzes (title, quiz_type, is_active) VALUES
      ('HPV & MenB Awareness', 'biweekly', TRUE),
      ('Sleep Basics Module Quiz', 'module', TRUE)`
    );
  }

  const rewardsCount = await query('SELECT COUNT(*)::int AS count FROM rewards');
  if (rewardsCount.rows[0].count === 0) {
    await query(
      `INSERT INTO rewards (name, points_required, stock) VALUES
      ('Campus Cafe Voucher', 500, 12),
      ('Fitness Center Day Pass', 750, 8),
      ('Bookstore Credit', 1000, 5)`
    );
  }

  const challengesCount = await query('SELECT COUNT(*)::int AS count FROM challenges');
  if (challengesCount.rows[0].count === 0) {
    await query(
      `INSERT INTO challenges (title, scheduled_for, reward_points) VALUES
      ('5-minute breathing break', '2026-03-01T15:00:00Z', 20),
      ('Hydration check-in', '2026-03-02T17:00:00Z', 10)`
    );
  }
}
