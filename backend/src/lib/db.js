import pg from 'pg';
import { readFileSync } from 'fs';
const { Pool } = pg;

// Auto-enable SSL for known cloud providers; also honour explicit DB_SSL=true/false
const url = process.env.DATABASE_URL || '';
const isCloudDb =
  url.includes('.supabase.co') ||
  url.includes('neon.tech') ||
  url.includes('railway.app') ||
  url.includes('render.com') ||
  url.includes('amazonaws.com');

let sslConfig = false;
if (process.env.DB_SSL === 'true' || isCloudDb) {
  // rejectUnauthorized: false is intentional for Railway's Postgres plugin.
  // Railway does not expose the CA certificate for its internal Postgres service,
  // and all traffic stays on Railway's private network (not the public internet),
  // so the risk of a MITM attack is negligible. If an external Postgres host is
  // used that supplies a CA cert, set DB_SSL_CA=/path/to/ca.pem to enable proper
  // certificate pinning instead of disabling validation. (M3 — accepted risk)
  sslConfig = process.env.DB_SSL_CA
    ? { rejectUnauthorized: true, ca: readFileSync(process.env.DB_SSL_CA) }
    : { rejectUnauthorized: false };
} else if (process.env.DB_SSL === 'false') {
  sslConfig = false;
}

const pool = new Pool({
  connectionString: url,
  ssl: sslConfig,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

export default pool;
