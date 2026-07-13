const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const XLSX = require('xlsx');

router.use(authenticateToken);
router.use(authorize('master', 'admin'));

// Repair report
router.get('/repairs', async (req, res) => {
  try {
    const { from, to, status } = req.query;
    let query = 'SELECT rr.tracking_number, c.name, c.mobile, rr.device_type, rr.brand, rr.model, rr.status, rr.created_at FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE 1=1';
    const params = [];
    if (from) { query += ' AND DATE(rr.created_at)>=?'; params.push(from); }
    if (to) { query += ' AND DATE(rr.created_at)<=?'; params.push(to); }
    if (status) { query += ' AND rr.status=?'; params.push(status); }
    query += ' ORDER BY rr.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Revenue report
router.get('/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = 'SELECT i.invoice_number, c.name, i.subtotal, i.tax_amount, i.discount, i.total_amount, i.paid_amount, i.balance_amount, i.payment_status, i.invoice_date FROM invoices i JOIN customers c ON i.customer_id=c.id WHERE 1=1';
    const params = [];
    if (from) { query += ' AND i.invoice_date>=?'; params.push(from); }
    if (to) { query += ' AND i.invoice_date<=?'; params.push(to); }
    query += ' ORDER BY i.invoice_date DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Technician performance
router.get('/technicians', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT t.name, t.specialization, t.total_repairs, t.rating, t.commission_percent, COALESCE(SUM(c.amount),0) as total_commission FROM technicians t LEFT JOIN commission c ON t.id=c.technician_id GROUP BY t.id ORDER BY t.total_repairs DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Excel export
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { from, to } = req.query;
    let data = [];
    let sheetName = 'Report';

    if (type === 'repairs') {
      let query = 'SELECT rr.tracking_number, c.name as customer, c.mobile, rr.device_type, rr.brand, rr.model, rr.status, DATE_FORMAT(rr.created_at,"%Y-%m-%d") as date FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE 1=1';
      const params = [];
      if (from) { query += ' AND DATE(rr.created_at)>=?'; params.push(from); }
      if (to) { query += ' AND DATE(rr.created_at)<=?'; params.push(to); }
      query += ' ORDER BY rr.created_at DESC';
      [data] = await pool.query(query, params);
      sheetName = 'Repairs';
    } else if (type === 'revenue') {
      let query = 'SELECT i.invoice_number, c.name as customer, i.subtotal, i.tax_amount, i.discount, i.total_amount, i.paid_amount, i.balance_amount, i.payment_status, i.invoice_date FROM invoices i JOIN customers c ON i.customer_id=c.id WHERE 1=1';
      const params = [];
      if (from) { query += ' AND i.invoice_date>=?'; params.push(from); }
      if (to) { query += ' AND i.invoice_date<=?'; params.push(to); }
      query += ' ORDER BY i.invoice_date DESC';
      [data] = await pool.query(query, params);
      sheetName = 'Revenue';
    } else if (type === 'customers') {
      [data] = await pool.query('SELECT name, email, mobile, city, total_repairs, DATE_FORMAT(created_at,"%Y-%m-%d") as joined FROM customers ORDER BY created_at DESC');
      sheetName = 'Customers';
    } else if (type === 'students') {
      [data] = await pool.query('SELECT student_id, name, email, mobile, course, batch, status, enrollment_date FROM students ORDER BY created_at DESC');
      sheetName = 'Students';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

module.exports = router;
