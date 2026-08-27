import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Submit attendance (registered user or guest)
router.post('/', (req, res) => {
  try {
    const {
      sheet_id, name, email, signature, dates_attended, user_id,
      department, organization, phone, gender, pwd, age_bracket
    } = req.body;

    if (!sheet_id || !name || !email || !signature || !dates_attended) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();

    const sheet = db.prepare('SELECT status FROM sheets WHERE id = ?').get(sheet_id);
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    if (sheet.status === 'finalized') {
      return res.status(403).json({ error: 'This sheet has been finalized and no longer accepts signatures' });
    }

    const id = uuidv4();
    const is_guest = user_id ? 0 : 1;

    const stmt = db.prepare(`
      INSERT INTO attendances (
        id, sheet_id, user_id, name, email, signature, dates_attended, is_guest,
        department, organization, phone, gender, pwd, age_bracket
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, sheet_id, user_id || null, name, email, signature, JSON.stringify(dates_attended), is_guest,
      department || null, organization || null, phone || null, gender || null, pwd ? 1 : 0, age_bracket || null
    );

    res.json({ id, message: 'Attendance submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit attendance (user during window or admin)
router.patch('/:id', (req, res) => {
  try {
    const { dates_attended } = req.body;

    if (!dates_attended) {
      return res.status(400).json({ error: 'Missing dates_attended' });
    }

    const db = getDB();

    const stmt = db.prepare(`
      UPDATE attendances
      SET dates_attended = ?, edited_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(dates_attended), req.params.id);

    res.json({ message: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin verify guest
router.patch('/:id/verify', authMiddleware, (req, res) => {
  try {
    const { verified } = req.body; // true to approve, false to reject

    const db = getDB();
    const attendance = db.prepare('SELECT * FROM attendances WHERE id = ?').get(req.params.id);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    const stmt = db.prepare(`
      UPDATE attendances
      SET verified_by_admin = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(verified ? 1 : 0, req.params.id);

    // Log edit
    const editId = uuidv4();
    const editStmt = db.prepare(`
      INSERT INTO edits (id, attendance_id, admin_id, field_changed, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    editStmt.run(editId, req.params.id, req.userId, 'verified_by_admin', attendance.verified_by_admin, verified ? 1 : 0);

    res.json({ message: 'Attendance verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin add attendee manually
router.post('/admin/add', authMiddleware, (req, res) => {
  try {
    const {
      sheet_id, name, email, signature, dates_attended,
      department, organization, phone, gender, pwd, age_bracket
    } = req.body;

    if (!sheet_id || !name || !email || !signature || !dates_attended) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO attendances (
        id, sheet_id, user_id, name, email, signature, dates_attended, is_guest, verified_by_admin,
        department, organization, phone, gender, pwd, age_bracket
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, sheet_id, null, name, email, signature, JSON.stringify(dates_attended),
      department || null, organization || null, phone || null, gender || null, pwd ? 1 : 0, age_bracket || null
    );

    res.json({ id, message: 'Attendee added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete attendance (user before finalization)
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();

    const stmt = db.prepare('DELETE FROM attendances WHERE id = ?');
    stmt.run(req.params.id);

    res.json({ message: 'Attendance deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
