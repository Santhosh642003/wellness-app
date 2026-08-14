/**
 * Referral payout tests.
 *
 * The referrer earns 100 pts only after the referred user completes 3 modules —
 * not immediately on sign-up. Each completion is triggered via
 * PATCH /api/users/:userId/module-progress/:moduleId with { completed: true }.
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
import { createUser, createModule, createSemester, getPoints, testPool } from './helpers.js';

function userToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function createReferral(referrerId, referredId) {
  await testPool.query(
    `INSERT INTO referrals (id, "referrerId", "referredId") VALUES ($1,$2,$3)`,
    [randomUUID(), referrerId, referredId]
  );
}

async function completeModule(userId, moduleId) {
  // Ensure the progress row exists first (modules unlock the next on completion —
  // we seed it manually to avoid ordering dependency)
  await testPool.query(
    `INSERT INTO user_module_progress (id, "userId", "moduleId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [randomUUID(), userId, moduleId]
  );
  return request(app)
    .patch(`/api/users/${userId}/module-progress/${moduleId}`)
    .set('Authorization', `Bearer ${userToken(userId)}`)
    .send({ completed: true });
}

describe('Referral payout', () => {
  it('does NOT pay the referrer after only 1 module completion', async () => {
    const referrer = await createUser();
    const referred = await createUser();
    await createSemester('Fall 2025');
    await createReferral(referrer.id, referred.id);

    const mod = await createModule({ pointsValue: 10 });
    await completeModule(referred.id, mod.id);

    expect(await getPoints(referrer.id)).toBe(0);
  });

  it('does NOT pay the referrer after 2 module completions', async () => {
    const referrer = await createUser();
    const referred = await createUser();
    await createSemester('Fall 2025');
    await createReferral(referrer.id, referred.id);

    const mod1 = await createModule({ pointsValue: 10, orderIndex: 0 });
    const mod2 = await createModule({ pointsValue: 10, orderIndex: 1 });

    await completeModule(referred.id, mod1.id);
    await completeModule(referred.id, mod2.id);

    expect(await getPoints(referrer.id)).toBe(0);
  });

  it('pays the referrer 100 pts on the 3rd module completion by the referred user', async () => {
    const referrer = await createUser();
    const referred = await createUser();
    await createSemester('Fall 2025');
    await createReferral(referrer.id, referred.id);

    const mod1 = await createModule({ pointsValue: 10 });
    const mod2 = await createModule({ pointsValue: 10 });
    const mod3 = await createModule({ pointsValue: 10 });

    await completeModule(referred.id, mod1.id);
    await completeModule(referred.id, mod2.id);
    const r3 = await completeModule(referred.id, mod3.id);
    expect(r3.status).toBe(200);

    expect(await getPoints(referrer.id)).toBe(100);
  });

  it('does NOT pay the referrer twice (paidAt is stamped; second pass is skipped)', async () => {
    const referrer = await createUser();
    const referred = await createUser();
    await createSemester('Fall 2025');
    await createReferral(referrer.id, referred.id);

    const mods = [
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
    ];

    // Complete 3 → triggers payout
    for (const mod of mods.slice(0, 3)) await completeModule(referred.id, mod.id);
    expect(await getPoints(referrer.id)).toBe(100);

    // 4th completion should NOT pay again
    await completeModule(referred.id, mods[3].id);
    expect(await getPoints(referrer.id)).toBe(100);
  });

  it('referral payout is skipped (not failed) when no semester exists', async () => {
    const referrer = await createUser();
    const referred = await createUser();
    // No semester — NO_ACTIVE_SEMESTER should be swallowed in checkAndPayReferral
    await createReferral(referrer.id, referred.id);

    const mods = [
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
    ];

    for (const mod of mods) {
      const r = await completeModule(referred.id, mod.id);
      expect(r.status).toBe(200); // request succeeds; payout silently skipped
    }

    expect(await getPoints(referrer.id)).toBe(0); // nothing paid without semester
  });

  it('non-referred user completing 3 modules does not crash the referral check', async () => {
    const user = await createUser();
    await createSemester('Fall 2025');
    // No referral row for this user — checkAndPayReferral should return early

    const mods = [
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
      await createModule({ pointsValue: 10 }),
    ];

    for (const mod of mods) {
      const r = await completeModule(user.id, mod.id);
      expect(r.status).toBe(200);
    }
  });
});
