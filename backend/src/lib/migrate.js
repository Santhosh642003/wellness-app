import pool from './db.js';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Student',
  campus TEXT NOT NULL DEFAULT 'NJIT Newark',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastClaimDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  category TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "pointsValue" INTEGER NOT NULL DEFAULT 100,
  "videoUrl" TEXT NOT NULL DEFAULT '',
  locked BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_module_progress (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "moduleId" TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  "watchedPercent" INTEGER NOT NULL DEFAULT 0,
  "quizPassed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "moduleId")
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "moduleId" TEXT REFERENCES modules(id) ON DELETE SET NULL,
  "quizType" TEXT NOT NULL,
  score INTEGER NOT NULL,
  "totalPoints" INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "pointsCost" INTEGER NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER NOT NULL DEFAULT -1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "rewardId" TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  "pointsSpent" INTEGER NOT NULL,
  "redeemedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  "moduleId" TEXT REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  "quizId" TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  "answerIndex" INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  explanation TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const PROFILE_FIELDS = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "graduationYear" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "yearOfStudy" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ethnicity TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS "keyPoints" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
`;

const OTP_TABLE = `
CREATE TABLE IF NOT EXISTS email_otps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);
`;

const RESET_TABLE = `
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets(token);
`;

const SCHEDULING_AND_NOTIFICATIONS = `
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const COMMUNITY_AND_REFERRALS = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referralCode" TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "moduleId" TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "moduleId")
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "moduleId" TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_module_idx ON comments("moduleId");

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  "referrerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "referredId" TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const MULTI_VIDEO_AND_DOCS = `
ALTER TABLE modules ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_module_progress ADD COLUMN IF NOT EXISTS "videoProgress" JSONB DEFAULT '{}'::jsonb;
`;

const IDEMPOTENCY_AND_LEDGER = `
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS point_ledger (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  points INTEGER NOT NULL,
  "refId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS point_ledger_user_idx ON point_ledger("userId");
CREATE INDEX IF NOT EXISTS point_ledger_created_idx ON point_ledger("createdAt");
`;

const BATCH2_SCHEMA = `
CREATE TABLE IF NOT EXISTS reward_pool (
  id TEXT PRIMARY KEY,
  "semesterLabel" TEXT UNIQUE NOT NULL,
  "budgetCents" INTEGER NOT NULL,
  "spentCents" INTEGER NOT NULL DEFAULT 0,
  "closedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_pool ON reward_pool ((1)) WHERE "closedAt" IS NULL;

ALTER TABLE point_ledger ADD COLUMN IF NOT EXISTS "semesterLabel" TEXT;
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS "poolId" TEXT REFERENCES reward_pool(id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "checkInCode" TEXT NOT NULL,
  "startsAt" TIMESTAMPTZ NOT NULL,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_checkins (
  id TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "checkedInAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("eventId", "userId")
);
CREATE INDEX IF NOT EXISTS event_checkins_user_idx ON event_checkins("userId");

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS "modulesAtPayout" INTEGER;
`;

export async function migrate() {
  try {
    await pool.query(MIGRATION);
    await pool.query(PROFILE_FIELDS);
    await pool.query(OTP_TABLE);
    await pool.query(RESET_TABLE);
    await pool.query(SCHEDULING_AND_NOTIFICATIONS);
    await pool.query(COMMUNITY_AND_REFERRALS);
    await pool.query(MULTI_VIDEO_AND_DOCS);
    await pool.query(IDEMPOTENCY_AND_LEDGER);
    await pool.query(BATCH2_SCHEMA);
    console.log('Database schema ready');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}
