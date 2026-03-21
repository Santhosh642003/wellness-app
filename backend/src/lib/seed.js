import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from './db.js';

/**
 * Seed only creates the default admin account on first run.
 * All modules, rewards, and quizzes are managed exclusively via the admin panel.
 */
export async function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@njit.edu').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  const { rows } = await pool.query('SELECT id FROM admin_users WHERE email=$1', [adminEmail]);
  if (rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO admin_users (id, email, password, name) VALUES ($1,$2,$3,'Administrator')`,
      [randomUUID(), adminEmail, hashed]
    );
    console.log(`[seed] Admin account created: ${adminEmail}`);
  }
}
