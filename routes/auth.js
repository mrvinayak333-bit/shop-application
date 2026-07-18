const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

/**
 * UNIFIED LOGIN SYSTEM
 * Handles: master, admin, technician, customer, student
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, studentId, mobile, deviceId } = req.body;

    // 1. Validation
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (!role) {
      return res.status(400).json({ success: false, message: 'User role is required' });
    }

    let user = null;
    let table = '';
    let loginField = 'email';
    let loginValue = email;

    // 2. Role-based table mapping
    switch (role) {
      case 'master':
        table = 'master_users';
        if (!email) return res.status(400).json({ success: false, message: 'Email is required for Master login' });
        break;
      case 'admin':
        table = 'admins';
        if (!email) return res.status(400).json({ success: false, message: 'Email is required for Admin login' });
        break;
      case 'technician':
        table = 'technicians';
        if (!email) return res.status(400).json({ success: false, message: 'Email is required for Technician login' });
        break;
      case 'customer':
        table = 'customers';
        if (mobile) {
          loginField = 'mobile';
          loginValue = mobile;
        } else if (!email) {
          return res.status(400).json({ success: false, message: 'Email or Mobile is required for Customer login' });
        }
        break;
      case 'student':
        table = 'students';
        loginField = 'student_id';
        loginValue = studentId || email; // Fallback to email if studentId not explicit
        if (!loginValue) return res.status(400).json({ success: false, message: 'Student ID is required' });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    // 3. Database Fetch
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${loginField} = ? AND status != 'inactive'`, [loginValue]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account inactive' });
    }

    const userData = rows[0];

    // 4. Password Verification
    let isMatch = false;

    // Special handling for legacy/unhashed passwords (especially for students/customers)
    if (userData.password === password) {
      isMatch = true;
    } else {
      try {
        isMatch = await bcrypt.compare(password, userData.password);
      } catch (e) {
        console.error('Bcrypt Error:', e.message);
        isMatch = false;
      }
    }

    // Fallback for students: allow login with student_id as password if not hashed
    if (!isMatch && role === 'student' && userData.student_id === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // 5. Course Security: Student Device Binding
    if (role === 'student') {
      if (!deviceId) {
        return res.status(400).json({ success: false, message: 'Device verification required for students.' });
      }

      if (userData.android_device_id && userData.android_device_id !== deviceId) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied. This account is locked to another device. Please contact administration for reset.'
        });
      }

      if (!userData.android_device_id) {
        // Auto-bind device on first login
        await pool.query('UPDATE students SET android_device_id = ? WHERE id = ?', [deviceId, userData.id]);
        userData.android_device_id = deviceId;
      }
    }

    // 6. Finalize Login
    // Update last login timestamp
    await pool.query(`UPDATE ${table} SET last_login = NOW() WHERE id = ?`, [userData.id]);

    // Log Activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?, ?, ?, ?)',
      [userData.id, role, 'LOGIN', `${role} logged in via ${loginField}`]
    );

    // Prepare Token Payload
    const tokenData = {
      id: userData.id,
      role: role,
      name: userData.name,
      email: userData.email || userData.mobile || userData.student_id,
      studentId: userData.student_id || null
    };

    const token = generateToken(tokenData);

    // Security: Remove password from response
    delete userData.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...userData,
        role: role
      }
    });

  } catch (err) {
    console.error('Login Route Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

/**
 * PROFILE ENDPOINT
 * Returns current user data based on JWT
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    let table = '';

    switch (role) {
      case 'master': table = 'master_users'; break;
      case 'admin': table = 'admins'; break;
      case 'technician': table = 'technicians'; break;
      case 'customer': table = 'customers'; break;
      case 'student': table = 'students'; break;
      default: return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = rows[0];
    delete user.password; // Never send password

    res.json({ success: true, user: { ...user, role } });

  } catch (err) {
    console.error('Profile Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
