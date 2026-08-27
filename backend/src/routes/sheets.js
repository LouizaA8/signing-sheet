import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import { generatePDF } from '../utils/pdf.js';

const router = express.Router();

// List sheets created by the current admin
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();

    const sheets = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM attendances a WHERE a.sheet_id = s.id) as attendee_count,
        (SELECT COUNT(*) FROM attendances a WHERE a.sheet_id = s.id AND a.is_guest = 1 AND a.verified_by_admin IS NULL) as pending_count
      FROM sheets s
      WHERE s.admin_id = ?
      ORDER BY s.created_at DESC
    `).all(req.userId);

    sheets.forEach(s => {
      s.dates = JSON.parse(s.dates);
    });

    res.json(sheets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sheet
router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, location, dates, submission_deadline } = req.body;

    if (!title || !location || !dates || !submission_deadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();

    const titleConflict = db.prepare('SELECT id FROM sheets WHERE LOWER(title) = LOWER(?)').get(title);
    if (titleConflict) {
      return res.status(409).json({ error: 'A signing sheet with this title already exists' });
    }

    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO sheets (id, title, location, dates, admin_id, submission_deadline)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, title, location, JSON.stringify(dates), req.userId, submission_deadline);

    res.json({ id, title, location, dates, shareLink: `/sheets/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List sheets the current user has signed but does not own/administer
router.get('/signed', authMiddleware, (req, res) => {
  try {
    const db = getDB();

    const sheets = db.prepare(`
      SELECT DISTINCT s.*, u.name as owner_name
      FROM sheets s
      JOIN attendances a ON a.sheet_id = s.id
      JOIN users u ON u.id = s.admin_id
      WHERE a.user_id = ? AND s.admin_id != ?
      ORDER BY s.created_at DESC
    `).all(req.userId, req.userId);

    sheets.forEach(s => {
      s.dates = JSON.parse(s.dates);
    });

    res.json(sheets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sheet details
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(req.params.id);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    sheet.dates = JSON.parse(sheet.dates);

    const attendances = db.prepare(`
      SELECT id, name, email, signature, dates_attended, is_guest, verified_by_admin, user_id,
        department, organization, phone, gender, pwd, age_bracket
      FROM attendances
      WHERE sheet_id = ?
      ORDER BY submitted_at DESC
    `).all(req.params.id);

    attendances.forEach(a => {
      a.dates_attended = JSON.parse(a.dates_attended);
    });

    res.json({ sheet, attendances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize sheet
router.patch('/:id/finalize', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const sheet = db.prepare('SELECT admin_id FROM sheets WHERE id = ?').get(req.params.id);

    if (!sheet || sheet.admin_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const stmt = db.prepare(`
      UPDATE sheets
      SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(req.params.id);

    res.json({ message: 'Sheet finalized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export PDF
router.get('/:id/export-pdf', async (req, res) => {
  try {
    const db = getDB();
    const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(req.params.id);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    sheet.dates = JSON.parse(sheet.dates);

    const attendances = db.prepare(`
      SELECT name, email, signature, dates_attended,
        department, organization, phone, gender, pwd, age_bracket
      FROM attendances
      WHERE sheet_id = ?
      ORDER BY submitted_at ASC
    `).all(req.params.id);

    attendances.forEach(a => {
      a.dates_attended = JSON.parse(a.dates_attended);
    });

    const pdfBuffer = await generatePDF(sheet, attendances);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.title}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
