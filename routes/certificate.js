const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCertificate } = require('../middleware/upload');

// Master routes for certificate management
router.use('/manage', authenticateToken, authorize('master'));

// Get all certificates
router.get('/manage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, s.name as student_name, s.student_id
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, certificates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload certificate for a student
router.post('/manage', uploadCertificate.single('certificate'), async (req, res) => {
  try {
    const { student_id, title, issue_date } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'Student is required' });

    const ext = require('path').extname(req.file.originalname).toLowerCase();
    const certType = ext === '.pdf' ? 'pdf' : 'jpg';
    const filePath = '/uploads/certificates/' + req.file.filename;

    await pool.query(
      'INSERT INTO certificates (student_id, certificate_type, file_path, title, issue_date, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, certType, filePath, title || 'Certificate', issue_date || new Date().toISOString().split('T')[0], req.user.id]
    );

    res.status(201).json({ success: true, message: 'Certificate uploaded', filePath });
  } catch (err) {
    console.error('Certificate Upload Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete certificate
router.delete('/manage/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_path FROM certificates WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const fs = require('fs');
      const fp = '.' + rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query('DELETE FROM certificates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
