const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCourseMaterial, uploadCertificateTemplate } = require('../middleware/upload');

// Helper to send system notification
async function createNotification(userId, userRole, title, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type, sent_via, sent_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, userRole, title, message, 'system', 'system', 'sent']
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// =====================================================
// FILE UPLOADS HELPERS
// =====================================================
router.post('/manage/upload-banner', authenticateToken, authorize('master', 'admin'), uploadCourseMaterial.single('banner'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // We save under uploads/courses/images (managed by uploadCourseMaterial automatically)
    const filePath = `/uploads/courses/images/${req.file.filename}`;
    res.json({ success: true, filePath });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Banner upload failed', error: err.message });
  }
});

router.post('/manage/upload-file', authenticateToken, authorize('master', 'admin'), uploadCourseMaterial.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const ext = require('path').extname(req.file.originalname).toLowerCase();
    let subDir = 'documents';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) subDir = 'images';
    else if (ext === '.pdf') subDir = 'pdf';
    else if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.3gp', '.mpeg'].includes(ext)) subDir = 'videos';

    const filePath = `/uploads/courses/${subDir}/${req.file.filename}`;
    res.json({ success: true, filePath });
  } catch (err) {
    res.status(500).json({ success: false, message: 'File upload failed', error: err.message });
  }
});

// =====================================================
// MASTER/ADMIN: Course CRUD Endpoints
// =====================================================

// Get all courses (with detailed counts and lists for admin panel)
router.get('/manage', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    // 1. Get courses
    const [courses] = await pool.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM course_subjects WHERE course_id = c.id) AS subject_count,
              (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) AS student_count
       FROM courses c 
       ORDER BY c.created_at DESC`
    );

    // 2. Hydrate courses with subjects and items
    const hydratedCourses = [];
    for (const course of courses) {
      const [subjects] = await pool.query(
        'SELECT * FROM course_subjects WHERE course_id = ? ORDER BY display_order ASC, id ASC',
        [course.id]
      );

      const subjectsWithItems = [];
      for (const subject of subjects) {
        const [items] = await pool.query(
          'SELECT * FROM course_subject_items WHERE subject_id = ? ORDER BY display_order ASC, id ASC',
          [subject.id]
        );
        subjectsWithItems.push({
          ...subject,
          items: items
        });
      }

      hydratedCourses.push({
        ...course,
        subjects: subjectsWithItems
      });
    }

    res.json({ success: true, courses: hydratedCourses });
  } catch (err) {
    console.error('Manage get courses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create course
router.post('/manage', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, description, price, is_free, banner_image, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const finalPrice = is_free ? 0 : (price || 0);
    const finalIsFree = is_free ? 1 : 0;
    const finalStatus = status === 'inactive' ? 'inactive' : 'active';

    const [result] = await pool.query(
      'INSERT INTO courses (title, description, price, is_free, banner_image, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', finalPrice, finalIsFree, banner_image || null, finalStatus]
    );

    res.status(201).json({ success: true, message: 'Course created successfully', courseId: result.insertId });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update course
router.put('/manage/:id', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, description, price, is_free, banner_image, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const finalPrice = is_free ? 0 : (price || 0);
    const finalIsFree = is_free ? 1 : 0;
    const finalStatus = status === 'inactive' ? 'inactive' : 'active';

    await pool.query(
      'UPDATE courses SET title = ?, description = ?, price = ?, is_free = ?, banner_image = ?, status = ? WHERE id = ?',
      [title, description || '', finalPrice, finalIsFree, banner_image || null, finalStatus, req.params.id]
    );

    res.json({ success: true, message: 'Course updated successfully' });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete course
router.delete('/manage/:id', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUBJECTS MANAGEMENT
// =====================================================

// Create subject under a course
router.post('/manage/:id/subject', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, display_order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Subject title is required' });

    const [result] = await pool.query(
      'INSERT INTO course_subjects (course_id, title, display_order) VALUES (?, ?, ?)',
      [req.params.id, title, display_order || 0]
    );

    res.status(201).json({ success: true, message: 'Subject created successfully', subjectId: result.insertId });
  } catch (err) {
    console.error('Create subject error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update or Delete a subject
router.put('/manage/subject/:subjectId', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, display_order, action } = req.body;
    const { subjectId } = req.params;

    if (action === 'delete') {
      await pool.query('DELETE FROM course_subjects WHERE id = ?', [subjectId]);
      return res.json({ success: true, message: 'Subject deleted successfully' });
    }

    if (!title) return res.status(400).json({ success: false, message: 'Subject title is required' });

    await pool.query(
      'UPDATE course_subjects SET title = ?, display_order = ? WHERE id = ?',
      [title, display_order || 0, subjectId]
    );

    res.json({ success: true, message: 'Subject updated successfully' });
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUBJECT ITEMS MANAGEMENT
// =====================================================

// Create subject item
router.post('/manage/subject/:subjectId/item', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, type, file_path, youtube_url, display_order } = req.body;
    const { subjectId } = req.params;

    if (!title || !type) return res.status(400).json({ success: false, message: 'Title and type are required' });

    const [result] = await pool.query(
      'INSERT INTO course_subject_items (subject_id, title, type, file_path, youtube_url, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [subjectId, title, type, file_path || null, youtube_url || null, display_order || 0]
    );

    res.status(201).json({ success: true, message: 'Curriculum item added successfully', itemId: result.insertId });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update or Delete subject item
router.put('/manage/subject/item/:itemId', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, type, file_path, youtube_url, display_order, action } = req.body;
    const { itemId } = req.params;

    if (action === 'delete') {
      await pool.query('DELETE FROM course_subject_items WHERE id = ?', [itemId]);
      return res.json({ success: true, message: 'Item deleted successfully' });
    }

    if (!title || !type) return res.status(400).json({ success: false, message: 'Title and type are required' });

    await pool.query(
      'UPDATE course_subject_items SET title = ?, type = ?, file_path = ?, youtube_url = ?, display_order = ? WHERE id = ?',
      [title, type, file_path || null, youtube_url || null, display_order || 0, itemId]
    );

    res.json({ success: true, message: 'Item updated successfully' });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MANUAL ASSIGNMENT (Bulk Student/Course enrollment)
// =====================================================
router.post('/manage/assign', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { studentIds, courseIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one student' });
    }
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one course' });
    }

    let enrollCount = 0;
    for (const studentId of studentIds) {
      for (const courseId of courseIds) {
        // Enroll student (ignore duplicates)
        const [result] = await pool.query(
          'INSERT IGNORE INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
          [studentId, courseId]
        );

        if (result.affectedRows > 0) {
          enrollCount++;
          // Get course info for notification
          const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);
          if (course) {
            await createNotification(
              studentId,
              'student',
              'New Course Assigned',
              `You have been assigned to the course: "${course.title}". Go to My Courses to start learning!`
            );
          }
        }
      }
    }

    res.json({ success: true, message: `Successfully enrolled students in courses. ${enrollCount} new mappings created.` });
  } catch (err) {
    console.error('Bulk assign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// PURCHASE REQUESTS APPROVALS
// =====================================================
router.get('/manage/purchases', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [purchases] = await pool.query(
      `SELECT cp.*, s.name AS student_name, s.student_id AS student_code, s.email AS student_email, c.title AS course_title
       FROM course_purchases cp
       JOIN students s ON cp.student_id = s.id
       JOIN courses c ON cp.course_id = c.id
       ORDER BY cp.created_at DESC`
    );
    res.json({ success: true, purchases });
  } catch (err) {
    console.error('Get purchases error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/manage/purchase/:purchaseId', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const { purchaseId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid purchase status' });
    }

    // Get purchase details
    const [[purchase]] = await pool.query(
      'SELECT cp.*, c.title AS course_title FROM course_purchases cp JOIN courses c ON cp.course_id = c.id WHERE cp.id = ?',
      [purchaseId]
    );
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase request not found' });

    // Update status
    await pool.query('UPDATE course_purchases SET status = ? WHERE id = ?', [status, purchaseId]);

    if (status === 'approved') {
      // 1. Enroll student
      await pool.query(
        'INSERT IGNORE INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
        [purchase.student_id, purchase.course_id]
      );
      // 2. Notify student
      await createNotification(
        purchase.student_id,
        'student',
        'Course Purchase Approved 🎉',
        `Your purchase of "${purchase.course_title}" has been approved! Happy learning!`
      );
      // 3. Email student
      const [[studentRow]] = await pool.query('SELECT name, email FROM students WHERE id = ?', [purchase.student_id]);
      if (studentRow && studentRow.email) {
        const { sendMailFromTemplate } = require('../services/emailService');
        sendMailFromTemplate(studentRow.email, 'course_approval_email_template', { name: studentRow.name, course_title: purchase.course_title }).catch(e => console.error(e));
      }
    } else {
      // 2. Notify student of rejection
      await createNotification(
        purchase.student_id,
        'student',
        'Course Purchase Rejected',
        `Your purchase request for "${purchase.course_title}" was rejected. Please review payment proof or contact support.`
      );
    }

    res.json({ success: true, message: `Purchase request ${status} successfully.` });
  } catch (err) {
    console.error('Approve/Reject purchase error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// DEVICE SECURITY MANAGEMENT
// =====================================================
router.get('/manage/students', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT id, student_id AS student_code, name, email, mobile, android_device_id, last_login, status FROM students ORDER BY name ASC'
    );
    res.json({ success: true, students });
  } catch (err) {
    console.error('Get student devices error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/manage/student/:studentId/reset-device', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    await pool.query('UPDATE students SET android_device_id = NULL WHERE id = ?', [req.params.studentId]);
    res.json({ success: true, message: 'Device binding reset successfully.' });
  } catch (err) {
    console.error('Reset student device error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUPPORT TICKET INBOX (Master / Admin Reply Panel)
// =====================================================
router.get('/manage/support/tickets', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT st.*, s.name AS student_name, s.student_id AS student_code, s.email AS student_email
       FROM support_tickets st
       JOIN students s ON st.student_id = s.id
       ORDER BY st.updated_at DESC`
    );
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/manage/support/tickets/:id/messages', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [messages] = await pool.query(
      'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/manage/support/tickets/:id/reply', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role; // master or admin

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message) VALUES (?, ?, ?, ?)',
      [ticketId, senderRole, senderId, message]
    );

    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['in_progress', ticketId]);

    const [[ticket]] = await pool.query('SELECT student_id, subject FROM support_tickets WHERE id = ?', [ticketId]);
    if (ticket) {
      await pool.query(
        'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [ticket.student_id, 'student', 'Reply from Support Team', `New reply received on your ticket: "${ticket.subject}".`, 'support']
      );
    }

    res.status(201).json({ success: true, message: 'Reply sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/manage/support/tickets/:id/status', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Ticket status updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// ANNOUNCEMENTS & BROADCASTS
// =====================================================
router.post('/manage/announcements', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { title, content, target_type, studentIds } = req.body;
    const createdBy = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [result] = await conn.query(
        'INSERT INTO announcements (title, content, target_type, created_by) VALUES (?, ?, ?, ?)',
        [title, content, target_type || 'all', createdBy]
      );
      
      const announcementId = result.insertId;

      if (target_type === 'selected' && Array.isArray(studentIds) && studentIds.length > 0) {
        for (const sid of studentIds) {
          await conn.query(
            'INSERT INTO announcement_recipients (announcement_id, student_id) VALUES (?, ?)',
            [announcementId, sid]
          );
          await conn.query(
            'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
            [sid, 'student', 'New Announcement 📢', title, 'announcement']
          );
        }
      } else {
        await conn.query(
          'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
          [null, 'all', 'New Announcement 📢', title, 'announcement']
        );
      }

      await conn.commit();
      conn.release();
      res.status(201).json({ success: true, message: 'Announcement broadcasted successfully.' });

    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/manage/announcements', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json({ success: true, announcements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CERTIFICATE TEMPLATES & REQUESTS
// =====================================================
router.post(
  '/manage/certificates/template',
  authenticateToken,
  authorize('master', 'admin'),
  uploadCertificateTemplate.fields([
    { name: 'template', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const templateFile = req.files['template'] ? `/uploads/certificates/templates/${req.files['template'][0].filename}` : null;
      const logoFile = req.files['logo'] ? `/uploads/certificates/templates/${req.files['logo'][0].filename}` : null;
      const signatureFile = req.files['signature'] ? `/uploads/certificates/templates/${req.files['signature'][0].filename}` : null;

      if (!templateFile) {
        return res.status(400).json({ success: false, message: 'Certificate background template file is required.' });
      }

      await pool.query('UPDATE certificate_templates SET is_active = 0');

      await pool.query(
        'INSERT INTO certificate_templates (template_file, institute_logo, institute_signature, is_active) VALUES (?, ?, ?, 1)',
        [templateFile, logoFile, signatureFile]
      );

      res.status(201).json({ success: true, message: 'Certificate template uploaded and set active.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get('/manage/certificates/templates', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM certificate_templates ORDER BY id DESC');
    res.json({ success: true, templates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/manage/certificates/requests', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gc.*, s.name AS student_name, s.student_id AS student_code, c.title AS course_title
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       JOIN courses c ON gc.course_id = c.id
       ORDER BY gc.created_at DESC`
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/manage/certificates/request/:id/approve', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate status' });
    }

    await pool.query('UPDATE generated_certificates SET status = ? WHERE id = ?', [status, req.params.id]);

    const [[cert]] = await pool.query(
      'SELECT gc.*, c.title AS course_title FROM generated_certificates gc JOIN courses c ON gc.course_id = c.id WHERE gc.id = ?',
      [req.params.id]
    );

    if (cert) {
      if (status === 'approved') {
        await pool.query(
          'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
          [cert.student_id, 'student', 'Certificate Issued! 📜', `Your certificate for "${cert.course_title}" is approved and ready for download.`, 'certificate']
        );
      } else {
        await pool.query(
          'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
          [cert.student_id, 'student', 'Certificate Request Rejected', `Your certificate request for "${cert.course_title}" was rejected. Please contact support.`, 'certificate']
        );
      }
    }

    res.json({ success: true, message: `Certificate request ${status} successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/manage/certificates/reissue', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID required' });
    }

    await pool.query('DELETE FROM generated_certificates WHERE student_id = ? AND course_id = ?', [studentId, courseId]);

    const certNumber = `SRM-CERT-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    await pool.query(
      'INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) VALUES (?, ?, ?, CURDATE(), ?)',
      [studentId, courseId, certNumber, 'approved']
    );

    const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [studentId, 'student', 'Certificate Reissued! 📜', `A new certificate has been reissued for you for course "${course?.title || 'Course'}".`, 'certificate']
    );

    res.json({ success: true, message: 'Certificate reissued and approved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
