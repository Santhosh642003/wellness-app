/**
 * One-time backfill: insert a 'legacy_import' row into point_ledger for every
 * user whose spendable balance + total redemptions exceeds what the ledger
 * already accounts for — i.e., any points that were awarded before Batch 2
 * introduced the ledger system.
 *
 * Formula (Option B — true lifetime total):
 *   legacy_points = (user_progress.points + SUM(reward_redemptions.pointsSpent))
 *                 − SUM(point_ledger.points WHERE points > 0)
 *
 * Safe to re-run: skips any user that already has a 'legacy_import' row.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node backend/scripts/backfill-point-ledger.js
 *
 * Dry-run (prints what would be inserted, writes nothing):
 *   DRY_RUN=1 DATABASE_URL=postgresql://... node backend/scripts/backfill-point-ledger.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const DRY_RUN = process.env.DRY_RUN === '1';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const isCloudDb =
  url.includes('.supabase.co') ||
  url.includes('neon.tech') ||
  url.includes('railway.app') ||
  url.includes('render.com') ||
  url.includes('amazonaws.com');

const pool = new Pool({
  connectionString: url,
  ssl: process.env.DB_SSL === 'true' || isCloudDb ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
    console.log('Calculating legacy gaps...\n');

    // Single query: for each user compute
    //   balance           = user_progress.points
    //   totalRedeemed     = SUM(reward_redemptions.pointsSpent)  [0 if none]
    //   ledgerEarned      = SUM(point_ledger.points WHERE > 0)   [0 if none]
    //   hasLegacyRow      = whether a 'legacy_import' row already exists
    //   legacyGap         = balance + totalRedeemed - ledgerEarned
    const { rows } = await client.query(`
      SELECT
        up."userId",
        up.points                                              AS balance,
        COALESCE(rr.total_redeemed, 0)                        AS "totalRedeemed",
        COALESCE(pl.ledger_earned, 0)                         AS "ledgerEarned",
        (li.existing_count > 0)                               AS "hasLegacyRow",
        up.points
          + COALESCE(rr.total_redeemed, 0)
          - COALESCE(pl.ledger_earned, 0)                     AS "legacyGap"
      FROM user_progress up

      LEFT JOIN (
        SELECT "userId", SUM("pointsSpent") AS total_redeemed
        FROM reward_redemptions
        GROUP BY "userId"
      ) rr ON rr."userId" = up."userId"

      LEFT JOIN (
        SELECT "userId", SUM(points) AS ledger_earned
        FROM point_ledger
        WHERE points > 0
        GROUP BY "userId"
      ) pl ON pl."userId" = up."userId"

      LEFT JOIN (
        SELECT "userId", COUNT(*) AS existing_count
        FROM point_ledger
        WHERE source = 'legacy_import'
        GROUP BY "userId"
      ) li ON li."userId" = up."userId"

      ORDER BY up."userId"
    `);

    console.log(`Found ${rows.length} user(s) in user_progress.\n`);

    let inserted = 0;
    let skippedGuard = 0;
    let skippedZero = 0;

    if (!DRY_RUN) {
      await client.query('BEGIN');
    }

    for (const row of rows) {
      const gap = parseInt(row.legacyGap);

      if (row.hasLegacyRow) {
        console.log(`  [SKIP – already has legacy_import] userId=${row.userId}  balance=${row.balance}  redeemed=${row.totalRedeemed}  ledgerEarned=${row.ledgerEarned}`);
        skippedGuard++;
        continue;
      }

      if (gap <= 0) {
        console.log(`  [SKIP – gap=${gap}, fully ledger-backed] userId=${row.userId}  balance=${row.balance}  redeemed=${row.totalRedeemed}  ledgerEarned=${row.ledgerEarned}`);
        skippedZero++;
        continue;
      }

      const lifetimeAfter = parseInt(row.ledgerEarned) + gap;
      console.log(`  [INSERT legacy_import ${gap} pts] userId=${row.userId}  balance=${row.balance}  redeemed=${row.totalRedeemed}  ledgerEarned=${row.ledgerEarned}  → lifetimeEarned after: ${lifetimeAfter}`);

      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO point_ledger (id, "userId", source, points, "refId", "semesterLabel", "createdAt")
           VALUES ($1, $2, 'legacy_import', $3, NULL, NULL, NOW())`,
          [randomUUID(), row.userId, gap]
        );
      }

      inserted++;
    }

    if (!DRY_RUN) {
      await client.query('COMMIT');
    }

    console.log('\n──────────────────────────────────────');
    console.log(`Inserted:          ${inserted} row(s)`);
    console.log(`Skipped (guard):   ${skippedGuard} (already had legacy_import)`);
    console.log(`Skipped (zero):    ${skippedZero} (fully ledger-backed, gap ≤ 0)`);
    if (DRY_RUN) console.log('\nDry run — no rows were written.');

  } catch (err) {
    if (!DRY_RUN) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('\nERROR — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
