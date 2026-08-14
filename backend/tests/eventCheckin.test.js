/**
 * Event check-in tests.
 *
 * Covers: happy path, wrong code, duplicate check-in (ON CONFLICT DO NOTHING → 409),
 * event not found, check-in outside time window.
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
import { createUser, createEvent, createSemester, getPoints, testPool } from './helpers.js';

function userToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function auth(userId) {
  return { Authorization: `Bearer ${userToken(userId)}` };
}

describe('Event check-in', () => {
  it('awards 250 points on a valid first check-in', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const { id: eventId, checkInCode } = await createEvent();

    const res = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: checkInCode });

    expect(res.status).toBe(201);
    expect(res.body.checkedIn).toBe(true);
    expect(res.body.pointsEarned).toBe(250);
    expect(await getPoints(id)).toBe(250);
  });

  it('returns 404 when the event does not exist', async () => {
    const { id } = await createUser();

    const res = await request(app)
      .post(`/api/events/${randomUUID()}/checkin`)
      .set(auth(id))
      .send({ code: 'ANYTHING' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when the check-in code is wrong', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const { id: eventId } = await createEvent();

    const res = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: 'WRONGCODE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect check-in code/i);
  });

  it('rejects a duplicate check-in (→ 409)', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const { id: eventId, checkInCode } = await createEvent();

    const first = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: checkInCode });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: checkInCode });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already checked in/i);

    // Points must not be doubled
    expect(await getPoints(id)).toBe(250);
  });

  it('ON CONFLICT DO NOTHING — DB constraint prevents duplicate directly', async () => {
    const { id } = await createUser();
    const { id: eventId } = await createEvent();

    await testPool.query(
      `INSERT INTO event_checkins (id, "eventId", "userId") VALUES ($1,$2,$3)`,
      [randomUUID(), eventId, id]
    );

    // A second direct insert must fail with unique violation
    await expect(
      testPool.query(
        `INSERT INTO event_checkins (id, "eventId", "userId") VALUES ($1,$2,$3)`,
        [randomUUID(), eventId, id]
      )
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('returns 400 when check-in is attempted before the event starts', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    // Event that starts 2 hours in the future
    const eventId = randomUUID();
    const checkInCode = `FUTURE${eventId.slice(0, 4).toUpperCase()}`;
    const startsAt = new Date(Date.now() + 2 * 3600_000);
    const endsAt = new Date(Date.now() + 4 * 3600_000);
    await testPool.query(
      `INSERT INTO events (id, title, description, "checkInCode", "startsAt", "endsAt")
       VALUES ($1,'Future Event','desc',$2,$3,$4)`,
      [eventId, checkInCode, startsAt, endsAt]
    );

    const res = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: checkInCode });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not currently active/i);
  });

  it('returns 400 when check-in is attempted more than 30 min after event ends', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    // Event that ended 2 hours ago
    const eventId = randomUUID();
    const checkInCode = `PAST${eventId.slice(0, 5).toUpperCase()}`;
    const startsAt = new Date(Date.now() - 4 * 3600_000);
    const endsAt = new Date(Date.now() - 2 * 3600_000);
    await testPool.query(
      `INSERT INTO events (id, title, description, "checkInCode", "startsAt", "endsAt")
       VALUES ($1,'Past Event','desc',$2,$3,$4)`,
      [eventId, checkInCode, startsAt, endsAt]
    );

    const res = await request(app)
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(id))
      .send({ code: checkInCode });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not currently active/i);
  });

  it('different users can check in to the same event', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await createSemester('Fall 2025');
    const { id: eventId, checkInCode } = await createEvent();

    const r1 = await request(app).post(`/api/events/${eventId}/checkin`).set(auth(u1.id)).send({ code: checkInCode });
    const r2 = await request(app).post(`/api/events/${eventId}/checkin`).set(auth(u2.id)).send({ code: checkInCode });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(await getPoints(u1.id)).toBe(250);
    expect(await getPoints(u2.id)).toBe(250);
  });
});
