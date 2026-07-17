const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateToken, authorize, generateToken } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mobile, address, city, state, pincode } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    if (email) {
      const { data: existing } = await supabase.from('customers').select('id').eq('email', email);
      if (existing?.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const { data: mobileCheck } = await supabase.from('customers').select('id').eq('mobile', mobile);
    if (mobileCheck?.length > 0) return res.status(409).json({ success: false, message: 'Mobile number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('customers').insert({
      name, email: email || null, password: hashedPassword, mobile,
      address: address || null, city: city || null, state: state || null, pincode: pincode || null,
      status: 'active'
    }).select();

    if (error) throw error;
    const customer = data[0];

    const token = generateToken({ id: customer.id, role: 'customer', name, email: email || '' });
    
    if (email) {
      const { sendMailFromTemplate } = require('../services/emailService');
      sendMailFromTemplate(email, 'welcome_email_template', { name }).catch(e => console.error(e));
    }

    res.status(201).json({ success: true, message: 'Registration successful', token, user: { ...customer, role: 'customer' } });
  } catch (err) {
    console.error('Customer Register Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dashboard', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get Customer Details
    const { data: customer, error: cErr } = await supabase.from('customers').select('*').eq('id', userId).single();
    if (cErr) throw cErr;

    // 2. Get Active Repairs with joins
    // Note: Supabase handles joins via select string
    const { data: repairs, error: rErr } = await supabase
      .from('repair_requests')
      .select(`
        *,
        technician:assigned_technician(name),
        quotations(*)
      `)
      .eq('customer_id', userId)
      .not('status', 'in', '("delivered","cancelled","successfully_delivered","feedback_given")')
      .order('created_at', { ascending: false });

    if (rErr) throw rErr;

    // 3. Get History
    const { data: history, error: hErr } = await supabase
      .from('repair_requests')
      .select('tracking_number, device_type, brand, status, created_at, feedback_rating, feedback_comments')
      .eq('customer_id', userId)
      .in('status', ["delivered","successfully_delivered","feedback_given","cancelled"])
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Get Notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_role', 'customer')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Map data to match expected frontend format if necessary
    const mappedRepairs = repairs.map(rr => ({
      ...rr,
      tech: rr.technician?.name,
      // Pick the latest quotation
      quotation_id: rr.quotations?.[rr.quotations.length - 1]?.id,
      total_cost: rr.quotations?.[rr.quotations.length - 1]?.total_cost,
      quotation_status: rr.quotations?.[rr.quotations.length - 1]?.status
    }));

    res.json({ success: true, customer, activeRepairs: mappedRepairs, repairHistory: history, notifications });
  } catch (err) {
    console.error('Customer Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/profile', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', req.user.id).single();
    if (error) throw error;
    res.json({ success: true, customer: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/profile', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const { name, email, alternate_mobile, address, city, state, pincode } = req.body;
    const { error } = await supabase.from('customers')
      .update({ name, email, alternate_mobile, address, city, state, pincode })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
