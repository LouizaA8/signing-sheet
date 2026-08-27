import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      email, name, signature, password,
      department, organization, phone, gender, pwd, age_bracket
    } = req.body;

    if (!email || !name || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    const id = uuidv4();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, name, signature, password_hash,
        department, organization, phone, gender, pwd, age_bracket
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, email, name, signature, passwordHash,
      department || null, organization || null, phone || null, gender || null, pwd ? 1 : 0, age_bracket || null
    );

    const token = generateToken(id);
    res.json({ token, user: { id, email, name } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (password && user.password_hash) {
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare(`
      SELECT id, email, name, signature, department, organization, phone, gender, pwd, age_bracket
      FROM users WHERE id = ?
    `).get(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user's profile
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const {
      name, signature, password,
      department, organization, phone, gender, pwd, age_bracket
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT signature, password_hash FROM users WHERE id = ?').get(req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : existing.password_hash;

    db.prepare(`
      UPDATE users
      SET name = ?, signature = ?, password_hash = ?,
        department = ?, organization = ?, phone = ?, gender = ?, pwd = ?, age_bracket = ?
      WHERE id = ?
    `).run(
      name, signature || existing.signature, passwordHash,
      department || null, organization || null, phone || null, gender || null, pwd ? 1 : 0, age_bracket || null,
      req.userId
    );

    const user = db.prepare(`
      SELECT id, email, name, signature, department, organization, phone, gender, pwd, age_bracket
      FROM users WHERE id = ?
    `).get(req.userId);

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout (frontend clears token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

export default router;
