const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCourseMaterial } = require('../middleware/upload');

// =====================================================
// PUBLIC: Get All Active Courses (for Store / listing)
// =====================================================
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, description, price, thumbnail, is_free, status 
       FROM courses 
       WHERE status = 'active' 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER / ADMIN: Course & Content Management
// =====================================================
router.use('/manage', authenticateToken, authorize('master', 'admin'));

// Get all courses (with student counts)
router.get('/manage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(ce.id) AS enrolled_students 
       FROM courses c 
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
       GROUP BY c.id 
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create course (with banner upload)
router.post('/manage', uploadCourseMaterial.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, price, is_free, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Course title is required' });

    let thumbnailPath = null;
    if (req.file) {
      thumbnailPath = `/uploads/courses/images/${req.file.filename}`;
    }

    const [result] = await pool.query(
      `INSERT INTO courses (title, description, price, is_free, thumbnail, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title, 
        description || '', 
        parseFloat(price) || 0.00, 
        parseInt(is_free) === 1 ? 1 : 0, 
        thumbnailPath, 
        status === 'inactive' ? 'inactive' : 'active'
      ]
    );

    res.status(201).json({ success: true, message: 'Course created successfully', courseId: result.insertId });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update course details
const handleUpdateCourse = async (req, res) => {
  try {
    const { title, description, price, is_free, status } = req.body;
    const courseId = req.params.id;

    const [[existing]] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!existing) return res.status(404).json({ success: false, message: 'Course not found' });

    const updateFields = [];
    const params = [];

    if (title !== undefined) { updateFields.push('title = ?'); params.push(title); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (price !== undefined) { updateFields.push('price = ?'); params.push(parseFloat(price) || 0.00); }
    if (is_free !== undefined) { updateFields.push('is_free = ?'); params.push(parseInt(is_free) === 1 ? 1 : 0); }
    if (status !== undefined) { updateFields.push('status = ?'); params.push(status === 'inactive' ? 'inactive' : 'active'); }

    if (req.file) {
      const thumbnailPath = `/uploads/courses/images/${req.file.filename}`;
      updateFields.push('thumbnail = ?');
      params.push(thumbnailPath);
    }

    if (updateFields.length > 0) {
      params.push(courseId);
      await pool.query(`UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true, message: 'Course updated successfully' });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

router.put('/manage/:id', uploadCourseMaterial.single('thumbnail'), handleUpdateCourse);
router.post('/manage/:id', uploadCourseMaterial.single('thumbnail'), handleUpdateCourse);

// Delete course
router.delete('/manage/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUBJECTS MANAGEMENT
// =====================================================

// Get all subjects for a course
router.get('/manage/:courseId/subjects', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM course_subjects WHERE course_id = ? ORDER BY display_order ASC, id ASC',
      [req.params.courseId]
    );
    res.json({ success: true, subjects: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add subject under course
router.post('/manage/:courseId/subject', async (req, res) => {
  try {
    const { title, display_order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Subject title is required' });

    const [result] = await pool.query(
      'INSERT INTO course_subjects (course_id, title, display_order) VALUES (?, ?, ?)',
      [req.params.courseId, title, display_order || 0]
    );

    res.status(201).json({ success: true, message: 'Subject added', subjectId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Subject
router.put('/manage/subject/:subjectId', async (req, res) => {
  try {
    const { title, display_order } = req.body;
    const updateFields = [];
    const params = [];

    if (title !== undefined) { updateFields.push('title = ?'); params.push(title); }
    if (display_order !== undefined) { updateFields.push('display_order = ?'); params.push(display_order); }

    if (updateFields.length === 0) return res.json({ success: true, message: 'No updates' });

    params.push(req.params.subjectId);
    await pool.query(`UPDATE course_subjects SET ${updateFields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Subject updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Subject
router.delete('/manage/subject/:subjectId', async (req, res) => {
  try {
    await pool.query('DELETE FROM course_subjects WHERE id = ?', [req.params.subjectId]);
    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUBJECT ITEMS MANAGEMENT
// =====================================================

// Get items for a subject
router.get('/manage/subject/:subjectId/items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM course_subject_items WHERE subject_id = ? ORDER BY display_order ASC, id ASC',
      [req.params.subjectId]
    );
    res.json({ success: true, items: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add item to subject
router.post('/manage/subject/:subjectId/item', uploadCourseMaterial.single('file'), async (req, res) => {
  try {
    const { title, type, youtube_url, display_order } = req.body;
    const subjectId = req.params.subjectId;

    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Title and type are required' });
    }

    let filePath = null;
    if (req.file) {
      const ext = require('path').extname(req.file.originalname).toLowerCase();
      const subDir = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) 
        ? 'images' 
        : ext === '.pdf' 
          ? 'pdf' 
          : ['.mp4', '.webm', '.ogg', '.mov', '.3gp', '.mkv'].includes(ext)
            ? 'videos'
            : 'documents';
      filePath = `/uploads/courses/${subDir}/${req.file.filename}`;
    }

    const [result] = await pool.query(
      `INSERT INTO course_subject_items (subject_id, title, type, file_path, youtube_url, display_order) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subjectId, title, type, filePath, youtube_url || null, display_order || 0]
    );

    res.status(201).json({ success: true, message: 'Subject item added successfully', itemId: result.insertId });
  } catch (err) {
    console.error('Add subject item error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Subject Item
router.put('/manage/subject-item/:itemId', uploadCourseMaterial.single('file'), async (req, res) => {
  try {
    const { title, youtube_url, display_order } = req.body;
    const itemId = req.params.itemId;

    const updateFields = [];
    const params = [];

    if (title !== undefined) { updateFields.push('title = ?'); params.push(title); }
    if (youtube_url !== undefined) { updateFields.push('youtube_url = ?'); params.push(youtube_url || null); }
    if (display_order !== undefined) { updateFields.push('display_order = ?'); params.push(display_order); }

    if (req.file) {
      const ext = require('path').extname(req.file.originalname).toLowerCase();
      const subDir = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) 
        ? 'images' 
        : ext === '.pdf' 
          ? 'pdf' 
          : ['.mp4', '.webm', '.ogg', '.mov', '.3gp', '.mkv'].includes(ext)
            ? 'videos'
            : 'documents';
      const filePath = `/uploads/courses/${subDir}/${req.file.filename}`;
      updateFields.push('file_path = ?');
      params.push(filePath);
    }

    if (updateFields.length > 0) {
      params.push(itemId);
      await pool.query(`UPDATE course_subject_items SET ${updateFields.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true, message: 'Subject item updated successfully' });
  } catch (err) {
    console.error('Update subject item error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Subject Item
router.delete('/manage/subject-item/:itemId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_path FROM course_subject_items WHERE id = ?', [req.params.itemId]);
    if (rows.length > 0 && rows[0].file_path) {
      const fs = require('fs');
      const fp = '.' + rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query('DELETE FROM course_subject_items WHERE id = ?', [req.params.itemId]);
    res.json({ success: true, message: 'Subject item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// BULK COURSE ASSIGNMENT
// =====================================================
router.post('/manage/assign', async (req, res) => {
  try {
    const { studentIds, courseIds } = req.body;

    if (!Array.isArray(studentIds) || !Array.isArray(courseIds) || studentIds.length === 0 || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Student IDs and Course IDs are required lists' });
    }

    let assignedCount = 0;

    for (const studentId of studentIds) {
      const [[student]] = await pool.query('SELECT name FROM students WHERE id = ?', [studentId]);
      if (!student) continue;

      for (const courseId of courseIds) {
        const [[course]] = await pool.query('SELECT COALESCE(title, course_name) as title FROM courses WHERE id = ?', [courseId]);
        if (!course) continue;

        // Check if enrollment already exists
        const [existing] = await pool.query(
          'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
          [studentId, courseId]
        );

        if (existing.length === 0) {
          await pool.query(
            `INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date, status) 
             VALUES (?, ?, CURDATE(), 'enrolled')`,
            [studentId, courseId]
          );

          assignedCount++;

          // Insert Notification for student
          try {
            await pool.query(
              `INSERT INTO notifications (user_id, user_role, title, message, type) 
               VALUES (?, ?, ?, ?, 'system')`,
              [studentId, 'student', 'New Course Assigned', `Course "${course.title}" has been assigned to you.`, 'system']
            );
          } catch (notifErr) {
            console.warn('Notification log skip:', notifErr.message);
          }
        }
      }
    }

    res.json({ success: true, message: 'Courses Assigned Successfully', assignedCount });
  } catch (err) {
    console.error('Bulk assignment error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// =====================================================
// COURSE PURCHASES APPROVALS
// =====================================================

// Get all purchase requests
router.get('/manage/purchases', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, 
              COALESCE(s.name, CONCAT('Student #', cp.student_id)) as student_name, 
              COALESCE(s.student_id, CAST(cp.student_id AS CHAR), 'N/A') as student_code, 
              COALESCE(c.title, c.course_name, CONCAT('Course #', cp.course_id)) as course_name 
       FROM course_purchases cp 
       LEFT JOIN students s ON (cp.student_id = s.id OR cp.student_id = s.student_id)
       LEFT JOIN courses c ON cp.course_id = c.id 
       ORDER BY cp.created_at DESC`
    );
    res.json({ success: true, purchases: rows });
  } catch (err) {
    console.error('Fetch Purchases Error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Master: Record manual purchase for student
router.post('/manage/purchases/manual', async (req, res) => {
  try {
    const { student_id, course_id, amount_paid, payment_method, status } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'Student and course are required' });
    }

    const [[courseObj]] = await pool.query('SELECT id, price, COALESCE(title, course_name) as title FROM courses WHERE id = ?', [course_id]);
    if (!courseObj) return res.status(404).json({ success: false, message: 'Course not found' });

    const finalStatus = status || 'approved';
    const amount = amount_paid !== undefined ? parseFloat(amount_paid) : parseFloat(courseObj.price || 0);

    const [result] = await pool.query(
      `INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, status)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, course_id, amount, payment_method || 'manual', finalStatus]
    );

    if (finalStatus === 'approved') {
      await pool.query(
        'INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date, status) VALUES (?, ?, CURDATE(), ?)',
        [student_id, course_id, 'enrolled']
      );
    }

    res.status(201).json({ success: true, message: 'Purchase recorded successfully', purchaseId: result.insertId });
  } catch (err) {
    console.error('Manual purchase error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve / Reject purchase request
router.put('/manage/purchases/:purchaseId', async (req, res) => {
  try {
    const purchaseId = req.params.purchaseId;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [[purchase]] = await pool.query('SELECT * FROM course_purchases WHERE id = ?', [purchaseId]);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase request not found' });

    // Update purchase status
    await pool.query('UPDATE course_purchases SET status = ? WHERE id = ?', [status, purchaseId]);

    const [[course]] = await pool.query('SELECT COALESCE(title, course_name) as title FROM courses WHERE id = ?', [purchase.course_id]);

    if (status === 'approved') {
      // Check enrollment
      const [existing] = await pool.query(
        'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
        [purchase.student_id, purchase.course_id]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO course_enrollments (student_id, course_id, enrolled_date, status) 
           VALUES (?, ?, CURDATE(), 'enrolled')`,
          [purchase.student_id, purchase.course_id]
        );
      }

      // Notify student
      await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type) 
         VALUES (?, 'student', 'Purchase Approved', ?, 'system')`,
        [purchase.student_id, `Your purchase for course "${course ? course.title : 'Course'}" has been approved.`]
      );
    } else {
      // Notify student of rejection
      await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type) 
         VALUES (?, 'student', 'Purchase Rejected', ?, 'system')`,
        [purchase.student_id, `Your purchase request for course "${course ? course.title : 'Course'}" has been rejected.`]
      );
    }

    res.json({ success: true, message: `Purchase request status updated to ${status}` });
  } catch (err) {
    console.error('Approve/Reject purchase error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
