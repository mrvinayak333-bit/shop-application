const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const QRCode = require('qrcode');
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

// =====================================================
// CERTIFICATE: DYNAMIC PRINT DETAILS
// =====================================================
router.get('/print/:id', authenticateToken, async (req, res) => {
  try {
    const certId = req.params.id;
    // Check if certificate exists
    const [[cert]] = await pool.query(
      `SELECT gc.*, s.name as student_name, c.title as course_name 
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       JOIN courses c ON gc.course_id = c.id
       WHERE gc.id = ?`,
      [certId]
    );
    
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    
    // Get active template details
    const [[template]] = await pool.query(
      'SELECT template_file, institute_logo, institute_signature FROM certificate_templates WHERE is_active = 1 LIMIT 1'
    );
    
    // Generate QR Code data URL
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-certificate/${cert.certificate_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);
    
    res.json({
      success: true,
      certificate: cert,
      template: template || null,
      qrCodeDataUrl
    });
  } catch (err) {
    console.error('Print certificate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CERTIFICATE: PUBLIC VERIFICATION
// =====================================================
router.get('/verify/:certNumber', async (req, res) => {
  try {
    const certNumber = req.params.certNumber;
    const [[cert]] = await pool.query(
      `SELECT gc.id, gc.certificate_number, gc.issue_date, gc.status, s.name as student_name, c.title as course_name 
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       JOIN courses c ON gc.course_id = c.id
       WHERE gc.certificate_number = ? AND gc.status = 'approved'`,
      [certNumber]
    );
    
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found or not approved' });
    }
    
    res.json({ success: true, certificate: cert });
  } catch (err) {
    console.error('Verify certificate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
