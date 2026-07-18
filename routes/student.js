const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { 
  uploadPaymentScreenshot, 
  uploadProfilePhoto, 
  uploadSupportAttachment 
} = require('../middleware/upload');

// Helper to send system notification
async function createNotification(userId, userRole, title, message, type = 'system') {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type, sent_via, sent_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, userRole, title, message, type, 'system', 'sent']
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// All student routes require authentication and student role
router.use(authenticateToken);
router.use(authorize('student'));

// =====================================================
// GET STUDENT DASHBOARD (My Enrolled Courses)
// =====================================================
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Get student profile details
    const [[student]] = await pool.query(
      `SELECT id, student_id AS student_code, name, email, mobile, status, enrollment_date, 
              android_device_id, profile_photo, fathers_name, address, age, dob, aadhaar_number, gender 
       FROM students WHERE id = ?`,
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // 2. Get enrolled courses assigned or approved
    const [enrollments] = await pool.query(
      `SELECT ce.id AS enrollment_id, ce.enrolled_date AS assigned_at, ce.created_at, c.*, 
              COALESCE(cp.purchase_date, ce.enrolled_date) AS purchase_date,
              cp.payment_method, cp.status AS payment_status, cp.transaction_id
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       LEFT JOIN course_purchases cp ON ce.course_id = cp.course_id AND ce.student_id = cp.student_id
       WHERE ce.student_id = ? AND c.status = 'active'
       ORDER BY ce.created_at DESC`,
      [studentId]
    );

    // 3. For each course, fetch subjects count, items count, completed items count, and calculate progress
    const hydratedCourses = [];
    for (const course of enrollments) {
      // Get all item IDs under this course
      const [items] = await pool.query(
        `SELECT csi.id 
         FROM course_subject_items csi
         JOIN course_subjects cs ON csi.subject_id = cs.id
         WHERE cs.course_id = ?`,
        [course.id]
      );
      
      const totalItems = items.length;
      let completedItems = 0;

      if (totalItems > 0) {
        const itemIds = items.map(it => it.id);
        const [[progress]] = await pool.query(
          `SELECT COUNT(*) AS completed_count 
           FROM student_item_progress 
           WHERE student_id = ? AND item_id IN (?) AND completed = 1`,
          [studentId, itemIds]
        );
        completedItems = progress.completed_count || 0;
      }

      const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      // Fetch subjects count
      const [[subjectCountRes]] = await pool.query(
        'SELECT COUNT(*) AS count FROM course_subjects WHERE course_id = ?',
        [course.id]
      );

      hydratedCourses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        is_free: course.is_free,
        banner_image: course.banner_image,
        enrollment_id: course.enrollment_id,
        assigned_at: course.assigned_at || course.created_at,
        purchase_date: course.purchase_date || course.created_at,
        payment_status: course.payment_status || 'completed',
        transaction_id: course.transaction_id || null,
        progress_percentage: progressPercentage,
        total_subjects: subjectCountRes.count || 0,
        total_items: totalItems,
        completed_items: completedItems
      });
    }

    res.json({
      success: true,
      student,
      courses: hydratedCourses
    });

  } catch (err) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET COURSE CURRICULUM (With Subject Chapters & Material items)
// =====================================================
router.get('/course/:courseId', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // 1. Verify student is enrolled in this course
    const [enrollment] = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // 2. Fetch course info
    const [[course]] = await pool.query(
      'SELECT id, title, description, banner_image FROM courses WHERE id = ?',
      [courseId]
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // 3. Fetch subjects under this course
    const [subjects] = await pool.query(
      'SELECT id, title, display_order FROM course_subjects WHERE course_id = ? ORDER BY display_order ASC, id ASC',
      [courseId]
    );

    // 4. Hydrate subjects with their items and student progress
    const hydratedSubjects = [];
    let courseTotalItems = 0;
    let courseCompletedItems = 0;

    for (const subject of subjects) {
      const [items] = await pool.query(
        `SELECT csi.*, COALESCE(sip.completed, 0) AS completed
         FROM course_subject_items csi
         LEFT JOIN student_item_progress sip ON csi.id = sip.item_id AND sip.student_id = ?
         WHERE csi.subject_id = ?
         ORDER BY csi.display_order ASC, csi.id ASC`,
        [studentId, subject.id]
      );

      courseTotalItems += items.length;
      courseCompletedItems += items.filter(it => it.completed === 1).length;

      hydratedSubjects.push({
        ...subject,
        items: items
      });
    }

    const progressPercentage = courseTotalItems > 0 ? Math.round((courseCompletedItems / courseTotalItems) * 100) : 0;

    res.json({
      success: true,
      course: {
        ...course,
        progress_percentage: progressPercentage,
        total_items: courseTotalItems,
        completed_items: courseCompletedItems
      },
      subjects: hydratedSubjects
    });

  } catch (err) {
    console.error('Get course curriculum error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SAVE ITEM PROGRESS (Mark Completed/Uncompleted)
// =====================================================
router.post('/item/:itemId/progress', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { itemId } = req.params;
    const { completed } = req.body; // boolean

    // 1. Verify item exists and student is enrolled
    const [[itemVerification]] = await pool.query(
      `SELECT cs.course_id 
       FROM course_subject_items csi
       JOIN course_subjects cs ON csi.subject_id = cs.id
       WHERE csi.id = ?`,
      [itemId]
    );

    if (!itemVerification) {
      return res.status(404).json({ success: false, message: 'Subject item not found' });
    }

    const [enrollment] = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, itemVerification.course_id]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in the course containing this item.' });
    }

    // 2. Insert or update progress
    const completedVal = completed ? 1 : 0;
    await pool.query(
      `INSERT INTO student_item_progress (student_id, item_id, completed) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE completed = ?`,
      [studentId, itemId, completedVal, completedVal]
    );

    // Calculate updated course progress percentage
    const [items] = await pool.query(
      `SELECT csi.id 
       FROM course_subject_items csi
       JOIN course_subjects cs ON csi.subject_id = cs.id
       WHERE cs.course_id = ?`,
      [itemVerification.course_id]
    );

    const totalItems = items.length;
    let completedItems = 0;

    if (totalItems > 0) {
      const itemIds = items.map(it => it.id);
      const [[progress]] = await pool.query(
        `SELECT COUNT(*) AS completed_count 
         FROM student_item_progress 
         WHERE student_id = ? AND item_id IN (?) AND completed = 1`,
        [studentId, itemIds]
      );
      completedItems = progress.completed_count || 0;
    }

    const updatedPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 3. AUTO-CERTIFICATE GENERATION IF 100% COMPLETE
    if (updatedPercentage === 100) {
      const [existingCert] = await pool.query(
        'SELECT id FROM generated_certificates WHERE student_id = ? AND course_id = ?',
        [studentId, itemVerification.course_id]
      );
      if (existingCert.length === 0) {
        const certNumber = `SRM-CERT-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        await pool.query(
          'INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) VALUES (?, ?, ?, CURDATE(), ?)',
          [studentId, itemVerification.course_id, certNumber, 'pending_approval']
        );

        const [[studentNameRow]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
        const [[courseNameRow]] = await pool.query('SELECT title FROM courses WHERE id = ?', [itemVerification.course_id]);

        // Send alert to Master Panel
        await createNotification(
          null, 
          'master', 
          'Certificate Request Generated', 
          `Student "${studentNameRow.name}" completed 100% of course "${courseNameRow.title}". Certificate pending approval.`,
          'certificate'
        );

        // Notify Student
        await createNotification(
          studentId, 
          'student', 
          'Course Completed!', 
          `Congratulations! You completed 100% of "${courseNameRow.title}". Your certificate request has been submitted for approval.`,
          'certificate'
        );
      }
    }

    res.json({
      success: true,
      message: 'Progress updated successfully',
      completed: completedVal === 1,
      progress_percentage: updatedPercentage
    });

  } catch (err) {
    console.error('Update item progress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET AVAILABLE CATALOGUE (Storefront)
// =====================================================
router.get('/store', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch all courses that are active, not free, and where student has no approved or pending purchase
    const [courses] = await pool.query(
      `SELECT c.* 
       FROM courses c
       WHERE c.status = 'active' 
         AND c.is_free = 0 
         AND c.id NOT IN (
           SELECT ce.course_id FROM course_enrollments ce WHERE ce.student_id = ?
         )
         AND c.id NOT IN (
           SELECT cp.course_id FROM course_purchases cp WHERE cp.student_id = ? AND cp.status IN ('pending', 'approved')
         )
       ORDER BY c.created_at DESC`,
      [studentId, studentId]
    );

    res.json({
      success: true,
      courses
    });
  } catch (err) {
    console.error('Get store courses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// PURCHASE REQUEST SUBMIT (Upload Proof Screenshot)
// =====================================================
router.post('/purchase', uploadPaymentScreenshot.single('screenshot'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId, paymentMethod } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot proof uploader is required.' });
    }

    // Get course price
    const [[course]] = await pool.query('SELECT price, title FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const screenshotPath = `/uploads/payments/screenshots/${req.file.filename}`;

    // Insert purchase request
    await pool.query(
      'INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, payment_screenshot, status) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, courseId, course.price, paymentMethod || 'upi', screenshotPath, 'pending']
    );

    // Notify Master/Admin:
    const [[studentRow]] = await pool.query('SELECT name, email FROM students WHERE id = ?', [studentId]);
    await createNotification(
      null, 
      'master', 
      'New Course Purchase Request', 
      `Student "${studentRow.name}" submitted a payment proof for course "${course.title}".`,
      'purchase'
    );

    // Send payment confirmation email asynchronously
    if (studentRow.email) {
      const { sendMailFromTemplate } = require('../services/emailService');
      sendMailFromTemplate(studentRow.email, 'payment_email_template', { name: studentRow.name, course_title: course.title }).catch(e => console.error(e));
    }

    res.json({
      success: true,
      message: 'Payment proof screenshot uploaded successfully. Your request is pending admin approval.'
    });

  } catch (err) {
    console.error('Submit course purchase proof error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// STUDENT PROFILE GET & PUT
// =====================================================
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.user.id;
    const [[student]] = await pool.query(
      `SELECT id, student_id AS student_code, name, email, mobile, status, enrollment_date, 
              profile_photo, fathers_name, address, age, dob, aadhaar_number, gender 
       FROM students WHERE id = ?`,
      [studentId]
    );
    res.json({ success: true, profile: student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, fathers_name, address, age, dob, aadhaar_number, gender, email, mobile } = req.body;

    await pool.query(
      `UPDATE students 
       SET name = ?, fathers_name = ?, address = ?, age = ?, dob = ?, aadhaar_number = ?, gender = ?, email = ?, mobile = ? 
       WHERE id = ?`,
      [name, fathers_name || null, address || null, age || null, dob || null, aadhaar_number || null, gender || null, email || null, mobile || null, studentId]
    );

    res.json({ success: true, message: 'Profile details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.post('/profile/photo', uploadProfilePhoto.single('photo'), async (req, res) => {
  try {
    const studentId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }
    const photoPath = `/uploads/profiles/${req.file.filename}`;
    await pool.query('UPDATE students SET profile_photo = ? WHERE id = ?', [photoPath, studentId]);
    res.json({ success: true, filePath: photoPath, message: 'Profile photo updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CERTIFICATES (My Certificates List & Printable Template HTML)
// =====================================================
router.get('/certificates', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gc.id, gc.certificate_number, gc.issue_date, gc.status, c.title AS course_title, gc.pdf_path
       FROM generated_certificates gc
       JOIN courses c ON gc.course_id = c.id
       WHERE gc.student_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, certificates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/certificates/:id/html', async (req, res) => {
  try {
    const studentId = req.user.id;
    const certId = req.params.id;
    
    const [[cert]] = await pool.query(
      `SELECT gc.*, s.name AS student_name, c.title AS course_title
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       JOIN courses c ON gc.course_id = c.id
       WHERE gc.id = ? AND gc.student_id = ? AND gc.status = 'approved'`,
      [certId, studentId]
    );
    
    if (!cert) {
      return res.status(404).send('<h1>Certificate not found or not approved yet</h1>');
    }
    
    // Get active template
    const [[template]] = await pool.query(
      'SELECT * FROM certificate_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    
    const logoUrl = template?.institute_logo || '';
    const signatureUrl = template?.institute_signature || '';
    const bgUrl = template?.template_file || '';

    // Generate Verification QR code data URL using qrcode package
    const QRCode = require('qrcode');
    const verificationUrl = `${req.protocol}://${req.get('host')}/verify-certificate/${cert.certificate_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

    // Return beautiful printable certificate page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${cert.certificate_number}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Georgia', serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .certificate-container {
            width: 850px;
            height: 600px;
            background-color: #ffffff;
            ${bgUrl ? `background-image: url('${bgUrl}');` : ''}
            background-size: cover;
            background-position: center;
            border: 20px solid #1e3a8a; /* Deep blue border */
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            position: relative;
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          .logo {
            height: 60px;
            max-width: 150px;
            object-fit: contain;
          }
          .cert-title {
            font-size: 32px;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .award-text {
            font-size: 16px;
            color: #4b5563;
            margin-top: 10px;
            font-style: italic;
          }
          .student-name {
            font-size: 36px;
            font-weight: bold;
            color: #111827;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 5px;
            margin: 15px 0;
            display: inline-block;
            min-width: 300px;
          }
          .course-text {
            font-size: 18px;
            color: #4b5563;
            max-width: 600px;
            line-height: 1.5;
          }
          .course-title {
            font-weight: bold;
            color: #1e3a8a;
            font-size: 22px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            width: 100%;
            margin-top: 30px;
          }
          .footer-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 150px;
          }
          .signature {
            height: 50px;
            max-width: 120px;
            object-fit: contain;
            border-bottom: 1px solid #9ca3af;
            margin-bottom: 5px;
          }
          .signature-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: bold;
          }
          .qr-code {
            width: 70px;
            height: 70px;
          }
          .cert-info {
            font-size: 11px;
            color: #9ca3af;
            font-family: monospace;
          }
          @media print {
            body {
              background-color: #ffffff;
            }
            .certificate-container {
              box-shadow: none;
              border-width: 15px;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="header">
            ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Institute Logo" />` : `<div style="font-weight:bold;color:#1e3a8a;">SHREE RAAM MOBILE</div>`}
            <div class="cert-info">
              No: ${cert.certificate_number}<br>
              Date: ${new Date(cert.issue_date).toLocaleDateString()}
            </div>
          </div>
          
          <div>
            <div class="cert-title">Certificate of Completion</div>
            <div class="award-text">This is proudly presented to</div>
            <div class="student-name">${cert.student_name}</div>
            <div class="course-text">
              for successfully completing the specialized training course module<br>
              <span class="course-title">"${cert.course_title}"</span><br>
              with outstanding performance in practical lab testing and theoretical diagnostics.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-section">
              <img class="qr-code" src="${qrCodeDataUrl}" alt="Verification QR" />
              <div class="signature-label" style="margin-top: 5px; font-size: 9px;">Scan to Verify</div>
            </div>
            
            <div class="footer-section">
              <div class="cert-info" style="font-size: 10px;">
                SHREE RAAM MOBILE<br>
                INSTITUTE OF TECHNOLOGY
              </div>
            </div>
            
            <div class="footer-section">
              ${signatureUrl ? `<img class="signature" src="${signatureUrl}" alt="Authorized Signature" />` : `<div style="height:50px;border-bottom:1px solid #9ca3af;width:120px;"></div>`}
              <div class="signature-label">Director Sig</div>
            </div>
          </div>
        </div>
        <script>
          // Auto trigger print dialog on load if printable query param is set
          if (new URLSearchParams(window.location.search).get('print') === 'true') {
            window.onload = function() { window.print(); }
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h1>Server Error generating certificate</h1>');
  }
});

// =====================================================
// HELP & SUPPORT (Student support ticket actions)
// =====================================================
router.get('/support/tickets', async (req, res) => {
  try {
    const studentId = req.user.id;
    const [tickets] = await pool.query(
      `SELECT * FROM support_tickets WHERE student_id = ? ORDER BY updated_at DESC`,
      [studentId]
    );
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/support/tickets', uploadSupportAttachment.single('attachment'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and initial message are required.' });
    }

    const attachmentPath = req.file ? `/uploads/support/${req.file.filename}` : null;

    // Start a transaction to ensure ticket and message are created together
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [ticketResult] = await conn.query(
        'INSERT INTO support_tickets (student_id, subject, status) VALUES (?, ?, ?)',
        [studentId, subject, 'open']
      );

      const ticketId = ticketResult.insertId;

      await conn.query(
        'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message, attachment_path) VALUES (?, ?, ?, ?, ?)',
        [ticketId, 'student', studentId, message, attachmentPath]
      );

      await conn.commit();
      conn.release();

      // Notify Master:
      const [[studentNameRow]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
      await createNotification(
        null, 
        'master', 
        'New Support Ticket', 
        `Student "${studentNameRow.name}" has opened a new support ticket: "${subject}".`,
        'support'
      );

      res.status(201).json({ success: true, ticketId, message: 'Support ticket created successfully.' });

    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create support ticket' });
  }
});

router.get('/support/tickets/:id/messages', async (req, res) => {
  try {
    const studentId = req.user.id;
    const ticketId = req.params.id;

    // Verify ownership
    const [[ticket]] = await pool.query(
      'SELECT id FROM support_tickets WHERE id = ? AND student_id = ?',
      [ticketId, studentId]
    );

    if (!ticket) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const [messages] = await pool.query(
      'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/support/tickets/:id/messages', uploadSupportAttachment.single('attachment'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    // Verify ownership
    const [[ticket]] = await pool.query(
      'SELECT id, subject FROM support_tickets WHERE id = ? AND student_id = ?',
      [ticketId, studentId]
    );

    if (!ticket) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const attachmentPath = req.file ? `/uploads/support/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message, attachment_path) VALUES (?, ?, ?, ?, ?)',
      [ticketId, 'student', studentId, message, attachmentPath]
    );

    // Touch support_tickets update timestamp and set status to open
    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['open', ticketId]);

    // Notify Master:
    const [[studentNameRow]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
    await createNotification(
      null, 
      'master', 
      'Support Ticket Reply', 
      `Student "${studentNameRow.name}" replied on ticket: "${ticket.subject}".`,
      'support'
    );

    res.status(201).json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// ANNOUNCEMENTS FEED (Get broadcast posts)
// =====================================================
router.get('/announcements', async (req, res) => {
  try {
    const studentId = req.user.id;
    const [rows] = await pool.query(
      `SELECT a.* 
       FROM announcements a
       LEFT JOIN announcement_recipients ar ON a.id = ar.announcement_id
       WHERE a.target_type = 'all' OR ar.student_id = ?
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [studentId]
    );
    res.json({ success: true, announcements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// =====================================================
// GET MY COURSES
// =====================================================
router.get('/my-courses', async (req, res) => {
  try {
    const studentId = req.user.id;
    const [enrollments] = await pool.query(
      `SELECT ce.id AS enrollment_id, ce.enrolled_date, c.*, 
              COALESCE(cp.purchase_date, ce.enrolled_date) AS purchase_date,
              cp.payment_method, cp.status AS payment_status, cp.transaction_id
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       LEFT JOIN course_purchases cp ON ce.course_id = cp.course_id AND ce.student_id = cp.student_id
       WHERE ce.student_id = ? AND c.status = 'active'
       ORDER BY ce.created_at DESC`,
      [studentId]
    );

    const hydratedCourses = [];
    for (const course of enrollments) {
      const [items] = await pool.query(
        `SELECT csi.id 
         FROM course_subject_items csi
         JOIN course_subjects cs ON csi.subject_id = cs.id
         WHERE cs.course_id = ?`,
        [course.id]
      );
      
      const totalItems = items.length;
      let completedItems = 0;

      if (totalItems > 0) {
        const itemIds = items.map(it => it.id);
        const [[progress]] = await pool.query(
          `SELECT COUNT(*) AS completed_count 
           FROM student_item_progress 
           WHERE student_id = ? AND item_id IN (?) AND completed = 1`,
          [studentId, itemIds]
        );
        completedItems = progress.completed_count || 0;
      }

      const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      const [[subjectCountRes]] = await pool.query(
        'SELECT COUNT(*) AS count FROM course_subjects WHERE course_id = ?',
        [course.id]
      );

      hydratedCourses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        is_free: course.is_free,
        banner_image: course.banner_image,
        enrollment_id: course.enrollment_id,
        purchase_date: course.purchase_date || course.enrolled_date,
        payment_status: course.payment_status || 'completed',
        transaction_id: course.transaction_id || null,
        progress_percentage: progressPercentage,
        total_subjects: subjectCountRes.count || 0,
        total_items: totalItems,
        completed_items: completedItems
      });
    }

    res.json({ success: true, courses: hydratedCourses });
  } catch (err) {
    console.error('Get my courses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET COURSE PROGRESS
// =====================================================
router.get('/course/:courseId/progress', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const [enrollment] = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (!enrollment.length) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    // Get completed item counts
    const [items] = await pool.query(
      `SELECT csi.id 
       FROM course_subject_items csi
       JOIN course_subjects cs ON csi.subject_id = cs.id
       WHERE cs.course_id = ?`,
      [courseId]
    );
    
    const totalItems = items.length;
    let completedItems = 0;

    if (totalItems > 0) {
      const itemIds = items.map(it => it.id);
      const [[progressRes]] = await pool.query(
        `SELECT COUNT(*) AS completed_count 
         FROM student_item_progress 
         WHERE student_id = ? AND item_id IN (?) AND completed = 1`,
        [studentId, itemIds]
      );
      completedItems = progressRes.completed_count || 0;
    }

    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    res.json({
      success: true,
      progress: {},
      status: progressPercentage === 100 ? 'completed' : progressPercentage > 0 ? 'in_progress' : 'not_started',
      progress_percentage: progressPercentage,
      total_items: totalItems,
      completed_items: completedItems
    });
  } catch (err) {
    console.error('Get course progress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CONTINUE LEARNING
// =====================================================
router.get('/course/:courseId/continue', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const [enrollment] = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (!enrollment.length) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    // Find the first item that is not completed
    const [items] = await pool.query(
      `SELECT csi.id, sip.completed
       FROM course_subject_items csi
       JOIN course_subjects cs ON csi.subject_id = cs.id
       LEFT JOIN student_item_progress sip ON csi.id = sip.item_id AND sip.student_id = ?
       WHERE cs.course_id = ?
       ORDER BY cs.display_order ASC, csi.display_order ASC`,
      [studentId, courseId]
    );

    let nextItemId = null;
    if (items.length > 0) {
      const incomplete = items.find(it => !it.completed);
      nextItemId = incomplete ? incomplete.id : items[0].id;
    }

    res.json({
      success: true,
      nextItemId,
      progress: {}
    });
  } catch (err) {
    console.error('Continue learning error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
