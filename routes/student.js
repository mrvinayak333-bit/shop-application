const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadProfile, uploadCourseMaterial } = require('../middleware/upload');

// All student routes require authentication
router.use(authenticateToken);
router.use(authorize('student'));

// =====================================================
// GET STUDENT DASHBOARD (My Enrolled Courses & Certs)
// =====================================================
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student info
    const [[student]] = await pool.query(
      `SELECT id, student_id, name, email, mobile, course, batch, status, enrollment_date, 
              profile_photo, fathers_name, address, age, dob, aadhaar_number, gender 
       FROM students WHERE id = ?`,
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get enrolled courses (with dynamic subject-item count progress)
    const [enrollments] = await pool.query(
      `SELECT
          ce.id AS enrollment_id,
          c.id AS course_id,
          c.title AS course_name,
          c.description,
          c.price,
          c.thumbnail,
          ce.status AS enrollment_status,
          (
            SELECT COUNT(*) 
            FROM course_subject_items csi 
            JOIN course_subjects cs ON csi.subject_id = cs.id 
            WHERE cs.course_id = c.id
          ) AS total_videos,
          (
            SELECT COUNT(*) 
            FROM student_item_progress sip 
            JOIN course_subject_items csi ON sip.item_id = csi.id 
            JOIN course_subjects cs ON csi.subject_id = cs.id 
            WHERE cs.course_id = c.id AND sip.student_id = ? AND sip.completed = 1
          ) AS completed_videos
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id AND c.status = 'active'
       WHERE ce.student_id = ?
       ORDER BY ce.assigned_at DESC`,
      [studentId, studentId]
    );

    const processedEnrollments = enrollments.map(e => {
      const total = e.total_videos || 0;
      const completed = e.completed_videos || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...e,
        progress_percentage: pct
      };
    });

    // Get generated certificates
    const [certificates] = await pool.query(
      `SELECT gc.id, gc.certificate_number, gc.issue_date, gc.status, gc.pdf_path, c.title as course_name 
       FROM generated_certificates gc 
       JOIN courses c ON gc.course_id = c.id 
       WHERE gc.student_id = ?`,
      [studentId]
    );

    res.json({
      success: true,
      student,
      courses: processedEnrollments,
      certificates
    });

  } catch (err) {
    console.error('Student Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET COURSE DETAILS WITH CONTENT (SUBJECTS & ITEMS)
// =====================================================
router.get('/course/:courseId', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Verify enrollment
    const [enrollment] = await pool.query(
      'SELECT id, status FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (!enrollment.length) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    // Get course info
    const [[course]] = await pool.query(
      `SELECT c.*, COALESCE(mu.name, 'Instructor') AS instructor_name 
       FROM courses c 
       LEFT JOIN master_users mu ON c.instructor_id = mu.id 
       WHERE c.id = ?`,
      [courseId]
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Get subjects
    const [subjects] = await pool.query(
      'SELECT * FROM course_subjects WHERE course_id = ? ORDER BY display_order ASC, id ASC',
      [courseId]
    );

    // Get subject items with completion flags
    const [items] = await pool.query(
      `SELECT csi.*, COALESCE(sip.completed, 0) AS completed 
       FROM course_subject_items csi 
       JOIN course_subjects cs ON csi.subject_id = cs.id 
       LEFT JOIN student_item_progress sip ON csi.id = sip.item_id AND sip.student_id = ? 
       WHERE cs.course_id = ? 
       ORDER BY csi.display_order ASC, csi.id ASC`,
      [studentId, courseId]
    );

    // Get certificate status if any
    const [[certificate]] = await pool.query(
      'SELECT id, certificate_number, status, issue_date FROM generated_certificates WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    res.json({
      success: true,
      course,
      subjects,
      items,
      enrollment: enrollment[0],
      certificate: certificate || null
    });

  } catch (err) {
    console.error('Course Details Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MARK SUBJECT ITEM COMPLETE & PROGRESS CHECK
// =====================================================
router.post('/course-item/:itemId/complete', async (req, res) => {
  try {
    const studentId = req.user.id;
    const itemId = req.params.itemId;
    const { completed } = req.body; // true or false
    
    const isCompleted = completed ? 1 : 0;

    // Save item progress
    await pool.query(
      `INSERT INTO student_item_progress (student_id, item_id, completed) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE completed = ?, completed_at = CURRENT_TIMESTAMP`,
      [studentId, itemId, isCompleted, isCompleted]
    );

    // Get course ID for this subject item
    const [[itemInfo]] = await pool.query(
      `SELECT cs.course_id FROM course_subject_items csi 
       JOIN course_subjects cs ON csi.subject_id = cs.id 
       WHERE csi.id = ?`,
      [itemId]
    );

    if (!itemInfo) {
      return res.status(404).json({ success: false, message: 'Item details not found' });
    }

    const courseId = itemInfo.course_id;

    // Calculate completion metrics
    const [[{ totalItems }]] = await pool.query(
      `SELECT COUNT(*) as totalItems FROM course_subject_items csi 
       JOIN course_subjects cs ON csi.subject_id = cs.id 
       WHERE cs.course_id = ?`,
      [courseId]
    );

    const [[{ completedItems }]] = await pool.query(
      `SELECT COUNT(*) as completedItems FROM student_item_progress sip 
       JOIN course_subject_items csi ON sip.item_id = csi.id 
       JOIN course_subjects cs ON csi.subject_id = cs.id 
       WHERE cs.course_id = ? AND sip.student_id = ? AND sip.completed = 1`,
      [courseId, studentId]
    );

    let progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    let enrollmentStatus = 'in_progress';

    if (progressPct === 100) {
      enrollmentStatus = 'completed';
      await pool.query(
        'UPDATE course_enrollments SET status = ?, completion_date = CURDATE() WHERE student_id = ? AND course_id = ?',
        [enrollmentStatus, studentId, courseId]
      );

      // Trigger automatic certificate generation request
      const [existingCert] = await pool.query(
        'SELECT id FROM generated_certificates WHERE student_id = ? AND course_id = ?',
        [studentId, courseId]
      );

      if (existingCert.length === 0) {
        const certNumber = `SRM-CERT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
        await pool.query(
          'INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) VALUES (?, ?, ?, CURDATE(), ?)',
          [studentId, courseId, certNumber, 'pending_approval']
        );

        // Notify Master/Admins
        const [[studentObj]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
        const [[courseObj]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);

        await pool.query(
          'INSERT INTO notifications (user_role, title, message, type) VALUES (?, ?, ?, ?)',
          ['master', 'Certificate Request Generated', `${studentObj.name} has completed 100% of "${courseObj.title}". Certificate request is pending approval.`, 'approval']
        );
      }
    } else {
      await pool.query(
        'UPDATE course_enrollments SET status = ? WHERE student_id = ? AND course_id = ?',
        [enrollmentStatus, studentId, courseId]
      );
    }

    res.json({ 
      success: true, 
      progress: progressPct, 
      status: enrollmentStatus 
    });

  } catch (err) {
    console.error('Complete subject item error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// NEW ACHIEVEMENTS (COURSE STORE)
// =====================================================
router.get('/course-store', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Paid active courses student has not enrolled in and has no pending purchase requests for
    const [courses] = await pool.query(
      `SELECT c.* FROM courses c 
       WHERE c.status = 'active' 
       AND c.id NOT IN (SELECT course_id FROM course_enrollments WHERE student_id = ?) 
       AND c.id NOT IN (SELECT course_id FROM course_purchases WHERE student_id = ? AND status = 'pending')`,
      [studentId, studentId]
    );

    const [pendingPurchases] = await pool.query(
      `SELECT cp.*, c.title as course_name, c.thumbnail 
       FROM course_purchases cp 
       JOIN courses c ON cp.course_id = c.id 
       WHERE cp.student_id = ? AND cp.status = 'pending'`,
      [studentId]
    );

    res.json({ success: true, courses, pendingPurchases });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Buy course (create purchase request)
router.post('/course-store/buy', uploadCourseMaterial.single('screenshot'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId, payment_method, amount_paid } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    let screenshotPath = null;
    if (req.file) {
      screenshotPath = `/uploads/courses/documents/${req.file.filename}`;
    }

    // Insert purchase record
    await pool.query(
      `INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, payment_screenshot, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        studentId, 
        courseId, 
        parseFloat(amount_paid) || 0.00, 
        payment_method || 'UPI/Online', 
        screenshotPath
      ]
    );

    // Get names for notification
    const [[studentObj]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
    const [[courseObj]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);

    // Send notifications to Master/Admins
    await pool.query(
      `INSERT INTO notifications (user_role, title, message, type) 
       VALUES (?, ?, ?, ?)`,
      [
        'master', 
        'New Purchase Request', 
        `Student "${studentObj.name}" submitted a request to purchase course "${courseObj.title}" for ₹${parseFloat(amount_paid) || 0.00}`, 
        'payment'
      ]
    );

    res.status(201).json({ success: true, message: 'Purchase request submitted successfully' });
  } catch (err) {
    console.error('Buy course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET / UPDATE PROFILE
// =====================================================
router.get('/profile', async (req, res) => {
  try {
    const [[student]] = await pool.query(
      `SELECT id, student_id, name, email, mobile, course, batch, status, enrollment_date, 
              profile_photo, fathers_name, address, age, dob, aadhaar_number, gender 
       FROM students WHERE id = ?`,
      [req.user.id]
    );
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', uploadProfile.single('profile_photo'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, fathers_name, address, age, dob, aadhaar_number, gender } = req.body;

    const updateFields = [];
    const params = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (fathers_name !== undefined) { updateFields.push('fathers_name = ?'); params.push(fathers_name); }
    if (address !== undefined) { updateFields.push('address = ?'); params.push(address); }
    if (age !== undefined) { updateFields.push('age = ?'); params.push(age ? parseInt(age) : null); }
    if (dob !== undefined) { updateFields.push('dob = ?'); params.push(dob || null); }
    if (aadhaar_number !== undefined) { updateFields.push('aadhaar_number = ?'); params.push(aadhaar_number); }
    if (gender !== undefined) { updateFields.push('gender = ?'); params.push(gender); }

    if (req.file) {
      const profilePhotoPath = '/uploads/profiles/' + req.file.filename;
      updateFields.push('profile_photo = ?');
      params.push(profilePhotoPath);
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No fields to update' });
    }

    params.push(studentId);
    await pool.query(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// HELP & SUPPORT (TICKETING SYSTEM)
// =====================================================
router.post('/support/ticket', uploadProfile.single('screenshot'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO support_tickets (student_id, subject, status) VALUES (?, ?, ?)',
      [studentId, subject, 'open']
    );
    const ticketId = result.insertId;

    let attachmentPath = null;
    if (req.file) {
      attachmentPath = '/uploads/profiles/' + req.file.filename;
    }

    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message, attachment_path) VALUES (?, ?, ?, ?, ?)',
      [ticketId, 'student', studentId, message, attachmentPath]
    );

    const [[studentObj]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
    await pool.query(
      'INSERT INTO notifications (user_role, title, message, type) VALUES (?, ?, ?, ?)',
      ['master', 'New Support Ticket Raised', `Student "${studentObj.name}" raised support ticket: "${subject}"`, 'support']
    );

    res.status(201).json({ success: true, message: 'Support ticket raised successfully', ticketId });
  } catch (err) {
    console.error('Support ticket error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/support/tickets', async (req, res) => {
  try {
    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE student_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/support/tickets/:id', async (req, res) => {
  try {
    const studentId = req.user.id;
    const ticketId = req.params.id;

    const [[ticket]] = await pool.query(
      'SELECT * FROM support_tickets WHERE id = ? AND student_id = ?',
      [ticketId, studentId]
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const [messages] = await pool.query(
      'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );

    res.json({ success: true, ticket, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/support/tickets/:id/reply', uploadProfile.single('screenshot'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const [[ticket]] = await pool.query(
      'SELECT * FROM support_tickets WHERE id = ? AND student_id = ?',
      [ticketId, studentId]
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    let attachmentPath = null;
    if (req.file) {
      attachmentPath = '/uploads/profiles/' + req.file.filename;
    }

    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message, attachment_path) VALUES (?, ?, ?, ?, ?)',
      [ticketId, 'student', studentId, message, attachmentPath]
    );

    await pool.query(
      'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
      [ticketId]
    );

    const [[studentObj]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
    await pool.query(
      'INSERT INTO notifications (user_role, title, message, type) VALUES (?, ?, ?, ?)',
      ['master', 'New Ticket Reply', `Student "${studentObj.name}" replied to support ticket: "${ticket.subject}"`, 'support']
    );

    res.json({ success: true, message: 'Reply sent' });
  } catch (err) {
    console.error('Support ticket reply error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// ANNOUNCEMENTS
// =====================================================
router.get('/announcements', async (req, res) => {
  try {
    const studentId = req.user.id;
    const [rows] = await pool.query(
      `SELECT a.* FROM announcements a
       LEFT JOIN announcement_recipients ar ON a.id = ar.announcement_id
       WHERE a.target_type = 'all' OR (a.target_type = 'selected' AND ar.student_id = ?)
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [studentId]
    );
    res.json({ success: true, announcements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
