const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// PUBLIC: list all active courses
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,
              title,
              '' AS slug,
              description,
              price,
              30 AS duration_days,
              status = 'active' AS published
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

// ENROLL: student enrolls in course
router.post('/:id/enroll', authenticateToken, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const courseId = req.params.id;
    await pool.query(
      'INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date, status) VALUES (?, ?, CURDATE(), ?)',
      [studentId, courseId, 'enrolled']
    );
    res.json({ success: true, message: 'Enrolled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// MASTER: CRUD courses
router.use(authenticateToken);
router.use(authorize('master'));

router.post('/', async (req, res) => {
  try {
    const { title, slug, description, price = 0, is_free = 0, duration_days = 0, published = 0 } = req.body;
    const status = published ? 'active' : 'inactive';
    const finalPrice = is_free ? 0 : price;
    const duration = duration_days ? String(duration_days) : '';
    const [result] = await pool.query(
      'INSERT INTO courses (title, description, price, status) VALUES (?,?,?,?)',
      [title, description || '', finalPrice, status]
    );
    res.status(201).json({ success: true, message: 'Course created', courseId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, price = 0, is_free = 0, duration_days = 0, published = 0 } = req.body;
    const status = published ? 'active' : 'inactive';
    const finalPrice = is_free ? 0 : price;
    const duration = duration_days ? String(duration_days) : '';
    await pool.query(
      'UPDATE courses SET title=?, description=?, price=?, status=? WHERE id=?',
      [title, description || '', finalPrice, status, req.params.id]
    );
    res.json({ success: true, message: 'Course updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// MASTER: Add modules/chapters and content (simple endpoints)
router.post('/:id/modules', async (req, res) => {
  try {
    const { title, order_index = 0 } = req.body;
    const [result] = await pool.query('INSERT INTO course_modules (course_id, title, order_index) VALUES (?,?,?)', [req.params.id, title, order_index]);
    res.status(201).json({ success: true, moduleId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/modules/:moduleId/content', async (req, res) => {
  try {
    const { type, title, url, file_path, order_index = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO course_contents (module_id, type, title, url, file_path, order_index) VALUES (?,?,?,?,?,?)',
      [req.params.moduleId, type, title || '', url || null, file_path || null, order_index]
    );
    res.status(201).json({ success: true, contentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ENROLL: student enrolls in course (master can also assign)
router.post('/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const courseId = req.params.id;
    await pool.query(
      'INSERT INTO course_enrollments (student_id, course_id, enrolled_date, status) VALUES (?, ?, CURDATE(), ?)',
      [studentId, courseId, 'enrolled']
    );
    res.json({ success: true, message: 'Enrolled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
