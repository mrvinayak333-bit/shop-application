const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE (user_id=? AND user_role=?) OR (user_role=?) ORDER BY created_at DESC LIMIT 100',
      [req.user.id, req.user.role, 'all']
    );
    res.json({ success: true, notifications: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Mark as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Send notification
router.post('/send', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { user_id, user_role, title, message, type, sent_via } = req.body;
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type, sent_via) VALUES (?,?,?,?,?,?)',
      [user_id || null, user_role || 'all', title, message, type || 'system', sent_via || 'system']
    );
    res.status(201).json({ success: true, message: 'Notification sent' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Get all notifications
router.get('/all', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200');
    res.json({ success: true, notifications: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
