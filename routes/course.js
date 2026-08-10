const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCourseMaterial } = require('../middleware/upload');

// Helper: extract YouTube video ID from any URL
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?v=([^&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1] && m[1].length === 11) return m[1];
  }
  return null;
}

// Helper: build file path from uploaded file
function buildFilePath(file) {
  if (!file) return null;
  const path = require('path');
  const ext = path.extname(file.originalname).toLowerCase();
  let subDir = 'documents';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) subDir = 'images';
  else if (ext === '.pdf') subDir = 'pdf';
  else if (['.mp4', '.webm', '.ogg', '.mov', '.3gp', '.mkv'].includes(ext)) subDir = 'videos';
  else if (['.zip', '.rar', '.7z'].includes(ext)) subDir = 'zip';
  return `/uploads/courses/${subDir}/${file.filename}`;
}

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

// Get all courses (with student counts + material counts)
router.get('/manage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, 
              COUNT(DISTINCT ce.id) AS enrolled_students,
              COUNT(DISTINCT csi.id) AS total_materials
       FROM courses c 
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
       LEFT JOIN course_subjects cs ON cs.course_id = c.id
       LEFT JOIN course_subject_items csi ON csi.subject_id = cs.id
       GROUP BY c.id 
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── LMS ANALYTICS ──
router.get('/manage/analytics', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT cs.id) as total_subjects,
        COUNT(DISTINCT csi.id) as total_materials,
        SUM(CASE WHEN csi.material_type IN ('youtube','video') THEN 1 ELSE 0 END) as total_videos,
        SUM(CASE WHEN csi.material_type = 'pdf' THEN 1 ELSE 0 END) as total_pdfs,
        SUM(CASE WHEN csi.material_type = 'notes' THEN 1 ELSE 0 END) as total_notes,
        SUM(CASE WHEN csi.material_type IN ('zip','link') THEN 1 ELSE 0 END) as total_files,
        COUNT(DISTINCT ce.id) as total_enrollments,
        COUNT(DISTINCT ce.student_id) as total_students
      FROM courses c
      LEFT JOIN course_subjects cs ON cs.course_id = c.id
      LEFT JOIN course_subject_items csi ON csi.subject_id = cs.id
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id
    `);

    // Most viewed material
    const [[mostViewed]] = await pool.query(`
      SELECT csi.title, csi.material_type, csi.view_count 
      FROM course_subject_items csi 
      ORDER BY csi.view_count DESC LIMIT 1
    `);

    // Average completion per course
    const [completionStats] = await pool.query(`
      SELECT c.title, c.id,
        COUNT(DISTINCT ce.student_id) as students,
        ROUND(AVG(CASE WHEN ce.status = 'completed' THEN 100 ELSE 
          COALESCE((
            SELECT ROUND(COUNT(*) * 100.0 / NULLIF((
              SELECT COUNT(*) FROM course_subject_items ci2 
              JOIN course_subjects cs2 ON ci2.subject_id = cs2.id WHERE cs2.course_id = c.id
            ), 0))
            FROM student_item_progress sip 
            JOIN course_subject_items ci3 ON sip.item_id = ci3.id
            JOIN course_subjects cs3 ON ci3.subject_id = cs3.id
            WHERE cs3.course_id = c.id AND sip.student_id = ce.student_id AND sip.completed = 1
          ), 0)
        END), 1) as avg_completion
      FROM courses c
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id
      GROUP BY c.id
      ORDER BY students DESC
    `);

    res.json({ success: true, totals, mostViewed: mostViewed || null, completionStats });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create course (with banner upload)
router.post('/manage', uploadCourseMaterial.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, price, is_free, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Course title is required' });

    let thumbnailPath = null;
    if (req.file) thumbnailPath = buildFilePath(req.file);

    const [result] = await pool.query(
      `INSERT INTO courses (title, description, price, is_free, thumbnail, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || '', parseFloat(price) || 0.00, parseInt(is_free) === 1 ? 1 : 0, thumbnailPath, status === 'inactive' ? 'inactive' : 'active']
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
      updateFields.push('thumbnail = ?');
      params.push(buildFilePath(req.file));
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SUBJECTS MANAGEMENT
// =====================================================
router.get('/manage/:courseId/subjects', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cs.*, COUNT(csi.id) as item_count 
       FROM course_subjects cs
       LEFT JOIN course_subject_items csi ON csi.subject_id = cs.id
       WHERE cs.course_id = ? 
       GROUP BY cs.id
       ORDER BY cs.display_order ASC, cs.id ASC`,
      [req.params.courseId]
    );
    res.json({ success: true, subjects: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add subject
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
// SUBJECT ITEMS (MATERIALS) MANAGEMENT
// =====================================================

// Get items for a subject with full material details
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

// Add material item to subject (supports all 6 types)
router.post('/manage/subject/:subjectId/item', uploadCourseMaterial.single('file'), async (req, res) => {
  try {
    const { 
      title, type, material_type, youtube_url, display_order,
      description, notes_content, external_url, duration_minutes
    } = req.body;
    const subjectId = req.params.subjectId;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Determine effective material type
    const effectiveType = material_type || type || 'notes';

    // Extract and validate YouTube ID if needed
    let youtubeEmbedUrl = null;
    let videoId = null;
    if (effectiveType === 'youtube' && youtube_url) {
      videoId = extractYouTubeId(youtube_url);
      if (!videoId) {
        return res.status(400).json({ success: false, message: 'Invalid YouTube URL. Please use a valid youtu.be or youtube.com URL.' });
      }
      youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1`;
    }

    // Build file path
    let filePath = null;
    if (req.file) filePath = buildFilePath(req.file);

    const [result] = await pool.query(
      `INSERT INTO course_subject_items 
       (subject_id, title, type, material_type, file_path, youtube_url, youtube_embed_url, 
        description, notes_content, external_url, duration_minutes, display_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subjectId, title,
        effectiveType, // legacy type field
        effectiveType, // new material_type field
        filePath,
        youtube_url || null,
        youtubeEmbedUrl,
        description || null,
        notes_content || null,
        external_url || null,
        parseFloat(duration_minutes) || 0,
        parseInt(display_order) || 0
      ]
    );

    res.status(201).json({ success: true, message: 'Material added successfully', itemId: result.insertId });
  } catch (err) {
    console.error('Add material error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Update Material Item
router.put('/manage/subject-item/:itemId', uploadCourseMaterial.single('file'), async (req, res) => {
  try {
    const {
      title, youtube_url, display_order, description, 
      notes_content, external_url, duration_minutes, material_type
    } = req.body;
    const itemId = req.params.itemId;

    const updateFields = [];
    const params = [];

    if (title !== undefined) { updateFields.push('title = ?'); params.push(title); }
    if (display_order !== undefined) { updateFields.push('display_order = ?'); params.push(parseInt(display_order) || 0); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (notes_content !== undefined) { updateFields.push('notes_content = ?'); params.push(notes_content); }
    if (external_url !== undefined) { updateFields.push('external_url = ?'); params.push(external_url || null); }
    if (duration_minutes !== undefined) { updateFields.push('duration_minutes = ?'); params.push(parseFloat(duration_minutes) || 0); }
    if (material_type !== undefined) { 
      updateFields.push('material_type = ?'); params.push(material_type);
      updateFields.push('type = ?'); params.push(material_type);
    }

    if (youtube_url !== undefined) {
      updateFields.push('youtube_url = ?'); params.push(youtube_url || null);
      if (youtube_url) {
        const videoId = extractYouTubeId(youtube_url);
        const embed = videoId 
          ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1`
          : null;
        updateFields.push('youtube_embed_url = ?'); params.push(embed);
      }
    }

    if (req.file) {
      updateFields.push('file_path = ?');
      params.push(buildFilePath(req.file));
    }

    if (updateFields.length > 0) {
      params.push(itemId);
      await pool.query(`UPDATE course_subject_items SET ${updateFields.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true, message: 'Material updated successfully' });
  } catch (err) {
    console.error('Update material error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Material Item (also removes file from disk)
router.delete('/manage/subject-item/:itemId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_path FROM course_subject_items WHERE id = ?', [req.params.itemId]);
    if (rows.length > 0 && rows[0].file_path) {
      const fs = require('fs');
      const fp = '.' + rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query('DELETE FROM course_subject_items WHERE id = ?', [req.params.itemId]);
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Increment view count on material access
router.post('/manage/subject-item/:itemId/view', async (req, res) => {
  try {
    await pool.query('UPDATE course_subject_items SET view_count = view_count + 1 WHERE id = ?', [req.params.itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Validate YouTube URL (public, no auth)
router.post('/validate-youtube', (req, res) => {
  const { url } = req.body;
  const videoId = extractYouTubeId(url);
  if (!videoId) return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
  res.json({
    success: true,
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  });
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
        const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);
        if (!course) continue;

        const [existing] = await pool.query(
          'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
          [studentId, courseId]
        );

        if (existing.length === 0) {
          await pool.query(
            `INSERT IGNORE INTO course_enrollments (student_id, course_id, status) VALUES (?, ?, 'enrolled')`,
            [studentId, courseId]
          );
          assignedCount++;

          try {
            await pool.query(
              `INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, 'system')`,
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
router.get('/manage/purchases', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, 
              COALESCE(s.name, CONCAT('Student #', cp.student_id)) as student_name, 
              COALESCE(s.student_id, CAST(cp.student_id AS CHAR), 'N/A') as student_code, 
              COALESCE(c.title, CONCAT('Course #', cp.course_id)) as course_name 
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

router.post('/manage/purchases/manual', async (req, res) => {
  try {
    const { student_id, course_id, amount_paid, payment_method, status } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'Student and course are required' });
    }

    const [[courseObj]] = await pool.query('SELECT id, price, title FROM courses WHERE id = ?', [course_id]);
    if (!courseObj) return res.status(404).json({ success: false, message: 'Course not found' });

    const finalStatus = status || 'approved';
    const amount = amount_paid !== undefined ? parseFloat(amount_paid) : parseFloat(courseObj.price || 0);

    const [result] = await pool.query(
      `INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, status) VALUES (?, ?, ?, ?, ?)`,
      [student_id, course_id, amount, payment_method || 'manual', finalStatus]
    );

    if (finalStatus === 'approved') {
      await pool.query(
        'INSERT IGNORE INTO course_enrollments (student_id, course_id, status) VALUES (?, ?, ?)',
        [student_id, course_id, 'enrolled']
      );
    }

    res.status(201).json({ success: true, message: 'Purchase recorded successfully', purchaseId: result.insertId });
  } catch (err) {
    console.error('Manual purchase error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/manage/purchases/:purchaseId', async (req, res) => {
  try {
    const purchaseId = req.params.purchaseId;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [[purchase]] = await pool.query('SELECT * FROM course_purchases WHERE id = ?', [purchaseId]);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase request not found' });

    await pool.query('UPDATE course_purchases SET status = ? WHERE id = ?', [status, purchaseId]);

    const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [purchase.course_id]);

    if (status === 'approved') {
      const [existing] = await pool.query(
        'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
        [purchase.student_id, purchase.course_id]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO course_enrollments (student_id, course_id, status) VALUES (?, ?, 'enrolled')`,
          [purchase.student_id, purchase.course_id]
        );
      }

      await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, 'student', 'Purchase Approved', ?, 'system')`,
        [purchase.student_id, `Your purchase for course "${course ? course.title : 'Course'}" has been approved.`]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, 'student', 'Purchase Rejected', ?, 'system')`,
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
