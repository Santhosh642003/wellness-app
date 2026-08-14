/**
 * Quiz submission tests.
 *
 * C1 regression: module quiz can only be PASSED once (replay after a pass → 409)
 * C2 regression: server-side score clamping — client can't inflate points beyond DB total
 * M8 regression: biweekly UNIQUE period constraint — concurrent duplicate submissions → 409
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set env before any app code loads (ESM modules cache on first import)
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://wellness_test:wellness_test@127.0.0.1:5432/wellness_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-secret';
process.env.NODE_ENV = 'test';

import app from '../src/server.js';
import {
  createUser, createModule, createModuleQuiz, createSemester,
  getPoints, testPool,
} from './helpers.js';

function userToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ── module quiz ──────────────────────────────────────────────────────────────
describe('Module quiz submission', () => {
  it('awards correct points on a passing score (happy path)', async () => {
    const { id } = await createUser();
    const mod = await createModule({ pointsValue: 100 });
    const { totalPoints } = await createModuleQuiz(mod.id, 3); // 30 pts total
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );

    const score = totalPoints; // perfect score
    const res = await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ moduleId: mod.id, quizType: 'module', score, totalPoints, answers: [] });

    expect(res.status).toBe(201);
    expect(res.body.passed).toBe(true);
    // quiz_pass points = Math.round(score * 0.5) = 15; module_completion = 100
    expect(res.body.pointsEarned).toBeGreaterThan(0);
  });

  it('does NOT award module_completion points when score is below 70%', async () => {
    const { id } = await createUser();
    const mod = await createModule();
    const { totalPoints } = await createModuleQuiz(mod.id, 3);
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );

    const score = Math.floor(totalPoints * 0.6); // 60% — fail
    const res = await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ moduleId: mod.id, quizType: 'module', score, totalPoints, answers: [] });

    expect(res.status).toBe(201);
    expect(res.body.passed).toBe(false);
    expect(res.body.pointsEarned).toBe(0);
    expect(await getPoints(id)).toBe(0);
  });

  // ── C1 regression ────────────────────────────────────────────────────────
  it('C1 — blocks a second PASS attempt on the same module quiz (→ 409)', async () => {
    const { id } = await createUser();
    const mod = await createModule({ pointsValue: 50 });
    const { totalPoints } = await createModuleQuiz(mod.id, 3);
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );

    const payload = { moduleId: mod.id, quizType: 'module', score: totalPoints, totalPoints, answers: [] };
    const auth = { Authorization: `Bearer ${userToken(id)}` };

    const first = await request(app).post(`/api/users/${id}/quiz`).set(auth).send(payload);
    expect(first.status).toBe(201);
    expect(first.body.passed).toBe(true);

    // Second attempt — must be rejected
    const second = await request(app).post(`/api/users/${id}/quiz`).set(auth).send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already passed/i);
  });

  it('C1 — allows a second ATTEMPT on the same module quiz after a failure', async () => {
    const { id } = await createUser();
    const mod = await createModule();
    const { totalPoints } = await createModuleQuiz(mod.id, 3);
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );
    const auth = { Authorization: `Bearer ${userToken(id)}` };

    // First attempt: fail
    const fail = await request(app).post(`/api/users/${id}/quiz`).set(auth)
      .send({ moduleId: mod.id, quizType: 'module', score: 0, totalPoints, answers: [] });
    expect(fail.status).toBe(201);
    expect(fail.body.passed).toBe(false);

    // Second attempt: pass — should succeed
    const pass = await request(app).post(`/api/users/${id}/quiz`).set(auth)
      .send({ moduleId: mod.id, quizType: 'module', score: totalPoints, totalPoints, answers: [] });
    expect(pass.status).toBe(201);
    expect(pass.body.passed).toBe(true);
  });

  // ── C2 regression ────────────────────────────────────────────────────────
  it('C2 — clamps client-supplied score to DB-validated total (inflation attack blocked)', async () => {
    const { id } = await createUser();
    const mod = await createModule({ pointsValue: 50 });
    const { totalPoints } = await createModuleQuiz(mod.id, 3); // DB says 30 pts
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );

    // Client claims 9999 / 9999 — should be clamped to actual DB total (30)
    const res = await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ moduleId: mod.id, quizType: 'module', score: 9999, totalPoints: 9999, answers: [] });

    expect(res.status).toBe(201);
    expect(res.body.passed).toBe(true);
    // pointsEarned = Math.round(30 * 0.5) = 15, NOT Math.round(9999 * 0.5)
    const { rows: [attempt] } = await testPool.query(
      `SELECT score, "totalPoints" FROM quiz_attempts WHERE "userId"=$1 AND "quizType"='module' ORDER BY "createdAt" DESC LIMIT 1`,
      [id]
    );
    expect(attempt.totalPoints).toBe(30); // clamped to DB value
    expect(attempt.score).toBe(30);       // clamped to DB total
  });

  it('C2 — no quiz in DB: client score used as-is (graceful fallback)', async () => {
    const { id } = await createUser();
    const mod = await createModule({ pointsValue: 50 });
    // No quiz rows created — DB total is 0, fallback allows client score
    await testPool.query(
      `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES (gen_random_uuid(),$1,$2)`,
      [id, mod.id]
    );
    const res = await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ moduleId: mod.id, quizType: 'module', score: 30, totalPoints: 30, answers: [] });
    // Client score/total used as-is when no DB quiz exists
    expect(res.status).toBe(201);
    expect(res.body.passed).toBe(true);
  });
});

// ── biweekly quiz ────────────────────────────────────────────────────────────
describe('Biweekly quiz submission', () => {
  it('awards 200 points on first attempt within open semester', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    const res = await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ quizType: 'biweekly', score: 30, totalPoints: 30, answers: [] });

    expect(res.status).toBe(201);
    expect(res.body.passed).toBe(true);
    expect(res.body.pointsEarned).toBe(200);
  });

  // ── M8 regression ────────────────────────────────────────────────────────
  it('M8 — rejects a second biweekly submission in the same 14-day period (→ 409)', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const auth = { Authorization: `Bearer ${userToken(id)}` };
    const payload = { quizType: 'biweekly', score: 30, totalPoints: 30, answers: [] };

    const first = await request(app).post(`/api/users/${id}/quiz`).set(auth).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/users/${id}/quiz`).set(auth).send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already completed/i);
  });

  it('M8 — period column is stored and matches the expected 14-day bucket', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    await request(app)
      .post(`/api/users/${id}/quiz`)
      .set('Authorization', `Bearer ${userToken(id)}`)
      .send({ quizType: 'biweekly', score: 30, totalPoints: 30, answers: [] });

    const { rows: [attempt] } = await testPool.query(
      `SELECT period FROM quiz_attempts WHERE "userId"=$1 AND "quizType"='biweekly'`,
      [id]
    );
    const expectedBucket = Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000));
    expect(attempt.period).toBe(`biweekly-${expectedBucket}`);
  });

  it('M8 — UNIQUE DB constraint fires on duplicate period insert (race condition coverage)', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const bucket = Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000));
    const period = `biweekly-${bucket}`;

    // Insert first attempt directly
    await testPool.query(
      `INSERT INTO quiz_attempts (id, "userId", "quizType", score, "totalPoints", passed, answers, period)
       VALUES (gen_random_uuid(),$1,'biweekly',30,30,true,'[]',$2)`,
      [id, period]
    );

    // Attempt to insert a second with the same period — must throw 23505
    await expect(
      testPool.query(
        `INSERT INTO quiz_attempts (id, "userId", "quizType", score, "totalPoints", passed, answers, period)
         VALUES (gen_random_uuid(),$1,'biweekly',30,30,true,'[]',$2)`,
        [id, period]
      )
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('different users can each submit in the same biweekly period', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await createSemester('Fall 2025');

    const r1 = await request(app).post(`/api/users/${u1.id}/quiz`)
      .set('Authorization', `Bearer ${userToken(u1.id)}`)
      .send({ quizType: 'biweekly', score: 30, totalPoints: 30, answers: [] });
    const r2 = await request(app).post(`/api/users/${u2.id}/quiz`)
      .set('Authorization', `Bearer ${userToken(u2.id)}`)
      .send({ quizType: 'biweekly', score: 30, totalPoints: 30, answers: [] });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });
});
