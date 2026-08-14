/**
 * Reward redemption tests.
 *
 * Covers: happy path, insufficient balance, missing Idempotency-Key,
 * idempotent replay (same key → same result, no double-charge),
 * per-student semester cap (2000 pts), no active semester → 400.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://wellness_test:wellness_test@127.0.0.1:5432/wellness_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-secret';
process.env.NODE_ENV = 'test';

import app from '../src/server.js';
import { createUser, createSemester, createReward, getPoints, withTx, testPool } from './helpers.js';
import { awardPoints } from '../src/lib/points.js';

function userToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function auth(userId) {
  return { Authorization: `Bearer ${userToken(userId)}` };
}

async function givePoints(userId, pts) {
  await withTx(c => awardPoints(c, { userId, source: 'joining_bonus', points: pts }));
}

describe('Reward redemption', () => {
  it('returns 400 when Idempotency-Key header is missing', async () => {
    const { id } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 200 });

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .send({ rewardId, userId: id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/idempotency/i);
  });

  it('returns 400 when user has insufficient points', async () => {
    const { id } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 500 });
    await givePoints(id, 100); // not enough

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it('returns 400 when no active semester exists', async () => {
    const { id } = await createUser();
    // No semester created
    const { id: rewardId } = await createReward({ pointsCost: 200 });
    await givePoints(id, 500);

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active semester/i);
  });

  it('deducts points and returns 201 on a successful redemption', async () => {
    const { id } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 300 });
    await givePoints(id, 500);

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });

    expect(res.status).toBe(201);
    expect(res.body.remainingPoints).toBe(200);
    expect(await getPoints(id)).toBe(200);
  });

  it('idempotent replay: same key returns 201 without charging twice', async () => {
    const { id } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 300 });
    await givePoints(id, 1000);

    const key = randomUUID();

    const first = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', key)
      .send({ rewardId, userId: id });
    expect(first.status).toBe(201);
    expect(await getPoints(id)).toBe(700);

    // Same key — must NOT charge again
    const second = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', key)
      .send({ rewardId, userId: id });
    expect(second.status).toBe(201);
    expect(await getPoints(id)).toBe(700); // unchanged
  });

  it('blocks redemption that would exceed the 2000-point per-student semester cap', async () => {
    const { id } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 1000 });
    await givePoints(id, 3000);

    // First redemption: 1000 pts
    await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });

    // Second redemption: 1000 pts more (total 2000 — allowed)
    const second = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });
    expect(second.status).toBe(201);

    // Third redemption: would push to 3000 — must be blocked
    const third = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id))
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id });
    expect(third.status).toBe(400);
    expect(third.body.error).toMatch(/semester redemption cap/i);
  });

  it('returns 403 when token userId does not match request body userId', async () => {
    const { id: id1 } = await createUser();
    const { id: id2 } = await createUser();
    await createSemester();
    const { id: rewardId } = await createReward({ pointsCost: 200 });
    await givePoints(id1, 500);

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(auth(id2)) // token is for id2 but body says id1
      .set('Idempotency-Key', randomUUID())
      .send({ rewardId, userId: id1 });

    expect(res.status).toBe(403);
  });
});
