const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCourseMaterial } = require('../middleware/upload');

// =====================================================
// PUBLIC: Get All Active Courses (for listing)
// =====================================================
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,
              course_name AS title,
              course_code AS slug,
              description,
              duration AS duration_days,
              price,
              status = 'active' AS published
       FROM courses
       WHERE status = 'active'
       ORDER BY created_at DESC`
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: Course Management
// =====================================================
router.use('/manage', authenticateToken, authorize('master'));

// Get all courses (with student count)
router.get('/manage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id,
              c.course_name AS title,
              c.course_code AS slug,
              c.description,
              c.duration AS duration_days,
              c.price,
              c.status = 'active' AS published,
              c.status,
              COUNT(ce.id) AS enrolled_students
       FROM courses c
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       GROUP BY c.id ORDER BY c.created_at DESC`
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create course
router.post('/manage', async (req, res) => {
  try {
    const { course_name, course_code, description, duration, price } = req.body;
    if (!course_name) return res.status(400).json({ success: false, message: 'Course name is required' });

    const [result] = await pool.query(
      'INSERT INTO courses (course_name, course_code, description, duration, price, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [course_name, course_code, description, duration, price, req.user.id]
    );
    res.status(201).json({ success: true, message: 'Course created', courseId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update course
router.put('/manage/:id', async (req, res) => {
  try {
    const { course_name, course_code, description, duration, price, status } = req.body;
    const finalStatus = status === 'active' ? 'active' : 'inactive';
    await pool.query(
      'UPDATE courses SET course_name=?, course_code=?, description=?, duration=?, price=?, status=? WHERE id=?',
      [course_name, course_code, description, duration, price, finalStatus, req.params.id]
    );
    res.json({ success: true, message: 'Course updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete course
router.delete('/manage/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: Course Content Management
// =====================================================

// Add YouTube video to course
router.post('/manage/:courseId/video', async (req, res) => {
  try {
    const { title, video_url, duration, description, display_order } = req.body;
    await pool.query(
      'INSERT INTO youtube_videos (course_id, title, video_url, duration, description, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.courseId, title, video_url, duration, description, display_order || 0]
    );
    res.status(201).json({ success: true, message: 'Video added' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete video
router.delete('/manage/video/:videoId', async (req, res) => {
  try {
    await pool.query('DELETE FROM youtube_videos WHERE id = ?', [req.params.videoId]);
    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload course material
router.post('/manage/:courseId/material', uploadCourseMaterial.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const ext = require('path').extname(req.file.originalname).toLowerCase();
    let fileType = 'document';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) fileType = 'image';
    else if (ext === '.pdf') fileType = 'pdf';

    const subDir = fileType === 'image' ? 'images' : fileType === 'pdf' ? 'pdf' : 'documents';
    const filePath = `/uploads/courses/${subDir}/${req.file.filename}`;

    await pool.query(
      'INSERT INTO course_materials (course_id, title, file_type, file_path, description) VALUES (?, ?, ?, ?, ?)',
      [req.params.courseId, title || req.file.originalname, fileType, filePath, description || '']
    );
    res.status(201).json({ success: true, message: 'Material uploaded', filePath });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete material
router.delete('/manage/material/:materialId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_path FROM course_materials WHERE id = ?', [req.params.materialId]);
    if (rows.length > 0) {
      const fs = require('fs');
      const fp = '.' + rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query('DELETE FROM course_materials WHERE id = ?', [req.params.materialId]);
    res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: Student Enrollment Management
// =====================================================
router.get('/manage/enrollments/:courseId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ce.*, s.name, s.student_id, s.mobile
       FROM course_enrollments ce
       JOIN students s ON ce.student_id = s.id
       WHERE ce.course_id = ?`,
      [req.params.courseId]
    );
    res.json({ success: true, enrollments: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Enroll student in course
router.post('/manage/enroll', async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    await pool.query(
      'INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date) VALUES (?, ?, CURDATE())',
      [student_id, course_id]
    );
    res.json({ success: true, message: 'Student enrolled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove enrollment
router.delete('/manage/enroll/:enrollmentId', async (req, res) => {
  try {
    await pool.query('DELETE FROM course_enrollments WHERE id = ?', [req.params.enrollmentId]);
    res.json({ success: true, message: 'Enrollment removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
