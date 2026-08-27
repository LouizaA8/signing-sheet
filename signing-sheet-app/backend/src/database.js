import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '../signing-sheet.db');
let db;

export function getDB() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDB() {
  const database = getDB();

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      signature TEXT,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sheets table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      dates TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      submission_deadline DATETIME NOT NULL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finalized_at DATETIME,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

  // Attendances table
  database.exec(`
    CREATE TABLE IF NOT EXISTS attendances (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      signature TEXT NOT NULL,
      dates_attended TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      verified_by_admin INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME,
      verified_at DATETIME,
      FOREIGN KEY (sheet_id) REFERENCES sheets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  migrateColumns(database, 'users', DEMOGRAPHIC_COLUMNS);
  migrateColumns(database, 'attendances', DEMOGRAPHIC_COLUMNS);

  // Edits audit log
  database.exec(`
    CREATE TABLE IF NOT EXISTS edits (
      id TEXT PRIMARY KEY,
      attendance_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      field_changed TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attendance_id) REFERENCES attendances(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

  console.log('Database initialized');
}

// The KSB attendance-sheet fields (department, organization, phone, gender,
// PWD status, age bracket) — captured once on the user profile at
// registration, and per-submission for guests who have no profile.
const DEMOGRAPHIC_COLUMNS = [
  ['department', 'TEXT'],
  ['organization', 'TEXT'],
  ['phone', 'TEXT'],
  ['gender', 'TEXT'],
  ['pwd', 'INTEGER DEFAULT 0'],
  ['age_bracket', 'TEXT']
];

function migrateColumns(database, table, columns) {
  const existing = database.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

  columns.forEach(([name, type]) => {
    if (!existing.includes(name)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  });
}
