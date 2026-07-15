const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// ======================================================================
// COURSE PURCHASES - Student Purchase Courses
// ======================================================================

// STUDENT: Get available courses for purchase
router.get('/student/available', authenticateToken, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const [courses] = await pool.query(`
      SELECT c.id, c.title as title, c.description, c.price, 0 as duration,
             CASE WHEN cp.id IS NOT NULL THEN 1 ELSE 0 END as already_purchased
      FROM courses c
      LEFT JOIN course_purchases cp ON c.id = cp.course_id AND cp.student_id = ?
      WHERE c.status = 'active'
      ORDER BY c.created_at DESC
    `, [studentId]);
    res.json({ success: true, courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STUDENT: Get purchased courses with materials
router.get('/student/purchased', authenticateToken, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const [courses] = await pool.query(`
      SELECT c.id, c.title as title, c.description, c.price, 0 as duration,
             cp.created_at as purchase_date, cp.id as purchase_id,
             (SELECT COUNT(*) FROM course_subjects WHERE course_id = c.id) as material_count
      FROM course_purchases cp
      JOIN courses c ON cp.course_id = c.id
      WHERE cp.student_id = ? AND cp.status = 'completed'
      ORDER BY cp.created_at DESC
    `, [studentId]);
    res.json({ success: true, courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STUDENT: Get course materials for purchased course
router.get('/student/course/:courseId/materials', authenticateToken, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const courseId = req.params.courseId;
    
    // Verify student purchased this course
    const [purchased] = await pool.query(
      'SELECT id FROM course_purchases WHERE student_id = ? AND course_id = ? AND status = ?',
      [studentId, courseId, 'completed']
    );
    if (!purchased.length) return res.status(403).json({ success: false, message: 'Not purchased' });
    
    const [materials] = await pool.query(`
      SELECT id, type as material_type, title, '' as description, file_path, 0 as duration_minutes, display_order as sort_order
      FROM course_subject_items
      WHERE subject_id IN (SELECT id FROM course_subjects WHERE course_id = ?)
      ORDER BY display_order ASC, created_at ASC
    `, [courseId]);
    res.json({ success: true, materials });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STUDENT: Purchase course (simulate payment)
router.post('/purchase', authenticateToken, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;
    
    // Get course details
    const [course] = await pool.query('SELECT id, price FROM courses WHERE id = ?', [courseId]);
    if (!course.length) return res.status(404).json({ success: false, message: 'Course not found' });
    
    // Check if already purchased
    const [existing] = await pool.query(
      'SELECT id FROM course_purchases WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );
    if (existing.length) return res.status(400).json({ success: false, message: 'Already purchased' });
    
    // Create purchase record
    const [result] = await pool.query(
      'INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, status) VALUES (?,?,?,?,?)',
      [studentId, courseId, course[0].price, 'online', 'completed']
    );
    
    // Also create enrollment record
    await pool.query(
      'INSERT IGNORE INTO course_enrollments (student_id, course_id, payment_status, transaction_id) VALUES (?, ?, ?, ?)',
      [studentId, courseId, 'completed', result.insertId]
    );

    res.status(201).json({ success: true, message: 'Course purchased successfully', purchaseId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// COMMISSION MANAGEMENT - View & Manage Commissions
// ======================================================================

// ADMIN/TECHNICIAN: Get commission dashboard
router.get('/commission/dashboard', authenticateToken, authorize('admin', 'technician'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get summary
    const [[summary]] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN cl.status = 'pending' THEN cl.commission_amount ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN cl.status = 'approved' THEN cl.commission_amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN cl.status = 'paid' THEN cl.commission_amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(cl.commission_amount), 0) as total
      FROM commission_ledger cl
      WHERE user_id = ? AND user_role = ?
    `, [userId, userRole]);
    
    // Get recent commissions
    const [commissions] = await pool.query(`
      SELECT id, transaction_type, commission_amount, tax_deducted, net_amount, status, created_at
      FROM commission_ledger
      WHERE user_id = ? AND user_role = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId, userRole]);
    
    res.json({ success: true, summary, commissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: View all commissions (all users)
router.get('/commission/all', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [commissions] = await pool.query(`
      SELECT cl.*, 
             CASE WHEN user_role = 'admin' THEN a.name ELSE t.name END as user_name,
             CASE WHEN user_role = 'admin' THEN a.email ELSE t.email END as user_email
      FROM commission_ledger cl
      LEFT JOIN admins a ON cl.user_id = a.id AND cl.user_role = 'admin'
      LEFT JOIN technicians t ON cl.user_id = t.id AND cl.user_role = 'technician'
      ORDER BY cl.created_at DESC
    `);
    res.json({ success: true, commissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Get commission summary by user
router.get('/commission/summary', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        cl.user_id, cl.user_role,
        CASE WHEN cl.user_role = 'admin' THEN a.name ELSE t.name END as user_name,
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN cl.status = 'pending' THEN cl.commission_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN cl.status = 'paid' THEN cl.commission_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(cl.commission_amount), 0) as total_amount,
        MAX(cl.payment_date) as last_payment_date
      FROM commission_ledger cl
      LEFT JOIN admins a ON cl.user_id = a.id AND cl.user_role = 'admin'
      LEFT JOIN technicians t ON cl.user_id = t.id AND cl.user_role = 'technician'
      GROUP BY cl.user_id, cl.user_role
      ORDER BY total_amount DESC
    `);
    res.json({ success: true, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Approve pending commissions
router.put('/commission/:id/approve', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE commission_ledger SET status = ? WHERE id = ?',
      ['approved', req.params.id]
    );
    res.json({ success: true, message: 'Commission approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Mark commission as paid
router.post('/commission/payment', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const { user_id, user_role, total_amount, payment_method, utr_number } = req.body;
    
    // Create payment record
    const [paymentResult] = await pool.query(
      'INSERT INTO commission_payments (user_id, user_role, total_amount, payment_method, utr_number, status, created_by) VALUES (?,?,?,?,?,?,?)',
      [user_id, user_role, total_amount, payment_method, utr_number, 'processed', req.user.id]
    );
    
    // Mark ledger entries as paid
    await pool.query(
      'UPDATE commission_ledger SET status = ? WHERE user_id = ? AND user_role = ? AND status = ?',
      ['paid', user_id, user_role, 'approved']
    );
    
    res.status(201).json({ success: true, message: 'Payment recorded', paymentId: paymentResult.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// COMMISSION SETTINGS - Configure Commissions
// ======================================================================

// ADMIN: Get commission settings
router.get('/commission-settings', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM commission_settings ORDER BY entity_type, entity_name');
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Update commission setting
router.put('/commission-settings/:id', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const { commission_value, admin_commission_percent, technician_commission_percent } = req.body;
    await pool.query(
      'UPDATE commission_settings SET commission_value = ?, admin_commission_percent = ?, technician_commission_percent = ? WHERE id = ?',
      [commission_value, admin_commission_percent, technician_commission_percent, req.params.id]
    );
    res.json({ success: true, message: 'Commission setting updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// ADMIN - REPAIRING COURSE PURCHASE MANAGEMENT
// ======================================================================

// ADMIN: Get all students
router.get('/admin/students', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT id, student_id, name, email, mobile, class, status, created_at
      FROM students
      ORDER BY name ASC
    `);
    res.json({ success: true, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Get all course purchases
router.get('/admin/all-purchases', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [purchases] = await pool.query(`
      SELECT cp.id, cp.student_id, cp.course_id, cp.amount_paid, cp.payment_method, cp.status, cp.created_at AS purchase_date,
             s.name as student_name, s.student_id, s.email as student_email,
             c.title AS course_name, c.price
      FROM course_purchases cp
      JOIN students s ON cp.student_id = s.id
      JOIN courses c ON cp.course_id = c.id
      ORDER BY cp.created_at DESC
    `);
    res.json({ success: true, purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Get all course purchases (alias for frontend)
router.get('/all-purchases', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [purchases] = await pool.query(`
      SELECT cp.id, cp.student_id, cp.course_id, cp.amount_paid, cp.payment_method, cp.status, cp.created_at AS purchase_date,
             s.name as student_name, s.student_id, s.email as student_email,
             c.title AS course_name, c.price
      FROM course_purchases cp
      JOIN students s ON cp.student_id = s.id
      JOIN courses c ON cp.course_id = c.id
      ORDER BY cp.created_at DESC
    `);
    res.json({ success: true, purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Create course purchase for a student
router.post('/admin/purchase-course', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const { student_id, course_id, amount_paid, payment_method, status } = req.body;
    const finalStatus = status || 'completed';

    if (!student_id || !course_id || !amount_paid) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify student exists
    const [student] = await pool.query('SELECT id FROM students WHERE id = ?', [student_id]);
    if (!student.length) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Verify course exists
    const [course] = await pool.query('SELECT id FROM courses WHERE id = ?', [course_id]);
    if (!course.length) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if already purchased
    const [existing] = await pool.query(
      'SELECT id FROM course_purchases WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    );
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Student already purchased this course' });
    }

    // Create purchase record
    const [result] = await pool.query(
      'INSERT INTO course_purchases (student_id, course_id, amount_paid, payment_method, status) VALUES (?,?,?,?,?)',
      [student_id, course_id, amount_paid, payment_method || 'manual', finalStatus]
    );

    // Also enroll student if purchase is completed
    if (finalStatus === 'completed') {
      await pool.query(
        'INSERT IGNORE INTO course_enrollments (student_id, course_id, payment_status, transaction_id) VALUES (?, ?, ?, ?)',
        [student_id, course_id, 'completed', result.insertId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Course purchase created successfully',
      purchaseId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Update course purchase (edit payment details/status)
router.put('/admin/purchase/:id', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const { amount_paid, payment_method, status } = req.body;
    
    // Get original purchase record
    const [[purchase]] = await pool.query('SELECT student_id, course_id FROM course_purchases WHERE id = ?', [req.params.id]);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const [result] = await pool.query(
      'UPDATE course_purchases SET amount_paid = ?, payment_method = ?, status = ? WHERE id = ?',
      [amount_paid, payment_method, status, req.params.id]
    );

    // Update enrollment status based on purchase status
    if (status === 'completed') {
      await pool.query(
        'INSERT IGNORE INTO course_enrollments (student_id, course_id, payment_status, transaction_id) VALUES (?, ?, ?, ?)',
        [purchase.student_id, purchase.course_id, 'completed', req.params.id]
      );
    } else {
      await pool.query(
        'DELETE FROM course_enrollments WHERE student_id = ? AND course_id = ?',
        [purchase.student_id, purchase.course_id]
      );
    }

    res.json({ success: true, message: 'Purchase updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Delete course purchase
router.delete('/admin/purchase/:id', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    // Get purchase details first
    const [[purchase]] = await pool.query('SELECT student_id, course_id FROM course_purchases WHERE id = ?', [req.params.id]);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Delete purchase
    const [result] = await pool.query('DELETE FROM course_purchases WHERE id = ?', [req.params.id]);

    // Also delete corresponding enrollment
    await pool.query('DELETE FROM course_enrollments WHERE student_id = ? AND course_id = ?', [purchase.student_id, purchase.course_id]);

    res.json({ success: true, message: 'Purchase and enrollment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Get all-purchases (another endpoint option)
router.get('/transactions/all-purchases', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const [purchases] = await pool.query(`
      SELECT cp.id, cp.student_id, cp.course_id, cp.amount_paid, cp.payment_method, cp.status, cp.created_at AS purchase_date,
             s.name as student_name, s.student_id, s.email as student_email,
             c.title AS course_name, c.price
      FROM course_purchases cp
      JOIN students s ON cp.student_id = s.id
      JOIN courses c ON cp.course_id = c.id
      ORDER BY cp.created_at DESC
    `);
    res.json({ success: true, purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
