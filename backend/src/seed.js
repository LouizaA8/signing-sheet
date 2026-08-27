import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from './database.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@kenyasugarboard.go.ke';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'KenyaSugar2026!';
const ADMIN_NAME = 'KSB Administrator';

// 1x1 transparent PNG — placeholder signature for the seeded admin account
const PLACEHOLDER_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

initDB();
const db = getDB();

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);

if (existing) {
  console.log('Admin account already exists:', ADMIN_EMAIL);
} else {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  db.prepare(`
    INSERT INTO users (
      id, email, name, signature, password_hash,
      department, organization, phone, gender, pwd, age_bracket
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ADMIN_EMAIL, ADMIN_NAME, PLACEHOLDER_SIGNATURE, passwordHash, 'ICT', 'KSB', '0700000000', 'M', 0, '35-59');

  console.log('Admin account created:');
  console.log('  Email:   ', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
}
