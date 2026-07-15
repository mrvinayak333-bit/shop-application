const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

// Public/Authenticated: Get all active payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id');
    res.json({ success: true, methods: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// MASTER/ADMIN: Create invoice
router.post('/invoice', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { repair_id, subtotal, tax_percent, discount, payment_method, notes } = req.body;
    const taxAmount = (subtotal * (tax_percent || 0)) / 100;
    const total = subtotal + taxAmount - (discount || 0);
    const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();

    const [[repair]] = await pool.query('SELECT customer_id FROM repair_requests WHERE id=?', [repair_id]);
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' });

    await pool.query(
      'INSERT INTO invoices (invoice_number, repair_id, customer_id, subtotal, tax_percent, tax_amount, discount, total_amount, balance_amount, payment_method, invoice_date) VALUES (?,?,?,?,?,?,?,?,?,?,CURDATE())',
      [invoiceNumber, repair_id, repair.customer_id, subtotal, tax_percent || 0, taxAmount, discount || 0, total, total, payment_method]
    );

    res.status(201).json({ success: true, message: 'Invoice created', invoiceNumber, total });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get invoices
router.get('/invoices', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT i.*, c.name as customer_name, c.mobile FROM invoices i JOIN customers c ON i.customer_id=c.id ORDER BY i.created_at DESC LIMIT 200'
    );
    res.json({ success: true, invoices: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Customer: Get their invoices
router.get('/my-invoices', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM invoices WHERE customer_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, invoices: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Record payment
router.post('/pay', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, transaction_id } = req.body;
    const [[invoice]] = await pool.query('SELECT * FROM invoices WHERE id=?', [invoice_id]);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await pool.query('INSERT INTO payments (invoice_id, customer_id, amount, payment_method, transaction_id, payment_status) VALUES (?,?,?,?,?,?)', [invoice_id, invoice.customer_id, amount, payment_method, transaction_id || '', 'completed']);

    const newPaid = parseFloat(invoice.paid_amount) + parseFloat(amount);
    const newBalance = parseFloat(invoice.total_amount) - newPaid;
    const status = newBalance <= 0 ? 'paid' : 'partial';
    await pool.query('UPDATE invoices SET paid_amount=?, balance_amount=?, payment_status=? WHERE id=?', [newPaid, newBalance, status, invoice_id]);

    res.json({ success: true, message: 'Payment recorded', newPaid, balance: newBalance, status });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get payments
router.get('/payments', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT p.*, i.invoice_number, c.name as customer FROM payments p JOIN invoices i ON p.invoice_id=i.id JOIN customers c ON p.customer_id=c.id ORDER BY p.created_at DESC LIMIT 200');
    res.json({ success: true, payments: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Commission management
router.get('/commissions', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.*, t.name as tech_name FROM commission c JOIN technicians t ON c.technician_id=t.id ORDER BY c.created_at DESC'
    );
    res.json({ success: true, commissions: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Pay commission
router.put('/commission/:id/pay', authenticateToken, authorize('master'), async (req, res) => {
  try {
    await pool.query("UPDATE commission SET status='paid', paid_date=CURDATE() WHERE id=?", [req.params.id]);
    res.json({ success: true, message: 'Commission marked as paid' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
