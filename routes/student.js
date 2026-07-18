const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// All student routes require authentication
router.use(authenticateToken);
router.use(authorize('student'));

// =====================================================
// GET STUDENT DASHBOARD
// =====================================================
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student info
    const [[student]] = await pool.query(
      'SELECT id, student_id, name, email, mobile, course, batch, status, enrollment_date FROM students WHERE id = ?',
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get enrolled courses assigned to this student
    const [enrollments] = await pool.query(
      `SELECT
          ce.id AS enrollment_id,
          c.id AS course_id,
          c.title AS course_name,
          '' AS course_code,
          c.description,
          '30 Days' AS duration,
          c.price,
          COALESCE(img.course_thumbnail, NULL) AS thumbnail,
          COALESCE(mu.name, 'Instructor') AS instructor_name,
          COALESCE(v.total_videos, 0) AS total_videos,
          COALESCE(m.total_pdfs, 0) AS total_pdfs,
          ce.status AS enrollment_status,
          ce.progress AS progress_data,
          CASE
            WHEN ce.status = 'completed' THEN 100
            WHEN ce.status = 'in_progress' THEN 50
            ELSE 0
          END AS progress_percentage
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id AND c.status = 'active'
       LEFT JOIN master_users mu ON c.created_by = mu.id
       LEFT JOIN (
         SELECT course_id, COUNT(*) AS total_videos
         FROM youtube_videos
         WHERE status = 'active'
         GROUP BY course_id
       ) v ON v.course_id = c.id
       LEFT JOIN (
         SELECT course_id, COUNT(*) AS total_pdfs
         FROM course_materials
         WHERE status = 'active' AND file_type = 'pdf'
         GROUP BY course_id
       ) m ON m.course_id = c.id
       LEFT JOIN (
         SELECT course_id, MIN(file_path) AS course_thumbnail
         FROM course_materials
         WHERE status = 'active' AND file_type = 'image'
         GROUP BY course_id
       ) img ON img.course_id = c.id
       WHERE ce.student_id = ?
       ORDER BY ce.enrolled_date DESC`,
      [studentId]
    );

    // Get certificates
    const [certificates] = await pool.query(
      'SELECT id, certificate_type, file_path, title, issue_date FROM certificates WHERE student_id = ? AND status = ?',
      [studentId, 'active']
    );

    res.json({
      success: true,
      student,
      courses: enrollments,
      certificates
    });

  } catch (err) {
    console.error('Student Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SAVE COURSE PROGRESS
// =====================================================
router.post('/course/:courseId/progress', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;
    const { currentVideoId, completedVideoIds } = req.body;

    const [enrollmentRows] = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (!enrollmentRows.length) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    const progressData = {
      currentVideoId: currentVideoId || null,
      completedVideoIds: Array.isArray(completedVideoIds) ? completedVideoIds : [],
      updatedAt: new Date().toISOString()
    };

    await pool.query(
      'UPDATE course_enrollments SET progress = ?, status = ? WHERE student_id = ? AND course_id = ?',
      [JSON.stringify(progressData), 'in_progress', studentId, courseId]
    );

    res.json({ success: true, message: 'Progress saved', progress: progressData });
  } catch (err) {
    console.error('Save Course Progress Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET COURSE DETAILS WITH CONTENT
// =====================================================
router.get('/course/:courseId', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Verify enrollment
    const [enrollment] = await pool.query(
      'SELECT * FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (!enrollment.length) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    // Get course info
    const [[course]] = await pool.query(
      `SELECT c.*, COALESCE(mu.name, 'Instructor') AS instructor_name,
              COALESCE(img.course_thumbnail, NULL) AS thumbnail,
              COALESCE(v.total_videos, 0) AS total_videos,
              COALESCE(m.total_pdfs, 0) AS total_pdfs
       FROM courses c
       LEFT JOIN master_users mu ON c.created_by = mu.id
       LEFT JOIN (
         SELECT course_id, COUNT(*) AS total_videos
         FROM youtube_videos
         WHERE status = 'active'
         GROUP BY course_id
       ) v ON v.course_id = c.id
       LEFT JOIN (
         SELECT course_id, COUNT(*) AS total_pdfs
         FROM course_materials
         WHERE status = 'active' AND file_type = 'pdf'
         GROUP BY course_id
       ) m ON m.course_id = c.id
       LEFT JOIN (
         SELECT course_id, MIN(file_path) AS course_thumbnail
         FROM course_materials
         WHERE status = 'active' AND file_type = 'image'
         GROUP BY course_id
       ) img ON img.course_id = c.id
       WHERE c.id = ?`,
      [courseId]
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const [[enrollmentData]] = await pool.query(
      'SELECT status AS enrollment_status, progress AS progress_data FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    const [videos] = await pool.query(
      'SELECT id, title, video_url, duration, description, display_order FROM youtube_videos WHERE course_id = ? AND status = ? ORDER BY display_order',
      [courseId, 'active']
    );

    const [materials] = await pool.query(
      'SELECT id, title, file_type, file_path, description, display_order FROM course_materials WHERE course_id = ? AND status = ? ORDER BY display_order',
      [courseId, 'active']
    );

    res.json({
      success: true,
      course,
      videos,
      materials,
      enrollment: enrollmentData || {}
    });

  } catch (err) {
    console.error('Course Details Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// GET STUDENT CERTIFICATES
// =====================================================
router.get('/certificates', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, certificate_type, file_path, title, issue_date FROM certificates WHERE student_id = ? AND status = ?',
      [req.user.id, 'active']
    );
    res.json({ success: true, certificates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
