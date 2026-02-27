/* global process */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import {
  seedChallenges,
  seedModules,
  seedQuizzes,
  seedRewards,
  seedUsers,
} from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../data/wellness.sqlite');

let db;

async function runSchema(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      streak_days INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      quiz_type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      points_required INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      reward_points INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      points_delta INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

async function seedTableIfEmpty(database, tableName, rows, insertSql, mapRow = (row) => row) {
  const row = await database.get(`SELECT COUNT(*) AS count FROM ${tableName}`);
  if (row.count > 0) return;

  for (const item of rows) {
    const values = mapRow(item);
    await database.run(insertSql, values);
  }
}

async function seedData(database) {
  await seedTableIfEmpty(
    database,
    'users',
    seedUsers,
    'INSERT INTO users (name, email, password, role, streak_days, points) VALUES (?, ?, ?, ?, ?, ?)',
    (row) => [row.name, row.email, row.password, row.role, row.streak_days, row.points],
  );

  await seedTableIfEmpty(
    database,
    'modules',
    seedModules,
    'INSERT INTO modules (title, category, duration_minutes, description) VALUES (?, ?, ?, ?)',
    (row) => [row.title, row.category, row.duration_minutes, row.description],
  );

  await seedTableIfEmpty(
    database,
    'quizzes',
    seedQuizzes,
    'INSERT INTO quizzes (title, quiz_type, is_active) VALUES (?, ?, ?)',
    (row) => [row.title, row.quiz_type, row.is_active],
  );

  await seedTableIfEmpty(
    database,
    'rewards',
    seedRewards,
    'INSERT INTO rewards (name, points_required, stock) VALUES (?, ?, ?)',
    (row) => [row.name, row.points_required, row.stock],
  );

  await seedTableIfEmpty(
    database,
    'challenges',
    seedChallenges,
    'INSERT INTO challenges (title, scheduled_for, reward_points) VALUES (?, ?, ?)',
    (row) => [row.title, row.scheduled_for, row.reward_points],
  );
}

export async function initDatabase() {
  if (db) return db;

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await runSchema(db);
  await seedData(db);

  return db;
}
