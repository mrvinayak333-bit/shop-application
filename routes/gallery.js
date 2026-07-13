const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/upload');

// =====================================================
// PUBLIC: Get Gallery Images for Home/Login Pages
// =====================================================
router.get('/public', async (req, res) => {
  try {
    const { page } = req.query;
    let query = "SELECT id, title, image_path, alt_text, display_order FROM gallery_images WHERE status = 'active'";
    const params = [];

    if (page && page !== 'all') {
      query += ' AND (page_location = ? OR page_location = ?)';
      params.push(page, 'all');
    }

    query += ' ORDER BY display_order ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, images: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: Gallery Management (Requires Master Auth)
// =====================================================
router.use('/manage', authenticateToken, authorize('master'));

router.get('/manage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM gallery_images ORDER BY display_order ASC'
    );
    res.json({ success: true, images: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload slider image
router.post('/manage', uploadGallery.single('image'), async (req, res) => {
  try {
    const { title, alt_text, page_location, display_order } = req.body;
    const imagePath = '/uploads/gallery/' + req.file.filename;

    const [result] = await pool.query(
      'INSERT INTO gallery_images (title, image_path, alt_text, page_location, display_order, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title || '', imagePath, alt_text || '', page_location || 'home', display_order || 0, req.user.id]
    );

    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [req.user.id, 'master', 'UPLOAD_GALLERY', `Gallery image uploaded: ${title}`]
    );

    res.status(201).json({ success: true, message: 'Gallery image uploaded', imageId: result.insertId, imagePath });

  } catch (err) {
    console.error('Gallery Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// Update gallery image
router.put('/manage/:id', async (req, res) => {
  try {
    const { title, alt_text, page_location, display_order, status } = req.body;
    await pool.query(
      'UPDATE gallery_images SET title = ?, alt_text = ?, page_location = ?, display_order = ?, status = ? WHERE id = ?',
      [title, alt_text, page_location, display_order, status, req.params.id]
    );
    res.json({ success: true, message: 'Gallery image updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete gallery image
router.delete('/manage/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT image_path FROM gallery_images WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const fs = require('fs');
      const filePath = '.' + rows[0].image_path;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM gallery_images WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Gallery image deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
