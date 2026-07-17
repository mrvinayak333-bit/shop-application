const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { generateToken, authenticateToken } = require('../middleware/auth');

/**
 * UNIFIED LOGIN SYSTEM - SUPABASE INTEGRATED
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, studentId, mobile, deviceId } = req.body;

    if (!password || !role) {
      return res.status(400).json({ success: false, message: 'Password and role are required' });
    }

    let table = '';
    let loginField = 'email';
    let loginValue = email;

    switch (role) {
      case 'master': table = 'master_users'; break;
      case 'admin': table = 'admins'; break;
      case 'technician': table = 'technicians'; break;
      case 'customer':
        table = 'customers';
        if (mobile) { loginField = 'mobile'; loginValue = mobile; }
        break;
      case 'student':
        table = 'students';
        loginField = 'student_id';
        loginValue = studentId || email;
        break;
      default: return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Supabase Fetch
    const { data: users, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq(loginField, loginValue)
      .neq('status', 'inactive');

    if (fetchError || !users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account inactive' });
    }

    const userData = users[0];

    // Password Verification
    let isMatch = userData.password === password;
    if (!isMatch) {
      try {
        isMatch = await bcrypt.compare(password, userData.password);
      } catch (e) { isMatch = false; }
    }

    if (!isMatch && role === 'student' && userData.student_id === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Student Device Binding
    if (role === 'student') {
      if (!deviceId) return res.status(400).json({ success: false, message: 'Device ID required' });
      if (userData.android_device_id && userData.android_device_id !== deviceId) {
        return res.status(403).json({ success: false, message: 'Account locked to another device' });
      }
      if (!userData.android_device_id) {
        await supabase.from('students').update({ android_device_id: deviceId }).eq('id', userData.id);
      }
    }

    // Update Last Login
    await supabase.from(table).update({ last_login: new Date().toISOString() }).eq('id', userData.id);

    // Log Activity
    await supabase.from('activity_logs').insert({
      user_id: userData.id,
      user_role: role,
      action: 'LOGIN',
      description: `${role} logged in via ${loginField}`
    });

    const token = generateToken({
      id: userData.id,
      role: role,
      name: userData.name,
      email: userData.email || userData.mobile || userData.student_id,
      studentId: userData.student_id || null
    });

    delete userData.password;
    res.json({ success: true, message: 'Login successful', token, user: { ...userData, role } });

  } catch (err) {
    console.error('Supabase Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

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

    const { data: user, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error || !user) return res.status(404).json({ success: false, message: 'User not found' });

    delete user.password;
    res.json({ success: true, user: { ...user, role } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
