import { randomUUID } from 'crypto';

/**
 * Award points inside a caller's transaction (client must be in BEGIN state).
 *
 * capScope='semester': requires an open reward_pool; throws {code:'NO_ACTIVE_SEMESTER',status:503} if none.
 * capScope='lifetime': sums all-time ledger for this source+userId; no semester required.
 * source='admin_adjustment': no cap, no semester required; uses GREATEST(0, points+delta) for user_progress.
 * All other sources with no capPoints: points awarded unconditionally (no semester required).
 *
 * Returns { awarded: number, semesterLabel: string|null }
 * awarded may be less than points if the cap has headroom < points, or 0 if fully capped.
 */
export async function awardPoints(client, { userId, source, points, refId = null, capPoints, capScope }) {
  const isAdmin = source === 'admin_adjustment';
  let semesterLabel = null;

  if (!isAdmin && capScope === 'semester') {
    const { rows: [openPool] } = await client.query(
      `SELECT "semesterLabel" FROM reward_pool WHERE "closedAt" IS NULL LIMIT 1`
    );
    if (!openPool) {
      const err = new Error('No active reward semester — points and redemptions are paused');
      err.code = 'NO_ACTIVE_SEMESTER';
      err.status = 409;
      throw err;
    }
    semesterLabel = openPool.semesterLabel;
  }
  // capScope='lifetime' or no capScope: semesterLabel stays null

  let toAward = points;

  if (capPoints != null && !isAdmin) {
    let earned;
    if (capScope === 'semester') {
      const { rows: [row] } = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS earned FROM point_ledger WHERE "userId"=$1 AND source=$2 AND "semesterLabel"=$3`,
        [userId, source, semesterLabel]
      );
      earned = parseInt(row.earned);
    } else {
      // lifetime
      const { rows: [row] } = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS earned FROM point_ledger WHERE "userId"=$1 AND source=$2`,
        [userId, source]
      );
      earned = parseInt(row.earned);
    }
    const headroom = capPoints - earned;
    if (headroom <= 0) return { awarded: 0, semesterLabel };
    toAward = Math.min(points, headroom);
  }

  if (toAward === 0) return { awarded: 0, semesterLabel };

  await client.query(
    `INSERT INTO point_ledger (id, "userId", source, points, "refId", "semesterLabel") VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), userId, source, toAward, refId, semesterLabel]
  );

  if (isAdmin) {
    await client.query(
      `UPDATE user_progress SET points=GREATEST(0, points+$1), "updatedAt"=NOW() WHERE "userId"=$2`,
      [toAward, userId]
    );
  } else {
    await client.query(
      `UPDATE user_progress SET points=points+$1, "updatedAt"=NOW() WHERE "userId"=$2`,
      [toAward, userId]
    );
  }

  return { awarded: toAward, semesterLabel };
}
