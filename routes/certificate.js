const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const QRCode = require('qrcode');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCertificate } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Helper to get settings key-value pair as an object
async function getCertificateSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  const settings = {};
  rows.forEach(r => {
    settings[r.setting_key] = r.setting_value;
  });
  return {
    institute_name: settings.institute_name || 'SRM MOBAILE FIXIT',
    institute_tagline: settings.institute_tagline || 'Mobile Repairing & Technical Training Institute',
    institute_address: settings.institute_address || 'Solapur, Maharashtra – 413002',
    founder_name: settings.founder_name || 'VINAYAK SANJAY KUMBHAR',
    founder_designation: settings.founder_designation || 'FOUNDER & TRAINER',
    founder_signature: settings.founder_signature || '/uploads/certificates/founder_signature.png',
    authorized_signatory_name: settings.authorized_signatory_name || 'VINAYAK SANJAY KUMBHAR',
    authorized_signatory_designation: settings.authorized_signatory_designation || 'AUTHORIZED SIGNATORY',
    authorized_signature: settings.authorized_signature || '/uploads/certificates/authorized_signature.png',
    auto_approve: settings.auto_approve_certificates === 'true'
  };
}

// =====================================================
// PUBLIC CERTIFICATE VERIFICATION ROUTE (NO AUTH)
// =====================================================
router.get('/verify/:id', async (req, res) => {
  try {
    const searchCode = (req.params.id || '').trim();
    if (!searchCode) return res.status(400).json({ success: false, message: 'Certificate ID or Verification Code is required' });

    const [[cert]] = await pool.query(
      `SELECT c.*, s.student_id as student_code_val, s.email, s.phone
       FROM certificates c
       LEFT JOIN students s ON c.student_id = s.id
       WHERE c.certificate_id = ? OR c.verification_code = ? OR c.id = ?`,
      [searchCode, searchCode, searchCode]
    );

    if (!cert) {
      return res.json({
        success: false,
        status: 'INVALID',
        message: 'No certificate found matching the provided Verification Code or Certificate ID.'
      });
    }

    if (cert.certificate_status === 'Revoked') {
      return res.json({
        success: true,
        status: 'REVOKED',
        certificate: cert,
        message: 'This certificate has been revoked by SRM MOBAILE FIXIT.'
      });
    }

    res.json({
      success: true,
      status: 'VALID',
      certificate: cert
    });
  } catch (err) {
    console.error('Verify Certificate Error:', err);
    res.status(500).json({ success: false, message: 'Server error during certificate verification' });
  }
});

// =====================================================
// GET GLOBAL CERTIFICATE SETTINGS & SIGNATURES
// =====================================================
router.get('/settings', async (req, res) => {
  try {
    const settings = await getCertificateSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Get Certificate Settings Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load certificate settings' });
  }
});

// =====================================================
// UPDATE CERTIFICATE SETTINGS & SIGNATURES (MASTER ONLY)
// =====================================================
router.post(
  '/settings',
  authenticateToken,
  authorize('master'),
  uploadCertificate.fields([
    { name: 'founder_signature', maxCount: 1 },
    { name: 'authorized_signature', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        founder_name,
        founder_designation,
        authorized_signatory_name,
        authorized_signatory_designation,
        institute_name,
        institute_address,
        auto_approve_certificates
      } = req.body;

      const updates = [];
      if (founder_name) updates.push(['founder_name', founder_name.trim()]);
      if (founder_designation) updates.push(['founder_designation', founder_designation.trim()]);
      if (authorized_signatory_name) updates.push(['authorized_signatory_name', authorized_signatory_name.trim()]);
      if (authorized_signatory_designation) updates.push(['authorized_signatory_designation', authorized_signatory_designation.trim()]);
      if (institute_name) updates.push(['institute_name', institute_name.trim()]);
      if (institute_address) updates.push(['institute_address', institute_address.trim()]);
      if (auto_approve_certificates !== undefined) updates.push(['auto_approve_certificates', String(auto_approve_certificates)]);

      if (req.files && req.files['founder_signature']) {
        const sigPath = '/uploads/certificates/' + req.files['founder_signature'][0].filename;
        updates.push(['founder_signature', sigPath]);
      }

      if (req.files && req.files['authorized_signature']) {
        const sigPath = '/uploads/certificates/' + req.files['authorized_signature'][0].filename;
        updates.push(['authorized_signature', sigPath]);
      }

      for (const [key, val] of updates) {
        await pool.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, val]
        );
      }

      const settings = await getCertificateSettings();
      res.json({ success: true, message: 'Certification settings updated successfully', settings });
    } catch (err) {
      console.error('Update Certificate Settings Error:', err);
      res.status(500).json({ success: false, message: 'Failed to update certificate settings' });
    }
  }
);

// =====================================================
// GET PENDING STUDENT CERTIFICATE REQUESTS
// =====================================================
router.get('/pending', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gc.id, gc.student_id, gc.course_id, gc.certificate_number, gc.issue_date, gc.status, gc.created_at,
              s.name as student_name, s.student_id as student_code, s.email, s.phone,
              c.title as course_name, c.duration as course_duration
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       LEFT JOIN courses c ON gc.course_id = c.id
       ORDER BY gc.created_at DESC`
    );

    res.json({ success: true, pendingRequests: rows });
  } catch (err) {
    console.error('Get Pending Requests Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending certificate requests' });
  }
});

// =====================================================
// APPROVE STUDENT CERTIFICATE REQUEST (MASTER ONLY)
// =====================================================
router.post('/approve/:pending_id', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const pendingId = req.params.pending_id;

    // Get pending request record
    const [[pending]] = await pool.query(
      `SELECT gc.*, s.name as student_name, s.student_id as student_code, c.title as course_name, c.duration as course_duration
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       LEFT JOIN courses c ON gc.course_id = c.id
       WHERE gc.id = ?`,
      [pendingId]
    );

    if (!pending) {
      return res.status(404).json({ success: false, message: 'Pending certificate request not found' });
    }

    const settings = await getCertificateSettings();

    // Auto-generate unique Certificate ID: SRM-CERT-2026-XXXXXX
    const year = new Date().getFullYear();
    const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certificate_id = `SRM-CERT-${year}-${seq}`;
    const verification_code = `VERIFY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const issueDate = new Date().toISOString().split('T')[0];

    // Generate QR Code URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/verify-certificate/${certificate_id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);

    // Insert into main certificates table
    const [result] = await pool.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_id, course_name,
        course_duration, grade, completion_date, issue_date, trainer_name, trainer_signature,
        authorized_signatory_name, authorized_signatory_signature,
        certificate_status, verification_code, qr_code_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'A++', ?, ?, ?, ?, ?, ?, 'Issued', ?, ?)`,
      [
        certificate_id,
        pending.student_id,
        pending.student_name,
        pending.student_code,
        pending.course_id || null,
        pending.course_name || 'Android & iPhone IC-Level Repairing Course',
        pending.course_duration || '25 Days',
        issueDate,
        issueDate,
        settings.founder_name,
        settings.founder_signature,
        settings.authorized_signatory_name,
        settings.authorized_signature,
        verification_code,
        qrCodeDataUrl
      ]
    );

    // Update pending request status to 'approved'
    await pool.query('UPDATE generated_certificates SET status = "approved", certificate_number = ? WHERE id = ?', [certificate_id, pendingId]);

    // Send notification to student
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [
          pending.student_id,
          'student',
          'Certificate Approved! 🎉',
          `Your Certificate of Completion (${certificate_id}) for "${pending.course_name || 'Mobile Repairing'}" has been approved!`,
          'system'
        ]
      );
    } catch (e) {
      console.warn('Failed to insert notification:', e.message);
    }

    const [[newCert]] = await pool.query('SELECT * FROM certificates WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: `Certificate ${certificate_id} approved and issued successfully!`,
      certificate: newCert
    });
  } catch (err) {
    console.error('Approve certificate error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve certificate' });
  }
});

// =====================================================
// REJECT STUDENT CERTIFICATE REQUEST (MASTER ONLY)
// =====================================================
router.post('/reject/:pending_id', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const pendingId = req.params.pending_id;
    const { reason } = req.body;

    const [[pending]] = await pool.query('SELECT student_id FROM generated_certificates WHERE id = ?', [pendingId]);
    if (!pending) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    await pool.query('UPDATE generated_certificates SET status = "rejected" WHERE id = ?', [pendingId]);

    try {
      await pool.query(
        'INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [
          pending.student_id,
          'student',
          'Certificate Request Update',
          `Your certificate request was not approved. Reason: ${reason || 'Incomplete course practicals or requirements.'}`,
          'system'
        ]
      );
    } catch (e) {
      console.warn('Notification error:', e.message);
    }

    res.json({ success: true, message: 'Certificate request rejected.' });
  } catch (err) {
    console.error('Reject certificate error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject certificate' });
  }
});

// =====================================================
// LIST CERTIFICATES WITH FILTERS (MASTER / ADMIN)
// =====================================================
router.get('/list', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { search, course_id, status, grade } = req.query;
    let query = `
      SELECT c.*, s.student_id as student_code, s.email, s.phone
      FROM certificates c
      LEFT JOIN students s ON c.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (c.student_name LIKE ? OR s.student_id LIKE ? OR c.certificate_id LIKE ? OR s.phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (course_id) {
      query += ` AND c.course_id = ?`;
      params.push(course_id);
    }

    if (status) {
      query += ` AND c.certificate_status = ?`;
      params.push(status);
    }

    if (grade) {
      query += ` AND c.grade = ?`;
      params.push(grade);
    }

    query += ` ORDER BY c.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, certificates: rows });
  } catch (err) {
    console.error('List Certificates Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// =====================================================
// AUTO-FILL STUDENT DATA FOR GENERATING CERTIFICATE
// =====================================================
router.get('/auto-fill/:student_id', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const [[student]] = await pool.query(
      'SELECT id, name, student_id, email, phone, course_name, duration, created_at FROM students WHERE id = ? OR student_id = ?',
      [studentId, studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [courses] = await pool.query(
      `SELECT c.id, c.title, c.duration, cp.status, cp.completion_date, cp.grade
       FROM courses c
       JOIN course_progress cp ON c.id = cp.course_id
       WHERE cp.student_id = ?`,
      [student.id]
    );

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        student_id: student.student_id,
        email: student.email,
        phone: student.phone,
        default_course: student.course_name || 'Android & iPhone IC-Level Repairing Course',
        default_duration: student.duration || '25 Days',
        enrolled_courses: courses
      }
    });
  } catch (err) {
    console.error('Auto fill student error:', err);
    res.status(500).json({ success: false, message: 'Failed to load student auto-fill data' });
  }
});

// =====================================================
// AUTO-GENERATE NEW CERTIFICATE (MASTER ONLY)
// =====================================================
router.post('/generate', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const {
      student_id,
      student_name,
      student_code,
      course_id,
      course_name,
      course_duration,
      grade,
      completion_date,
      issue_date,
      template_id
    } = req.body;

    if (!student_id || !student_name) {
      return res.status(400).json({ success: false, message: 'Student ID and Student Name are required' });
    }

    const settings = await getCertificateSettings();

    const year = new Date().getFullYear();
    const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certificate_id = `SRM-CERT-${year}-${seq}`;
    const verification_code = `VERIFY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const certIssueDate = issue_date || new Date().toISOString().split('T')[0];
    const certCompletionDate = completion_date || certIssueDate;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/verify-certificate/${certificate_id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);

    const parsedCourseId = course_id && !isNaN(parseInt(course_id)) ? parseInt(course_id) : null;
    const parsedTemplateId = template_id && !isNaN(parseInt(template_id)) ? parseInt(template_id) : null;

    const [result] = await pool.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_id, course_name,
        course_duration, grade, completion_date, issue_date, trainer_name, trainer_signature,
        authorized_signatory_name, authorized_signatory_signature, template_id,
        certificate_status, verification_code, qr_code_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Issued', ?, ?)`,
      [
        certificate_id,
        parseInt(student_id),
        student_name.trim(),
        student_code ? student_code.trim() : null,
        parsedCourseId,
        course_name ? course_name.trim() : 'Android & iPhone IC-Level Repairing Course',
        course_duration ? course_duration.trim() : '25 Days',
        grade ? grade.trim() : 'A++',
        certCompletionDate,
        certIssueDate,
        settings.founder_name,
        settings.founder_signature,
        settings.authorized_signatory_name,
        settings.authorized_signature,
        parsedTemplateId,
        verification_code,
        qrCodeDataUrl
      ]
    );

    // Sync generated_certificates table safely
    if (parsedCourseId) {
      try {
        await pool.query(
          `INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) 
           VALUES (?, ?, ?, CURDATE(), 'approved')`,
          [parseInt(student_id), parsedCourseId, certificate_id]
        );
      } catch (syncErr) {
        console.warn('Sync generated_certificates warning:', syncErr.message);
      }
    }

    const [[newCert]] = await pool.query('SELECT * FROM certificates WHERE id = ?', [result.insertId]);

    try {
      await pool.query(
        'INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [
          student_id,
          'student',
          'Certificate Issued! 🎓',
          `Congratulations! Your Certificate of Completion (${certificate_id}) for "${course_name || 'Mobile Repairing'}" is now available.`,
          'system'
        ]
      );
    } catch (e) {
      console.warn('Failed to insert notification:', e.message);
    }

    res.status(201).json({
      success: true,
      message: `Certificate ${certificate_id} generated successfully!`,
      certificate: newCert
    });
  } catch (err) {
    console.error('Generate Certificate Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate certificate' });
  }
});

// =====================================================
// UPDATE CERTIFICATE STATUS (ISSUED / REVOKED / DRAFT)
// =====================================================
router.put('/:id/status', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const { status } = req.body;
    const certId = req.params.id;
    const validStatuses = ['Draft', 'Generated', 'Issued', 'Revoked'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    await pool.query('UPDATE certificates SET certificate_status = ? WHERE id = ? OR certificate_id = ?', [status, certId, certId]);
    res.json({ success: true, message: `Certificate status updated to ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update certificate status' });
  }
});

// =====================================================
// REGENERATE CERTIFICATE WITH LATEST SETTINGS
// =====================================================
router.post('/:id/regenerate', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const certId = req.params.id;
    const settings = await getCertificateSettings();

    await pool.query(
      `UPDATE certificates 
       SET trainer_name = ?, trainer_signature = ?, 
           authorized_signatory_name = ?, authorized_signatory_signature = ?
       WHERE id = ? OR certificate_id = ?`,
      [
        settings.founder_name,
        settings.founder_signature,
        settings.authorized_signatory_name,
        settings.authorized_signature,
        certId,
        certId
      ]
    );

    const [[updatedCert]] = await pool.query('SELECT * FROM certificates WHERE id = ? OR certificate_id = ?', [certId, certId]);
    res.json({ success: true, message: 'Certificate regenerated with current global signatures & trainer details', certificate: updatedCert });
  } catch (err) {
    console.error('Regenerate error:', err);
    res.status(500).json({ success: false, message: 'Failed to regenerate certificate' });
  }
});

// =====================================================
// DELETE CERTIFICATE
// =====================================================
router.delete('/:id', authenticateToken, authorize('master'), async (req, res) => {
  try {
    await pool.query('DELETE FROM certificates WHERE id = ? OR certificate_id = ?', [req.params.id, req.params.id]);
    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (err) {
    console.error('Delete certificate error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete certificate' });
  }
});

// =====================================================
// TEMPLATE MANAGEMENT ROUTES
// =====================================================
router.get('/templates', async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM certificate_templates ORDER BY created_at DESC');
    res.json({ success: true, templates });
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

router.post(
  '/templates',
  authenticateToken,
  authorize('master'),
  uploadCertificate.single('template_file'),
  async (req, res) => {
    try {
      const { template_name } = req.body;
      const templatePath = req.file ? '/uploads/certificates/' + req.file.filename : null;

      const [result] = await pool.query(
        'INSERT INTO certificate_templates (template_name, template_file, bg_image, is_default, is_active) VALUES (?, ?, ?, 0, 1)',
        [template_name || 'Uploaded Custom Template', templatePath, templatePath]
      );

      res.status(201).json({ success: true, message: 'Certificate template uploaded successfully', templateId: result.insertId });
    } catch (err) {
      console.error('Upload template error:', err);
      res.status(500).json({ success: false, message: 'Failed to upload template' });
    }
  }
);

router.delete('/templates/:id', authenticateToken, authorize('master'), async (req, res) => {
  try {
    await pool.query('DELETE FROM certificate_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

module.exports = router;
