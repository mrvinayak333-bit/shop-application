const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// ======================================================================
// LAPTOP/COMPUTER REPAIR MODULE - Similar to Mobile Repair
// ======================================================================

// CUSTOMER: Register new laptop repair
router.post('/register', async (req, res) => {
  try {
    const { customer_name, customer_mobile, device_type, brand, model, issue_description, pickup_address } = req.body;
    
    if (!customer_mobile || !device_type || !brand || !issue_description) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    
    // Find or create customer
    let [customer] = await pool.query('SELECT id FROM customers WHERE mobile = ?', [customer_mobile]);
    let customerId;
    
    if (!customer.length) {
      const [result] = await pool.query(
        'INSERT INTO customers (name, mobile, password, status) VALUES (?,?,?,?)',
        [customer_name || 'Guest', customer_mobile, 'temp', 'active']
      );
      customerId = result.insertId;
    } else {
      customerId = customer[0].id;
    }
    
    // Generate tracking number
    const tracking = 'LT' + Date.now().toString().slice(-8);
    
    // Create repair request
    const [result] = await pool.query(
      'INSERT INTO laptop_repairs (tracking_number, customer_id, device_type, brand, model, issue_description, pickup_address, status) VALUES (?,?,?,?,?,?,?,?)',
      [tracking, customerId, device_type, brand, model, issue_description, pickup_address || '', 'registered']
    );
    
    // Log status
    await pool.query(
      'INSERT INTO laptop_repair_status (repair_id, status, notes) VALUES (?,?,?)',
      [result.insertId, 'registered', 'Laptop repair registered']
    );
    
    res.status(201).json({ success: true, message: 'Repair registered', tracking_number: tracking, repair_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUBLIC: Track repair status
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const [repairs] = await pool.query(
      'SELECT lr.*, c.name as customer_name FROM laptop_repairs lr JOIN customers c ON lr.customer_id = c.id WHERE lr.tracking_number = ?',
      [req.params.trackingNumber]
    );
    
    if (!repairs.length) return res.status(404).json({ success: false, message: 'Not found' });
    
    const [statusLog] = await pool.query(
      'SELECT status, notes, created_at FROM laptop_repair_status WHERE repair_id = ? ORDER BY created_at ASC',
      [repairs[0].id]
    );
    
    res.json({ success: true, repair: repairs[0], statusLog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// ADMIN MANAGEMENT
// ======================================================================

// ADMIN: Get pending repairs for verification
router.get('/admin/pending-verification', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [repairs] = await pool.query(`
      SELECT lr.*, c.name as customer_name, c.mobile as customer_mobile
      FROM laptop_repairs lr
      JOIN customers c ON lr.customer_id = c.id
      WHERE lr.status = 'registered'
      ORDER BY lr.created_at DESC
    `);
    res.json({ success: true, repairs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Verify and assign to technician
router.put('/admin/:id/verify', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { technician_id, estimated_cost, notes } = req.body;
    const repairId = req.params.id;
    
    await pool.query(
      'UPDATE laptop_repairs SET status = ?, assigned_technician = ?, estimated_cost = ? WHERE id = ?',
      ['admin_verified', technician_id || null, estimated_cost || 0, repairId]
    );
    
    await pool.query(
      'INSERT INTO laptop_repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'admin_verified', notes || 'Verified by admin', req.user.id, 'admin']
    );
    
    res.json({ success: true, message: 'Repair verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN: Get all laptop repairs
router.get('/admin/all', authenticateToken, authorize('admin', 'master'), async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    let query = `
      SELECT lr.*, c.name as customer_name, c.mobile as customer_mobile, t.name as tech_name
      FROM laptop_repairs lr
      JOIN customers c ON lr.customer_id = c.id
      LEFT JOIN technicians t ON lr.assigned_technician = t.id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE lr.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY lr.created_at DESC LIMIT 50 OFFSET ?';
    params.push((page - 1) * 50);
    
    const [repairs] = await pool.query(query, params);
    res.json({ success: true, repairs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// TECHNICIAN MANAGEMENT
// ======================================================================

// TECHNICIAN: Get assigned repairs
router.get('/technician/my-repairs', authenticateToken, authorize('technician'), async (req, res) => {
  try {
    const techId = req.user.id;
    const { filter = 'all' } = req.query;
    
    let query = `
      SELECT lr.*, c.name as customer_name, c.mobile as customer_mobile
      FROM laptop_repairs lr
      JOIN customers c ON lr.customer_id = c.id
      WHERE lr.assigned_technician = ?
    `;
    const params = [techId];
    
    if (filter === 'pending') query += ' AND lr.status NOT IN ("completed", "cancelled")';
    else if (filter === 'completed') query += ' AND lr.status = "completed"';
    
    query += ' ORDER BY lr.created_at DESC';
    
    const [repairs] = await pool.query(query, params);
    res.json({ success: true, repairs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// TECHNICIAN: Update repair status
router.put('/technician/:id/status', authenticateToken, authorize('technician'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const repairId = req.params.id;
    const techId = req.user.id;
    
    const [repair] = await pool.query(
      'SELECT id FROM laptop_repairs WHERE id = ? AND assigned_technician = ?',
      [repairId, techId]
    );
    
    if (!repair.length) return res.status(403).json({ success: false, message: 'Not authorized' });
    
    await pool.query(
      'UPDATE laptop_repairs SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, repairId]
    );
    
    await pool.query(
      'INSERT INTO laptop_repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, status, notes || '', techId, 'technician']
    );
    
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// QUOTATIONS
// ======================================================================

// TECHNICIAN: Create quotation
router.post('/:id/quotation', authenticateToken, authorize('technician', 'admin'), async (req, res) => {
  try {
    const { parts_cost = 0, labor_cost = 0, other_charges = 0, discount = 0, details, spare_parts, estimated_days } = req.body;
    const repairId = req.params.id;
    
    const total = parts_cost + labor_cost + other_charges - discount;
    
    const [result] = await pool.query(
      'INSERT INTO laptop_quotations (repair_id, parts_cost, labor_cost, other_charges, discount, total_cost, final_amount, details, spare_parts, estimated_days, created_by, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [repairId, parts_cost, labor_cost, other_charges, discount, total, total, details || '', spare_parts || '', estimated_days || 0, req.user.id, 'sent']
    );
    
    await pool.query(
      'UPDATE laptop_repairs SET status = ? WHERE id = ?',
      ['quotation_sent', repairId]
    );
    
    res.status(201).json({ success: true, message: 'Quotation created', quotationId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CUSTOMER: Approve/reject quotation (via tracking)
router.put('/quotation/:quotationId/approve', async (req, res) => {
  try {
    await pool.query('UPDATE laptop_quotations SET status = ? WHERE id = ?', ['approved', req.params.quotationId]);
    
    const [quotation] = await pool.query('SELECT repair_id FROM laptop_quotations WHERE id = ?', [req.params.quotationId]);
    await pool.query('UPDATE laptop_repairs SET status = ? WHERE id = ?', ['customer_approved', quotation[0].repair_id]);
    
    res.json({ success: true, message: 'Quotation approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ======================================================================
// INVOICES
// =====================================================================

// Generate invoice after repair completion
router.post('/:id/invoice', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const { payment_method = 'cash', service_charge = 0 } = req.body;
    
    const [repair] = await pool.query('SELECT * FROM laptop_repairs WHERE id = ?', [repairId]);
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found' });
    
    const [quotation] = await pool.query(
      'SELECT total_cost FROM laptop_quotations WHERE repair_id = ? AND status = ? ORDER BY id DESC LIMIT 1',
      [repairId, 'approved']
    );
    
    const total = quotation && quotation.length > 0 ? quotation[0].total_cost : repair[0].estimated_cost || 0;
    const final_amount = total + service_charge;
    
    const invoiceNo = 'INV-LT-' + Date.now().toString().slice(-8);
    
    // In this simplified version, we're just tracking the invoice
    // In production, you'd create a formal invoice with PDF generation
    res.json({
      success: true,
      message: 'Invoice generated',
      invoice: {
        invoice_number: invoiceNo,
        repair_id: repairId,
        total_amount: total,
        service_charge: service_charge,
        final_amount: final_amount,
        payment_method: payment_method,
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
