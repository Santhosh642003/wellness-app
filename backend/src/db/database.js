/* global process */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Use a hosted Postgres DB (Neon/Supabase/Railway).');
}

let pool;

async function getPool() {
  if (pool) return pool;

  let Pool;
  try {
    ({ Pool } = await import('pg'));
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        "Missing dependency 'pg'. Run `npm install` in the project root, then restart the backend.",
      );
    }

    throw error;
  }

  const ssl = process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false };
  pool = new Pool({ connectionString, ssl });
  return pool;
}

export async function query(text, params = []) {
  const client = await getPool();
  return client.query(text, params);
}

export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      streak_days INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS modules (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description TEXT NOT NULL,
      video_url TEXT,
      transcript JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      quiz_type TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      points_required INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      reward_points INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS progress_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      points_delta INTEGER NOT NULL DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS module_progress (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      last_position_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, module_id)
    );
  `);
}
