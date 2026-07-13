const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, authorize, generateToken } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mobile, address, city, state, pincode } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }
    if (email) {
      const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const [mobileCheck] = await pool.query('SELECT id FROM customers WHERE mobile = ?', [mobile]);
    if (mobileCheck.length > 0) return res.status(409).json({ success: false, message: 'Mobile number already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO customers (name, email, password, mobile, address, city, state, pincode) VALUES (?,?,?,?,?,?,?,?)',
      [name, email || null, hashedPassword, mobile, address || null, city || null, state || null, pincode || null]
    );
    const token = generateToken({ id: result.insertId, role: 'customer', name, email: email || '' });
    res.status(201).json({ success: true, message: 'Registration successful', token, user: { id: result.insertId, name, email, mobile, role: 'customer' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dashboard', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const [[customer]] = await pool.query('SELECT id, name, email, mobile, address, city, total_repairs FROM customers WHERE id=?', [req.user.id]);
    const [repairs] = await pool.query(
      `SELECT rr.id, rr.tracking_number, rr.device_type, rr.brand, rr.model, rr.status, rr.created_at,
       rr.repair_completed_at, rr.admin_verified_at, rr.handover_at, rr.customer_confirmed_at,
       rr.delivered_at, rr.feedback_rating, rr.feedback_comments, rr.feedback_at,
       rr.payment_screenshot, rr.payment_verified_at, rr.delivery_type_option,
       rr.delivery_otp, rr.delivered_by,
       t.name as tech,
       q.id as quotation_id, q.total_cost, q.parts_cost, q.labor_cost, q.other_charges, q.discount,
       q.diagnosis, q.spare_parts, q.estimated_days, q.notes as quotation_notes,
       q.job_card_no, q.customer_name, q.device_name, q.imei,
       q.status as quotation_status, q.approved_at, q.reject_reason, q.created_at as quotation_date
       FROM repair_requests rr 
       LEFT JOIN technicians t ON rr.assigned_technician=t.id
       LEFT JOIN quotations q ON rr.id = q.repair_id AND q.id = (SELECT MAX(id) FROM quotations WHERE repair_id = rr.id)
       WHERE rr.customer_id=? AND rr.status NOT IN ("delivered","cancelled","successfully_delivered","feedback_given") ORDER BY rr.created_at DESC`, [req.user.id]
    );
    const [history] = await pool.query(
      'SELECT tracking_number, device_type, brand, status, created_at, feedback_rating, feedback_comments FROM repair_requests WHERE customer_id=? AND status IN ("delivered","successfully_delivered","feedback_given","cancelled") ORDER BY created_at DESC LIMIT 10', [req.user.id]
    );
    
    // Get notifications for customer
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id=? AND user_role="customer" ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    
    res.json({ success: true, customer, activeRepairs: repairs, repairHistory: history, notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/profile', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id,name,email,mobile,alternate_mobile,address,city,state,pincode,total_repairs FROM customers WHERE id=?', [req.user.id]);
    res.json({ success: true, customer: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/profile', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const { name, email, alternate_mobile, address, city, state, pincode } = req.body;
    await pool.query('UPDATE customers SET name=?,email=?,alternate_mobile=?,address=?,city=?,state=?,pincode=? WHERE id=?', [name,email,alternate_mobile,address,city,state,pincode,req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
