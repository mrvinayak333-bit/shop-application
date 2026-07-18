const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

// All master routes require master authentication
router.use(authenticateToken);
router.use(authorize('master'));

// =====================================================
// DASHBOARD STATS
// =====================================================
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ totalCustomers }]] = await pool.query('SELECT COUNT(*) as totalCustomers FROM customers');
    const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) as totalStudents FROM students');
    const [[{ totalAdmins }]] = await pool.query('SELECT COUNT(*) as totalAdmins FROM admins');
    const [[{ totalTechnicians }]] = await pool.query('SELECT COUNT(*) as totalTechnicians FROM technicians');
    const [[{ totalRepairs }]] = await pool.query('SELECT COUNT(*) as totalRepairs FROM repair_requests');
    const [[{ pendingRepairs }]] = await pool.query("SELECT COUNT(*) as pendingRepairs FROM repair_requests WHERE status != 'delivered' AND status != 'cancelled'");
    const [[{ totalRevenue }]] = await pool.query('SELECT COALESCE(SUM(paid_amount), 0) as totalRevenue FROM invoices');
    const [[{ totalCourses }]] = await pool.query('SELECT COUNT(*) as totalCourses FROM courses WHERE status = ?', ['active']);

    // Recent repairs
    const [recentRepairs] = await pool.query(
      `SELECT rr.tracking_number, rr.device_type, rr.brand, rr.status, c.name as customer_name, rr.created_at
       FROM repair_requests rr
       JOIN customers c ON rr.customer_id = c.id
       ORDER BY rr.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      stats: {
        totalCustomers, totalStudents, totalAdmins, totalTechnicians,
        totalRepairs, pendingRepairs, totalRevenue, totalCourses,
        recentRepairs
      }
    });

  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CUSTOMER MANAGEMENT
// =====================================================
router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, mobile, city, status, total_repairs, created_at FROM customers ORDER BY created_at DESC'
    );
    res.json({ success: true, customers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' });
    delete rows[0].password;
    res.json({ success: true, customer: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, email, mobile, address, city, state, pincode, status, password } = req.body;
    let query = 'UPDATE customers SET name=?, email=?, mobile=?, address=?, city=?, state=?, pincode=?, status=?';
    let params = [name, email, mobile, address, city, state, pincode, status];
    if (password) { query += ', password=?'; params.push(await bcrypt.hash(password, 10)); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await pool.query(query, params);
    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Customer Update Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// STUDENT MANAGEMENT
// =====================================================
router.get('/students', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, student_id, name, email, mobile, course, batch, status, enrollment_date, created_at FROM students ORDER BY created_at DESC'
    );
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/students', async (req, res) => {
  try {
    const { student_id, name, password, email, mobile, course, batch } = req.body;

    if (!student_id || !name || !password) {
      return res.status(400).json({ success: false, message: 'Student ID, name and password are required' });
    }

    // Check if student_id exists
    const [existing] = await pool.query('SELECT id FROM students WHERE student_id = ?', [student_id]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Student ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO students (student_id, name, password, email, mobile, course, batch, created_by, enrollment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
      [student_id, name, hashedPassword, email || null, mobile || null, course || null, batch || null, req.user.id]
    );

    // If course specified, auto-enroll by matching the course name or code
    if (course) {
      const normalizedCourse = course.trim().toLowerCase();
      const tokens = normalizedCourse.split(/\s+/).filter(word => word.length > 2);
      let query = `SELECT id FROM courses
                   WHERE status = 'active' AND (
                     title = ?`;
      const params = [course];

      for (const token of tokens) {
        query += ' OR LOWER(title) LIKE ?';
        params.push(`%${token}%`);
      }

      query += ') LIMIT 1';

      const [courseRows] = await pool.query(query, params);
      if (courseRows.length > 0) {
        await pool.query(
          'INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date, status) VALUES (?, ?, CURDATE(), ?)',
          [result.insertId, courseRows[0].id, 'enrolled']
        );
      }
    }

    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [req.user.id, 'master', 'CREATE_STUDENT', `Student ${name} (${student_id}) created`]
    );

    res.status(201).json({ success: true, message: 'Student created successfully', studentId: result.insertId });

  } catch (err) {
    console.error('Student Create Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const { name, email, mobile, course, batch, status, password } = req.body;

    let updateQuery = 'UPDATE students SET name = ?, email = ?, mobile = ?, course = ?, batch = ?, status = ?';
    let params = [name, email, mobile, course, batch, status];

    if (password) {
      updateQuery += ', password = ?';
      params.push(await bcrypt.hash(password, 10));
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(updateQuery, params);

    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [req.user.id, 'master', 'UPDATE_STUDENT', `Student ID ${req.params.id} updated`]
    );

    res.json({ success: true, message: 'Student updated successfully' });

  } catch (err) {
    console.error('Student Update Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [req.user.id, 'master', 'DELETE_STUDENT', `Student ID ${req.params.id} deleted`]
    );
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// ADMIN MANAGEMENT
// =====================================================
router.get('/admins', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, mobile, status, last_login, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json({ success: true, admins: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admins', async (req, res) => {
  try {
    const { name, email, password, mobile, alternate_mobile, aadhar_number, aadhar_photo, bank_account, bank_ifsc, commission_type, commission_amount } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Admin email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO admins (name, email, password, mobile, alternate_mobile, aadhar_number, aadhar_photo, bank_account, bank_ifsc, commission_type, commission_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [name, email, hashedPassword, mobile, alternate_mobile || null, aadhar_number || null, aadhar_photo || null, bank_account || null, bank_ifsc || null, commission_type || null, commission_amount || 0, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Admin created successfully!', admin: { id: result.insertId, email } });
  } catch (err) {
    console.error('Admin Create Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/admins/:id', async (req, res) => {
  try {
    const { name, mobile, alternate_mobile, status, aadhar_number, bank_account, bank_ifsc, commission_type, commission_amount, password } = req.body;
    let query = 'UPDATE admins SET name=?, mobile=?, alternate_mobile=?, status=?, aadhar_number=?, bank_account=?, bank_ifsc=?, commission_type=?, commission_amount=?';
    let params = [name, mobile, alternate_mobile || null, status, aadhar_number || null, bank_account || null, bank_ifsc || null, commission_type || null, commission_amount || 0];
    if (password) { query += ', password=?'; params.push(await bcrypt.hash(password, 10)); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await pool.query(query, params);
    res.json({ success: true, message: 'Admin updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// TECHNICIAN MANAGEMENT
// =====================================================
router.get('/technicians', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, mobile, specialization, experience, status, commission_percent,
              total_repairs, rating, last_login, created_at FROM technicians ORDER BY created_at DESC`
    );
    res.json({ success: true, technicians: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/technicians', async (req, res) => {
  try {
    const { name, email, password, mobile, specialization, experience, commission_percent } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM technicians WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Technician email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO technicians (name, email, password, mobile, specialization, experience, commission_percent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, mobile, specialization, experience, commission_percent || 0, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Technician created successfully' });
  } catch (err) {
    console.error('Technician Create Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/technicians/:id', async (req, res) => {
  try {
    const { name, mobile, specialization, experience, commission_percent, status, password } = req.body;
    let query = 'UPDATE technicians SET name = ?, mobile = ?, specialization = ?, experience = ?, commission_percent = ?, status = ?';
    let params = [name, mobile, specialization, experience, commission_percent, status];
    if (password) { query += ', password = ?'; params.push(await bcrypt.hash(password, 10)); }
    query += ' WHERE id = ?'; params.push(req.params.id);
    await pool.query(query, params);
    res.json({ success: true, message: 'Technician updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/technicians/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM technicians WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Technician deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// SETTINGS MANAGEMENT
// =====================================================
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY id');
    res.json({ success: true, settings: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // Array of {key, value}
    for (const s of settings) {
      await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [s.value, s.key]);
    }
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload Logo
router.post('/upload-logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    const logoPath = '/uploads/logos/' + req.file.filename;
    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [logoPath, 'logo_path']);
    res.json({ success: true, logoPath, message: 'Logo uploaded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// ACTIVITY LOGS
// =====================================================
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const [rows] = await pool.query(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?', [parseInt(limit)]
    );
    res.json({ success: true, logs: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// REPORTS - Customer, Admin Performance, Monthly Income
// =====================================================
router.get('/reports/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.email, c.mobile, c.city, c.total_repairs, c.created_at,
              COUNT(rr.id) as repair_count,
              COALESCE(SUM(i.paid_amount), 0) as total_spent
       FROM customers c
       LEFT JOIN repair_requests rr ON c.id = rr.customer_id
       LEFT JOIN invoices i ON rr.id = i.repair_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, report: rows, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/reports/admin-performance', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.email, a.mobile, a.status, a.last_login,
              COUNT(DISTINCT rr.id) as total_repairs_managed,
              COALESCE(SUM(i.paid_amount), 0) as revenue_generated,
              a.created_at
       FROM admins a
       LEFT JOIN repair_requests rr ON a.id = rr.assigned_admin
       LEFT JOIN invoices i ON rr.id = i.repair_id
       GROUP BY a.id
       ORDER BY revenue_generated DESC`
    );
    res.json({ success: true, report: rows, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/reports/monthly-income', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const [rows] = await pool.query(
      `SELECT 
        MONTH(created_at) as month,
        COUNT(*) as total_invoices,
        COALESCE(SUM(paid_amount), 0) as total_income,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END), 0) as cash_income,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN paid_amount ELSE 0 END), 0) as upi_income,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN paid_amount ELSE 0 END), 0) as card_income
       FROM invoices
       WHERE YEAR(created_at) = ?
       GROUP BY MONTH(created_at)
       ORDER BY month`,
      [year]
    );
    res.json({ success: true, report: rows, year, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// PAYMENT METHODS MANAGEMENT
// =====================================================
router.get('/payment-methods', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods ORDER BY id');
    res.json({ success: true, methods: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/payment-methods', async (req, res) => {
  try {
    const { name, type, is_active,upi_id, bank_account, ifsc_code } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'Name and type required' });
    
    const [result] = await pool.query(
      'INSERT INTO payment_methods (name, type, is_active,upi_id, bank_account, ifsc_code) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, is_active !== undefined ? is_active : 1,upi_id || null, bank_account || null, ifsc_code || null]
    );
    res.status(201).json({ success: true, message: 'Payment method added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/payment-methods/:id', async (req, res) => {
  try {
    const { name, type, is_active,upi_id, bank_account, ifsc_code } = req.body;
    await pool.query(
      'UPDATE payment_methods SET name=?, type=?, is_active=?,upi_id=?, bank_account=?, ifsc_code=? WHERE id=?',
      [name, type, is_active,upi_id || null, bank_account || null, ifsc_code || null, req.params.id]
    );
    res.json({ success: true, message: 'Payment method updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/payment-methods/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM payment_methods WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// WEBSITE SETTINGS - Gallery, Slider, Icons
// =====================================================
router.get('/website-settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM website_settings ORDER BY id');
    res.json({ success: true, settings: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/website-settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ success: false, message: 'Key and value required' });
    
    const [existing] = await pool.query('SELECT id FROM website_settings WHERE setting_key = ?', [key]);
    if (existing.length > 0) {
      await pool.query('UPDATE website_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    } else {
      await pool.query('INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
    }
    res.json({ success: true, message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/website-settings/bulk', async (req, res) => {
  try {
    const { settings } = req.body;
    for (const s of settings) {
      const [existing] = await pool.query('SELECT id FROM website_settings WHERE setting_key = ?', [s.key]);
      if (existing.length > 0) {
        await pool.query('UPDATE website_settings SET setting_value = ? WHERE setting_key = ?', [s.value, s.key]);
      } else {
        await pool.query('INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?)', [s.key, s.value]);
      }
    }
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Gallery Photos
router.get('/gallery', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM gallery_photos ORDER BY created_at DESC');
    res.json({ success: true, photos: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/gallery', uploadLogo.single('photo'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const photo_path = '/uploads/gallery/' + req.file.filename;
    await pool.query(
      'INSERT INTO gallery_photos (title, description, photo_path) VALUES (?, ?, ?)',
      [title || null, description || null, photo_path]
    );
    res.status(201).json({ success: true, message: 'Photo uploaded', photo_path });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery_photos WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Slider Images
router.get('/sliders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM slider_images ORDER BY display_order');
    res.json({ success: true, sliders: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/sliders', uploadLogo.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link, display_order } = req.body;
    const image_path = '/uploads/sliders/' + req.file.filename;
    await pool.query(
      'INSERT INTO slider_images (title, subtitle, link, image_path, display_order) VALUES (?, ?, ?, ?, ?)',
      [title || null, subtitle || null, link || null, image_path, display_order || 0]
    );
    res.status(201).json({ success: true, message: 'Slider added', image_path });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/sliders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM slider_images WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Slider deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
