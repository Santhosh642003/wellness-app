/**
 * Global test setup: runs migrations once, truncates tables between tests.
 * Uses the real test Postgres database — not mocks. This catches real SQL
 * constraint violations, race conditions, and logic bugs that mocks hide.
 */

import pg from 'pg';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { migrate } from '../src/lib/migrate.js';

const { Pool } = pg;

export const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Run migrations once before all tests
beforeAll(async () => {
  await migrate();
}, 60000);

// Truncate all user-data tables between each test for isolation.
// We truncate rather than wrap in transactions so that UNIQUE constraint
// violations (which fire at INSERT time in Postgres) are testable.
beforeEach(async () => {
  await testPool.query(`
    TRUNCATE TABLE
      admin_audit_log,
      event_checkins,
      events,
      referrals,
      bookmarks,
      comments,
      point_ledger,
      quiz_attempts,
      reward_redemptions,
      user_module_progress,
      user_progress,
      reward_pool,
      quizzes,
      quiz_questions,
      modules,
      rewards,
      password_resets,
      email_otps,
      users,
      admin_users
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await testPool.end();
});
