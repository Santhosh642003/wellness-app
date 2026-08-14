/**
 * Daily claim tests.
 *
 * Covers: one-claim-per-day enforcement, streak increment on consecutive days,
 * streak reset on a gap, points awarded when a semester is open,
 * points still 0 when no semester exists (NO_ACTIVE_SEMESTER swallowed).
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://wellness_test:wellness_test@127.0.0.1:5432/wellness_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-secret';
process.env.NODE_ENV = 'test';

import app from '../src/server.js';
import { createUser, createSemester, getPoints, testPool } from './helpers.js';

function userToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function auth(userId) {
  return { Authorization: `Bearer ${userToken(userId)}` };
}

describe('Daily claim', () => {
  it('awards 10 points on first claim when semester is open', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    const res = await request(app)
      .post(`/api/users/${id}/daily-claim`)
      .set(auth(id));

    expect(res.status).toBe(200);
    expect(res.body.claimed).toBe(true);
    expect(res.body.pointsEarned).toBe(10);
    expect(res.body.streakDays).toBe(1);
    expect(await getPoints(id)).toBe(10);
  });

  it('awards 0 points but still claims when no semester is open (swallows NO_ACTIVE_SEMESTER)', async () => {
    const { id } = await createUser();
    // No semester created

    const res = await request(app)
      .post(`/api/users/${id}/daily-claim`)
      .set(auth(id));

    expect(res.status).toBe(200);
    expect(res.body.claimed).toBe(true);
    expect(res.body.pointsEarned).toBe(0);
    expect(res.body.streakDays).toBe(1);
    expect(await getPoints(id)).toBe(0);
  });

  it('rejects a second claim on the same calendar day (→ 409)', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    const first = await request(app).post(`/api/users/${id}/daily-claim`).set(auth(id));
    expect(first.status).toBe(200);

    const second = await request(app).post(`/api/users/${id}/daily-claim`).set(auth(id));
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already claimed today/i);

    // Points should not double-count
    expect(await getPoints(id)).toBe(10);
  });

  it('increments streak when last claim was yesterday', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    // Seed a lastClaimDate of exactly yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await testPool.query(
      `UPDATE user_progress SET "lastClaimDate"=$1, "streakDays"=5 WHERE "userId"=$2`,
      [yesterday, id]
    );

    const res = await request(app).post(`/api/users/${id}/daily-claim`).set(auth(id));
    expect(res.status).toBe(200);
    expect(res.body.streakDays).toBe(6);
  });

  it('resets streak to 1 when last claim was more than one day ago', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    // Seed a lastClaimDate of 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await testPool.query(
      `UPDATE user_progress SET "lastClaimDate"=$1, "streakDays"=10 WHERE "userId"=$2`,
      [threeDaysAgo, id]
    );

    const res = await request(app).post(`/api/users/${id}/daily-claim`).set(auth(id));
    expect(res.status).toBe(200);
    expect(res.body.streakDays).toBe(1);
  });

  it('returns 403 when token userId does not match route param', async () => {
    const { id: id1 } = await createUser();
    const { id: id2 } = await createUser();

    const res = await request(app)
      .post(`/api/users/${id1}/daily-claim`)
      .set(auth(id2)); // wrong token

    expect(res.status).toBe(403);
  });
});
