export const seedUsers = [
  { name: 'Alex Rivera', email: 'student@njit.edu', password: 'demo1234', role: 'student', streak_days: 9, points: 1260 },
  { name: 'Campus Admin', email: 'admin@njit.edu', password: 'admin1234', role: 'admin', streak_days: 0, points: 0 },
];

export const seedModules = [
  { title: 'Stress Management Basics', category: 'Mental Wellness', duration_minutes: 14, description: 'Learn practical techniques for reducing day-to-day stress.' },
  { title: 'Sleep and Recovery', category: 'Physical Wellness', duration_minutes: 11, description: 'Build healthier sleep habits to improve focus and energy.' },
  { title: 'Healthy Productivity', category: 'Academic Wellness', duration_minutes: 16, description: 'Balance coursework with mental health using proven routines.' },
];

export const seedRewards = [
  { name: 'Campus Cafe Voucher', points_required: 500, stock: 12 },
  { name: 'Fitness Center Day Pass', points_required: 750, stock: 8 },
  { name: 'Bookstore Credit', points_required: 1000, stock: 5 },
];

export const seedChallenges = [
  { title: '5-minute breathing break', scheduled_for: '2026-03-01T15:00:00Z', reward_points: 20 },
  { title: 'Hydration check-in', scheduled_for: '2026-03-02T17:00:00Z', reward_points: 10 },
];

export const seedQuizzes = [
  { title: 'HPV & MenB Awareness', quiz_type: 'biweekly', is_active: 1 },
  { title: 'Sleep Basics Module Quiz', quiz_type: 'module', is_active: 1 },
];
