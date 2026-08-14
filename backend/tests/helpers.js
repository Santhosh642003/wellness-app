import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { testPool } from './setup.js';

export { testPool };

/** Create a user row directly in the DB, return { id, email, ... } */
export async function createUser(overrides = {}) {
  const id = randomUUID();
  const email = overrides.email ?? `u${id.slice(0, 8)}@njit.edu`;
  const hashed = await bcrypt.hash('Test@1234', 4);
  await testPool.query(
    `INSERT INTO users (id, email, name, password, initials, role, campus, "emailVerified")
     VALUES ($1,$2,$3,$4,'TS','Student','Newark',true)`,
    [id, email, overrides.name ?? 'Test Student', hashed]
  );
  await testPool.query(
    `INSERT INTO user_progress (id, "userId") VALUES ($1,$2)`,
    [randomUUID(), id]
  );
  return { id, email };
}

/** Create a module row directly in the DB, return the row */
export async function createModule(overrides = {}) {
  const id = randomUUID();
  const slug = overrides.slug ?? `mod-${id.slice(0, 8)}`;
  await testPool.query(
    `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked, "videoUrl", "keyPoints", transcript, videos, documents)
     VALUES ($1,$2,$3,'Test description','10','Test',0,$4,false,'','[]','[]','[]','[]')`,
    [id, slug, overrides.title ?? 'Test Module', overrides.pointsValue ?? 100]
  );
  return { id, slug };
}

/** Create a quiz with N questions (10 pts each), return { quizId, totalPoints } */
export async function createModuleQuiz(moduleId, numQuestions = 3) {
  const quizId = randomUUID();
  await testPool.query(
    `INSERT INTO quizzes (id, "moduleId", type, title, "passingScore") VALUES ($1,$2,'module','Test Quiz',70)`,
    [quizId, moduleId]
  );
  for (let i = 0; i < numQuestions; i++) {
    await testPool.query(
      `INSERT INTO quiz_questions (id, "quizId", question, options, "answerIndex", points, "orderIndex")
       VALUES ($1,$2,'Q?','["a","b"]',0,10,$3)`,
      [randomUUID(), quizId, i]
    );
  }
  return { quizId, totalPoints: numQuestions * 10 };
}

/** Create an open reward_pool semester, return the row */
export async function createSemester(label = 'Fall 2025') {
  const id = randomUUID();
  await testPool.query(
    `INSERT INTO reward_pool (id, "semesterLabel", "budgetCents") VALUES ($1,$2,1000000)`,
    [id, label]
  );
  return { id, semesterLabel: label };
}

/** Create a reward, return the row */
export async function createReward(overrides = {}) {
  const id = randomUUID();
  await testPool.query(
    `INSERT INTO rewards (id, title, description, "pointsCost", category, stock, available)
     VALUES ($1,$2,'desc',$3,'Test',-1,true)`,
    [id, overrides.title ?? 'Test Reward', overrides.pointsCost ?? 100]
  );
  return { id };
}

/** Create an event, return { id, checkInCode } */
export async function createEvent(overrides = {}) {
  const id = randomUUID();
  const checkInCode = `EVT${id.slice(0, 6).toUpperCase()}`;
  const startsAt = new Date(Date.now() - 3600_000);
  const endsAt = new Date(Date.now() + 3600_000);
  await testPool.query(
    `INSERT INTO events (id, title, description, "checkInCode", "startsAt", "endsAt")
     VALUES ($1,$2,'desc',$3,$4,$5)`,
    [id, overrides.title ?? 'Test Event', checkInCode, startsAt, endsAt]
  );
  return { id, checkInCode };
}

/** Get current point balance for a user */
export async function getPoints(userId) {
  const { rows: [r] } = await testPool.query(
    `SELECT points FROM user_progress WHERE "userId"=$1`,
    [userId]
  );
  return r?.points ?? 0;
}

/** Get point ledger entries for a user+source */
export async function getLedger(userId, source) {
  const { rows } = await testPool.query(
    `SELECT * FROM point_ledger WHERE "userId"=$1 AND source=$2 ORDER BY "createdAt"`,
    [userId, source]
  );
  return rows;
}

/** Run a function inside a real DB transaction (commit on success, rollback on error) */
export async function withTx(fn) {
  const client = await testPool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
