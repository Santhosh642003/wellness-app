import pg from 'pg';
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
  sslConfig = { rejectUnauthorized: false };
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
