const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// PUBLIC: list all active courses
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, price, is_free, banner_image, status FROM courses WHERE status = "active" ORDER BY created_at DESC'
    );
    res.json({ success: true, courses: rows });
  } catch (err) {
    console.error('Public get courses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
