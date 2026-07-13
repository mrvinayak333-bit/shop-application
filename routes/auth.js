const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

// =====================================================
// UNIFIED LOGIN - All Roles
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, studentId } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    let user = null;
    let table = '';
    let idField = 'id';

    switch (role) {
      case 'master':
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        [user] = await pool.query('SELECT * FROM master_users WHERE email = ? AND status = ?', [email, 'active']);
        table = 'master_users';
        break;
      case 'admin':
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        [user] = await pool.query('SELECT * FROM admins WHERE email = ? AND status = ?', [email, 'active']);
        table = 'admins';
        break;
      case 'technician':
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        [user] = await pool.query('SELECT * FROM technicians WHERE email = ? AND status = ?', [email, 'active']);
        table = 'technicians';
        break;
      case 'customer':
        if (email) {
          [user] = await pool.query('SELECT * FROM customers WHERE email = ? AND status = ?', [email, 'active']);
        } else {
          const { mobile, name } = req.body;
          if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });
          [user] = await pool.query('SELECT * FROM customers WHERE mobile = ? AND status = ?', [mobile, 'active']);
        }
        table = 'customers';
        break;
      case 'student':
        if (!studentId) return res.status(400).json({ success: false, message: 'Student ID is required' });
        [user] = await pool.query('SELECT * FROM students WHERE student_id = ? AND status = ?', [studentId, 'active']);
        table = 'students';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    if (!user || user.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account inactive' });
    }

    const userData = user[0];

    // Password validation
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, userData.password);
    } catch (e) {
      passwordValid = false;
    }

    // Fallbacks for student accounts: allow login if provided password matches
    // the student ID (some older records used student_id as plain-password) or
    // if the stored password is plain text (not hashed).
    if (!passwordValid && role === 'student') {
      if (password === userData.student_id) passwordValid = true;
      if (!passwordValid && password === userData.password) passwordValid = true;
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(`UPDATE ${table} SET last_login = NOW() WHERE ${idField} = ?`, [userData[idField]]);

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [userData[idField], role, 'LOGIN', `${role} logged in successfully`]
    );

    // Generate token
    const tokenPayload = {
      id: userData[idField],
      role: role,
      name: userData.name,
      email: userData.email || '',
      studentId: userData.student_id || null
    };

    const token = generateToken(tokenPayload);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userData[idField],
        name: userData.name,
        email: userData.email,
        mobile: userData.mobile,
        role: role,
        studentId: userData.student_id || null,
        course: userData.course || null,
        batch: userData.batch || null
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// =====================================================
// GET CURRENT USER PROFILE
// =====================================================
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    let table = '';
    let idField = 'id';

    switch (role) {
      case 'master': table = 'master_users'; break;
      case 'admin': table = 'admins'; break;
      case 'technician': table = 'technicians'; break;
      case 'customer': table = 'customers'; break;
      case 'student': table = 'students'; break;
      default: return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    delete user.password;

    res.json({ success: true, user: { ...user, role } });

  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// CHANGE PASSWORD
// =====================================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' });
    }

    let table = '';
    switch (role) {
      case 'master': table = 'master_users'; break;
      case 'admin': table = 'admins'; break;
      case 'technician': table = 'technicians'; break;
      case 'customer': table = 'customers'; break;
      case 'student': table = 'students'; break;
      default: return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const [rows] = await pool.query(`SELECT password FROM ${table} WHERE id = ?`, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashedPassword, id]);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('Password Change Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =====================================================
// OTP - Generate & Send
// =====================================================
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile, email, purpose } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRE_MINUTES) || 10);

    await pool.query(
      'INSERT INTO otp_codes (mobile, email, otp, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
      [mobile || '', email || '', otp, purpose || 'login', expiresAt]
    );

    // In production, send via SMS/Email. For dev, return OTP in response
    const [settings] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['otp_enabled']);

    res.json({
      success: true,
      message: 'OTP generated successfully',
      otp: settings[0]?.setting_value === 'true' ? otp : otp, // Show in dev
      expiresIn: process.env.OTP_EXPIRE_MINUTES || 10
    });

  } catch (err) {
    console.error('OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate OTP' });
  }
});

// =====================================================
// OTP - Verify
// =====================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, email, otp } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM otp_codes WHERE (mobile = ? OR email = ?) AND otp = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [mobile || '', email || '', otp]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE otp_codes SET is_used = TRUE WHERE id = ?', [rows[0].id]);

    res.json({ success: true, message: 'OTP verified successfully' });

  } catch (err) {
    console.error('OTP Verify Error:', err);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

module.exports = router;
