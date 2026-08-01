const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadLogo, uploadCertificate, uploadProfile } = require('../middleware/upload');

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
    const [[{ totalStaff }]] = await pool.query('SELECT COUNT(*) as totalStaff FROM staff_members');
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
        totalCustomers, totalStudents, totalAdmins, totalTechnicians, totalStaff,
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
    const fields = ['name', 'email', 'mobile', 'address', 'city', 'state', 'pincode', 'status'];
    const updateParts = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateParts.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (req.body.password) {
      updateParts.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, 10));
    }

    if (updateParts.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }

    const query = `UPDATE customers SET ${updateParts.join(', ')} WHERE id = ?`;
    params.push(req.params.id);

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
      `SELECT id, student_id, name, email, mobile, course, batch, status, enrollment_date, 
              profile_photo, fathers_name, address, age, dob, aadhaar_number, gender, created_at 
       FROM students ORDER BY created_at DESC`
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
      try {
        const normalizedCourse = course.trim().toLowerCase();
        const tokens = normalizedCourse.split(/\s+/).filter(word => word.length > 2);
        let query = `SELECT id FROM courses
                     WHERE status = 'active' AND (
                       COALESCE(title, course_name) = ?`;
        const params = [course];

        for (const token of tokens) {
          query += ' OR LOWER(COALESCE(title, course_name)) LIKE ?';
          params.push(`%${token}%`);
        }

        query += ') LIMIT 1';

        const [courseRows] = await pool.query(query, params);
        if (courseRows && courseRows.length > 0) {
          await pool.query(
            'INSERT IGNORE INTO course_enrollments (student_id, course_id, enrolled_date, status) VALUES (?, ?, CURDATE(), ?)',
            [result.insertId, courseRows[0].id, 'enrolled']
          );
        }
      } catch (enrollErr) {
        console.warn('Auto-enrollment warning:', enrollErr.message);
      }
    }

    try {
      await pool.query(
        'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
        [req.user.id, 'master', 'CREATE_STUDENT', `Student ${name} (${student_id}) created`]
      );
    } catch (logErr) {
      console.warn('Activity log skip:', logErr.message);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Student created successfully', 
      studentId: result.insertId,
      student: { id: result.insertId, student_id, name, email, mobile, course, batch }
    });

  } catch (err) {
    console.error('Student Create Error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const fields = ['name', 'email', 'mobile', 'course', 'batch', 'status', 'fathers_name', 'address', 'age', 'dob', 'aadhaar_number', 'gender', 'profile_photo'];
    const updateParts = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateParts.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (req.body.password) {
      updateParts.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, 10));
    }

    if (updateParts.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }

    const query = `UPDATE students SET ${updateParts.join(', ')} WHERE id = ?`;
    params.push(req.params.id);

    await pool.query(query, params);

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
    const fields = ['name', 'mobile', 'alternate_mobile', 'status', 'aadhar_number', 'bank_account', 'bank_ifsc', 'commission_type', 'commission_amount'];
    const updateParts = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateParts.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (req.body.password) {
      updateParts.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, 10));
    }

    if (updateParts.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }

    const query = `UPDATE admins SET ${updateParts.join(', ')} WHERE id = ?`;
    params.push(req.params.id);

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
    const fields = ['name', 'mobile', 'specialization', 'experience', 'commission_percent', 'status'];
    const updateParts = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateParts.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (req.body.password) {
      updateParts.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, 10));
    }

    if (updateParts.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }

    const query = `UPDATE technicians SET ${updateParts.join(', ')} WHERE id = ?`;
    params.push(req.params.id);

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
              COUNT(DISTINCT i.id) as total_repairs_managed,
              COALESCE(SUM(i.paid_amount), 0) as revenue_generated,
              a.created_at
       FROM admins a
       LEFT JOIN invoices i ON a.id = i.created_by
       GROUP BY a.id
       ORDER BY revenue_generated DESC`
    );
    res.json({ success: true, report: rows, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Admin Performance Report Error:', err);
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

// =====================================================
// STAFF MANAGEMENT (Master Control Only)
// =====================================================
router.get('/staff', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, staff_id, name, email, mobile, status, last_login, created_at FROM staff_members ORDER BY created_at DESC'
    );
    res.json({ success: true, staff: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { staff_id, name, password, email, mobile } = req.body;
    if (!staff_id || !name || !password) {
      return res.status(400).json({ success: false, message: 'Staff ID, Name and Password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM staff_members WHERE staff_id = ?', [staff_id]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Staff ID already exists' });
    }

    if (email) {
      const [existingEmail] = await pool.query('SELECT id FROM staff_members WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ success: false, message: 'Staff email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO staff_members (staff_id, name, password, email, mobile, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [staff_id, name, hashedPassword, email || null, mobile || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Staff member created successfully' });
  } catch (err) {
    console.error('Staff Create Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const fields = ['name', 'email', 'mobile', 'status'];
    const updateParts = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateParts.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (req.body.password) {
      updateParts.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, 10));
    }

    if (updateParts.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }

    const query = `UPDATE staff_members SET ${updateParts.join(', ')} WHERE id = ?`;
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Staff member updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM staff_members WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: CERTIFICATE MANAGEMENT
// =====================================================

// Upload Certificate Template
router.post('/certificate/template', uploadCertificate.fields([
  { name: 'template_file', maxCount: 1 },
  { name: 'institute_logo', maxCount: 1 },
  { name: 'institute_signature', maxCount: 1 }
]), async (req, res) => {
  try {
    const templatePath = req.files['template_file'] ? '/uploads/certificates/' + req.files['template_file'][0].filename : null;
    const logoPath = req.files['institute_logo'] ? '/uploads/certificates/' + req.files['institute_logo'][0].filename : null;
    const signaturePath = req.files['institute_signature'] ? '/uploads/certificates/' + req.files['institute_signature'][0].filename : null;
    
    // Check if there is an active template
    const [existing] = await pool.query('SELECT id FROM certificate_templates WHERE is_active = 1');
    
    if (existing.length > 0) {
      // Update existing template
      const updateFields = [];
      const params = [];
      if (templatePath) { updateFields.push('template_file = ?'); params.push(templatePath); }
      if (logoPath) { updateFields.push('institute_logo = ?'); params.push(logoPath); }
      if (signaturePath) { updateFields.push('institute_signature = ?'); params.push(signaturePath); }
      
      if (updateFields.length > 0) {
        params.push(existing[0].id);
        await pool.query(`UPDATE certificate_templates SET ${updateFields.join(', ')} WHERE id = ?`, params);
      }
    } else {
      // Create new template record
      if (!templatePath) {
        return res.status(400).json({ success: false, message: 'Template image file is required' });
      }
      await pool.query(
        'INSERT INTO certificate_templates (template_file, institute_logo, institute_signature, is_active) VALUES (?, ?, ?, 1)',
        [templatePath, logoPath, signaturePath]
      );
    }
    
    res.json({ success: true, message: 'Certificate template uploaded successfully' });
  } catch (err) {
    console.error('Template upload error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get active templates
router.get('/certificate/templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM certificate_templates WHERE is_active = 1 LIMIT 1');
    res.json({ success: true, template: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending certificate requests
router.get('/certificate/pending', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gc.*, s.name as student_name, s.student_id as student_code, c.title as course_name 
       FROM generated_certificates gc 
       JOIN students s ON gc.student_id = s.id 
       JOIN courses c ON gc.course_id = c.id 
       ORDER BY gc.created_at DESC`
    );
    res.json({ success: true, certificates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve / Reject certificate
router.put('/certificate/:id/approve', async (req, res) => {
  try {
    const certId = req.params.id;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    await pool.query(
      'UPDATE generated_certificates SET status = ?, issue_date = CURDATE() WHERE id = ?',
      [status, certId]
    );
    
    // Notify Student
    const [[cert]] = await pool.query('SELECT student_id, course_id, certificate_number FROM generated_certificates WHERE id = ?', [certId]);
    const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [cert.course_id]);
    
    if (status === 'approved') {
      await pool.query(
        'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [cert.student_id, 'student', 'Certificate Available', `Your certificate for "${course.title}" is now available for download.`, 'system']
      );
    }
    
    res.json({ success: true, message: `Certificate status updated to ${status}` });
  } catch (err) {
    console.error('Approve certificate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reissue certificate
router.post('/certificate/:id/reissue', async (req, res) => {
  try {
    const certId = req.params.id;
    
    const [[cert]] = await pool.query('SELECT * FROM generated_certificates WHERE id = ?', [certId]);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    
    const newCertNumber = `SRM-CERT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    await pool.query(
      'UPDATE generated_certificates SET certificate_number = ?, issue_date = CURDATE(), status = "approved" WHERE id = ?',
      [newCertNumber, certId]
    );
    
    // Notify Student
    const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [cert.course_id]);
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [cert.student_id, 'student', 'Certificate Reissued', `Your certificate for "${course.title}" has been reissued with Certificate ID: ${newCertNumber}.`, 'system']
    );
    
    res.json({ success: true, message: 'Certificate reissued successfully', certificateNumber: newCertNumber });
  } catch (err) {
    console.error('Reissue certificate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: SUPPORT TICKETS MANAGEMENT
// =====================================================

// List all support tickets
router.get('/support/tickets', async (req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT t.*, s.name as student_name, s.student_id as student_code 
       FROM support_tickets t 
       JOIN students s ON t.student_id = s.id 
       ORDER BY t.updated_at DESC`
    );
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// View support ticket detail and thread
router.get('/support/tickets/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const [[ticket]] = await pool.query(
      `SELECT t.*, s.name as student_name, s.student_id as student_code 
       FROM support_tickets t 
       JOIN students s ON t.student_id = s.id 
       WHERE t.id = ?`,
      [ticketId]
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    
    const [messages] = await pool.query(
      'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );
    
    res.json({ success: true, ticket, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reply to support ticket
router.post('/support/tickets/:id/reply', uploadProfile.single('screenshot'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    
    const [[ticket]] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    
    let attachmentPath = null;
    if (req.file) {
      attachmentPath = '/uploads/profiles/' + req.file.filename;
    }
    
    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_role, sender_id, message, attachment_path) VALUES (?, ?, ?, ?, ?)',
      [ticketId, 'master', req.user.id, message, attachmentPath]
    );
    
    await pool.query(
      'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
      [ticketId]
    );
    
    // Notify Student
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [ticket.student_id, 'student', 'Reply from Master', `Master replied to your support ticket: "${ticket.subject}"`, 'system']
    );
    
    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (err) {
    console.error('Master reply ticket error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change ticket status
router.put('/support/tickets/:id/status', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body; // 'open', 'in_progress', 'resolved'
    
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    await pool.query(
      'UPDATE support_tickets SET status = ? WHERE id = ?',
      [status, ticketId]
    );
    
    res.json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// MASTER: ANNOUNCEMENTS BROADCAST
// =====================================================

// Create Announcement
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, target_type, studentIds } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, target_type, created_by) VALUES (?, ?, ?, ?)',
      [title, content, target_type || 'all', req.user.id]
    );
    const announcementId = result.insertId;
    
    if (target_type === 'selected' && Array.isArray(studentIds)) {
      for (const studentId of studentIds) {
        await pool.query(
          'INSERT INTO announcement_recipients (announcement_id, student_id) VALUES (?, ?)',
          [announcementId, studentId]
        );
        
        // Notify Student
        await pool.query(
          'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
          [studentId, 'student', 'New Announcement', `Announcement: ${title}`, 'system']
        );
      }
    } else {
      // Notify All Students
      await pool.query(
        'INSERT INTO notifications (user_role, title, message, type) VALUES (?, ?, ?, ?)',
        ['student', 'New Announcement', `Announcement: ${title}`, 'system']
      );
    }
    
    res.status(201).json({ success: true, message: 'Announcement created successfully', announcementId });
  } catch (err) {
    console.error('Announcement create error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// View all Announcements
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, mu.name as creator_name 
       FROM announcements a 
       JOIN master_users mu ON a.created_by = mu.id 
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, announcements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset student device binding
router.put('/students/:id/reset-device', async (req, res) => {
  try {
    const studentId = req.params.id;
    await pool.query('UPDATE students SET android_device_id = NULL WHERE id = ?', [studentId]);
    res.json({ success: true, message: 'Device binding reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
