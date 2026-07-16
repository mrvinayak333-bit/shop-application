const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * PUBLIC: Get Active Courses for Home Page
 * Does not require authentication
 */
router.get('/public', async (req, res) => {
  try {
    const [courses] = await pool.query(
      "SELECT id, title as course_name, description, price, banner_image, status FROM courses WHERE status = 'active'"
    );
    res.json({ success: true, courses });
  } catch (err) {
    console.error('Public Courses Error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to load courses at this moment.' });
  }
});

module.exports = router;
