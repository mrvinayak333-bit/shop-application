const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

router.use(authenticateToken);
router.use(authorize('master'));

router.get('/dashboard', async (req, res) => {
  try {
    // 1. Get stats in parallel using Supabase count feature
    const [
      { count: totalCustomers },
      { count: totalStudents },
      { count: totalAdmins },
      { count: totalTechnicians },
      { count: totalRepairs },
      { count: pendingRepairs },
      { count: totalCourses },
      { data: revenueData }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('admins').select('*', { count: 'exact', head: true }),
      supabase.from('technicians').select('*', { count: 'exact', head: true }),
      supabase.from('repair_requests').select('*', { count: 'exact', head: true }),
      supabase.from('repair_requests').select('*', { count: 'exact', head: true }).not('status', 'in', '("delivered","cancelled")'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('invoices').select('paid_amount')
    ]);

    const totalRevenue = revenueData?.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0) || 0;

    // 2. Get recent repairs
    const { data: recentRepairs } = await supabase
      .from('repair_requests')
      .select('tracking_number, device_type, brand, status, created_at, customer:customer_id(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalCustomers, totalStudents, totalAdmins, totalTechnicians,
        totalRepairs, pendingRepairs, totalRevenue, totalCourses,
        recentRepairs: recentRepairs?.map(rr => ({ ...rr, customer_name: rr.customer?.name }))
      }
    });

  } catch (err) {
    console.error('Master Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, customers: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    delete data.password;
    res.json({ success: true, customer: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, email, mobile, address, city, state, pincode, status, password } = req.body;
    const updates = { name, email, mobile, address, city, state, pincode, status };
    if (password) updates.password = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('customers').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// STUDENT MANAGEMENT
router.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, students: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/students', async (req, res) => {
  try {
    const { student_id, name, password, email, mobile, course, batch } = req.body;
    if (!student_id || !name || !password) return res.status(400).json({ success: false, message: 'Required fields missing' });

    const { data: existing } = await supabase.from('students').select('id').eq('student_id', student_id);
    if (existing?.length > 0) return res.status(409).json({ success: false, message: 'Student ID exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('students').insert({
      student_id, name, password: hashedPassword, email, mobile, course, batch,
      created_by: req.user.id, enrollment_date: new Date().toISOString()
    }).select();

    if (error) throw error;
    res.status(201).json({ success: true, message: 'Student created successfully', studentId: data[0].id });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ... Additional routes would follow same pattern
module.exports = router;
