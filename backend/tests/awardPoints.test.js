import { describe, it, expect } from 'vitest';
import { awardPoints } from '../src/lib/points.js';
import {
  createUser, createSemester, getPoints, getLedger, withTx, testPool,
} from './helpers.js';

describe('awardPoints() — core logic', () => {
  it('awards the correct number of points and writes a ledger row', async () => {
    const { id } = await createUser();
    const { awarded } = await withTx(c => awardPoints(c, { userId: id, source: 'joining_bonus', points: 200 }));
    expect(awarded).toBe(200);
    expect(await getPoints(id)).toBe(200);
    const ledger = await getLedger(id, 'joining_bonus');
    expect(ledger).toHaveLength(1);
    expect(ledger[0].points).toBe(200);
  });

  it('awards zero points and writes nothing when toAward resolves to 0', async () => {
    const { id } = await createUser();
    const { awarded } = await withTx(c => awardPoints(c, { userId: id, source: 'daily_login', points: 0 }));
    expect(awarded).toBe(0);
    expect(await getPoints(id)).toBe(0);
    expect(await getLedger(id, 'daily_login')).toHaveLength(0);
  });

  it('lifetime cap: blocks award once cap is reached', async () => {
    const { id } = await createUser();

    // Award up to the cap
    const r1 = await withTx(c =>
      awardPoints(c, { userId: id, source: 'joining_bonus', points: 200, capPoints: 200, capScope: 'lifetime' })
    );
    expect(r1.awarded).toBe(200);
    expect(await getPoints(id)).toBe(200);

    // Second attempt — cap fully consumed
    const r2 = await withTx(c =>
      awardPoints(c, { userId: id, source: 'joining_bonus', points: 200, capPoints: 200, capScope: 'lifetime' })
    );
    expect(r2.awarded).toBe(0);
    expect(await getPoints(id)).toBe(200); // unchanged
  });

  it('lifetime cap: awards partial amount when headroom < points', async () => {
    const { id } = await createUser();
    // 150 of 200 already awarded
    await withTx(c => awardPoints(c, { userId: id, source: 'joining_bonus', points: 150, capPoints: 200, capScope: 'lifetime' }));
    // Only 50 headroom left for 200-point request
    const r = await withTx(c =>
      awardPoints(c, { userId: id, source: 'joining_bonus', points: 200, capPoints: 200, capScope: 'lifetime' })
    );
    expect(r.awarded).toBe(50);
    expect(await getPoints(id)).toBe(200);
  });

  it('semester cap: requires open reward_pool — throws NO_ACTIVE_SEMESTER when none exists', async () => {
    const { id } = await createUser();
    await expect(
      withTx(c => awardPoints(c, { userId: id, source: 'daily_login', points: 10, capPoints: 300, capScope: 'semester' }))
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_SEMESTER' });
  });

  it('semester cap: awards correctly when semester is open', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');
    const r = await withTx(c =>
      awardPoints(c, { userId: id, source: 'daily_login', points: 10, capPoints: 300, capScope: 'semester' })
    );
    expect(r.awarded).toBe(10);
    expect(r.semesterLabel).toBe('Fall 2025');
    expect(await getPoints(id)).toBe(10);
  });

  it('semester cap: blocks once per-semester cap is reached', async () => {
    const { id } = await createUser();
    await createSemester('Fall 2025');

    // Award up to cap (10 pts × 30 = 300)
    for (let i = 0; i < 30; i++) {
      await withTx(c => awardPoints(c, { userId: id, source: 'daily_login', points: 10, capPoints: 300, capScope: 'semester' }));
    }
    expect(await getPoints(id)).toBe(300);

    // Cap now exhausted
    const r = await withTx(c =>
      awardPoints(c, { userId: id, source: 'daily_login', points: 10, capPoints: 300, capScope: 'semester' })
    );
    expect(r.awarded).toBe(0);
    expect(await getPoints(id)).toBe(300);
  });

  it('admin_adjustment: bypasses cap logic, applies GREATEST(0, balance+delta)', async () => {
    const { id } = await createUser();
    // Award 50 normally first
    await withTx(c => awardPoints(c, { userId: id, source: 'joining_bonus', points: 50 }));
    // Admin deduct 200 — clamped to 0
    await withTx(c => awardPoints(c, { userId: id, source: 'admin_adjustment', points: -200 }));
    expect(await getPoints(id)).toBe(0);
    // Admin add 75 with no semester required
    await withTx(c => awardPoints(c, { userId: id, source: 'admin_adjustment', points: 75 }));
    expect(await getPoints(id)).toBe(75);
  });

  it('source field stored exactly in ledger row', async () => {
    const { id } = await createUser();
    await withTx(c => awardPoints(c, { userId: id, source: 'module_completion', points: 100 }));
    const rows = await getLedger(id, 'module_completion');
    expect(rows[0].source).toBe('module_completion');
  });

  it('refId stored in ledger', async () => {
    const { id } = await createUser();
    const refId = 'some-module-id';
    await withTx(c => awardPoints(c, { userId: id, source: 'module_completion', points: 100, refId }));
    const rows = await getLedger(id, 'module_completion');
    expect(rows[0].refId).toBe(refId);
  });
});
