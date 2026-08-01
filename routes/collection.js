const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { creditCommission } = require('./commission_helper');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure upload directory exists
const uploadDir = './uploads/deposits';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const depositStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ 
  storage: depositStorage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper: send notification
async function sendNotification(userId, userRole, title, message, type) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [userId, userRole, title, message, type]
    );
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

// Helper: log activity for audit trail
async function logActivity(req, action, details) {
  try {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const deviceInfo = req.headers['user-agent'] || 'unknown';
    
    const richPayload = {
      details: details,
      device_info: deviceInfo
    };
    
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [userId, userRole, action, JSON.stringify(richPayload), ipAddress]
    );
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

// ==========================================
// 1. PAYMENT COLLECTION
// ==========================================

// GET admins (for staff selecting who to submit collection to)
router.get('/admins', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, mobile, status FROM admins WHERE status = "active"');
    res.json({ success: true, admins: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST submit payment collection
router.post('/submit', authenticateToken, authorize('staff', 'admin'), async (req, res) => {
  const { order_id, customer_name, mobile_number, order_type, payment_method, total_amount, cash_denominations, assigned_admin_id } = req.body;
  
  if (!order_id || !customer_name || !mobile_number || !order_type || !payment_method || !total_amount || !assigned_admin_id) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO payment_collections 
       (order_id, customer_name, mobile_number, order_type, payment_method, total_amount, cash_denominations, collected_by, assigned_admin_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, customer_name, mobile_number, order_type, payment_method, total_amount, cash_denominations || null, req.user.id, assigned_admin_id]
    );

    await logActivity(req, 'SUBMIT_COLLECTION', { order_id, order_type, total_amount, assigned_admin_id });
    
    // Notify admin
    await sendNotification(
      assigned_admin_id, 
      'admin', 
      'New Payment Collection Submitted', 
      `Staff member ${req.user.name} submitted collection for Order ${order_id} of ₹${total_amount}. Waiting for your approval.`,
      'payment'
    );

    res.json({ success: true, message: 'Payment collection submitted successfully', collectionId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET pending collections for logged-in admin
router.get('/pending', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pc.*, s.name as staff_name, s.staff_id as staff_code 
       FROM payment_collections pc
       JOIN staff_members s ON pc.collected_by = s.id
       WHERE pc.assigned_admin_id = ? AND pc.status = 'pending'
       ORDER BY pc.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, collections: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST approve collection (Admin only)
router.post('/collection/:id/approve', authenticateToken, authorize('admin'), async (req, res) => {
  const collectionId = req.params.id;
  try {
    // 1. Get collection info
    const [collections] = await pool.query('SELECT * FROM payment_collections WHERE id = ?', [collectionId]);
    if (collections.length === 0) return res.status(404).json({ success: false, message: 'Collection request not found' });
    const col = collections[0];

    if (col.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Collection is already processed' });
    }

    const receiptNumber = 'REC-' + Date.now().toString().slice(-8) + '-' + Math.floor(1000 + Math.random() * 9000);

    // 2. Update collection status
    await pool.query(
      'UPDATE payment_collections SET status = "approved", receipt_number = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [receiptNumber, req.user.id, collectionId]
    );

    // 3. Ensure target Admin has a wallet, then credit Admin's wallet balance
    await pool.query(
      `INSERT INTO salary_wallets (user_id, user_role, balance, pending_salary, paid_salary) 
       VALUES (?, 'admin', 0.00, 0.00, 0.00) 
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [req.user.id]
    );

    // Fetch wallet ID
    const [wallets] = await pool.query('SELECT id, balance FROM salary_wallets WHERE user_id = ? AND user_role = "admin"', [req.user.id]);
    const wallet = wallets[0];

    // Move to Admin wallet balance (Admin acts as temporary safe holder of shop cash)
    await pool.query('UPDATE salary_wallets SET balance = balance + ? WHERE id = ?', [col.total_amount, wallet.id]);

    // Record ledger
    await pool.query(
      `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type, reference_id) 
       VALUES (?, 'credit', ?, ?, 'manual', ?)`,
      [wallet.id, col.total_amount, `Approved payment collection from staff for order ${col.order_id}`, collectionId]
    );

    await logActivity(req, 'APPROVE_COLLECTION', { collectionId, receiptNumber, amount: col.total_amount });

    // 4. Auto credit employee commission
    try {
      if (col.order_type === 'accessories_store') {
        // Credit staff member who collected it
        await creditCommission(col.collected_by, 'staff', 'accessories', col.order_id);
      } else if (col.order_type === 'mobile_repair') {
        // Credit the technician assigned to this repair
        const [repairs] = await pool.query(
          `SELECT assigned_technician FROM repair_requests WHERE tracking_number = ? OR id = ?`,
          [col.order_id, col.order_id]
        );
        if (repairs.length > 0 && repairs[0].assigned_technician) {
          const techId = repairs[0].assigned_technician;
          await creditCommission(techId, 'technician', 'repair', col.order_id);
        }
      }
    } catch (commErr) {
      console.error('Failed to credit commission on collection approval:', commErr);
    }

    // Notify staff
    await sendNotification(
      col.collected_by,
      'staff',
      'Collection Approved',
      `Your payment collection for order ${col.order_id} has been approved by admin ${req.user.name}. Receipt: ${receiptNumber}`,
      'payment'
    );

    res.json({ success: true, message: 'Collection approved successfully', receiptNumber });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST reject collection
router.post('/collection/:id/reject', authenticateToken, authorize('admin'), async (req, res) => {
  const collectionId = req.params.id;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

  try {
    const [collections] = await pool.query('SELECT * FROM payment_collections WHERE id = ?', [collectionId]);
    if (collections.length === 0) return res.status(404).json({ success: false, message: 'Collection request not found' });
    const col = collections[0];

    if (col.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Collection is already processed' });
    }

    await pool.query(
      'UPDATE payment_collections SET status = "rejected", rejected_by = ?, rejected_reason = ? WHERE id = ?',
      [req.user.id, reason, collectionId]
    );

    await logActivity(req, 'REJECT_COLLECTION', { collectionId, reason });

    // Notify staff
    await sendNotification(
      col.collected_by,
      'staff',
      'Collection Rejected',
      `Your payment collection for order ${col.order_id} was rejected by admin. Reason: ${reason}`,
      'payment'
    );

    res.json({ success: true, message: 'Collection rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET Admin wallet status summary
router.get('/admin-wallet', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // 1. Get Admin's wallet balance (holds shop cash)
    const [wallets] = await pool.query('SELECT balance FROM salary_wallets WHERE user_id = ? AND user_role = "admin"', [req.user.id]);
    const walletBalance = wallets[0]?.balance || 0;

    // 2. Fetch stats: today's, weekly, monthly collections approved by this admin
    const [todayRes] = await pool.query(
      `SELECT SUM(total_amount) as total FROM payment_collections 
       WHERE assigned_admin_id = ? AND status = "approved" AND DATE(approved_at) = CURRENT_DATE`,
      [req.user.id]
    );
    const [weekRes] = await pool.query(
      `SELECT SUM(total_amount) as total FROM payment_collections 
       WHERE assigned_admin_id = ? AND status = "approved" AND approved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.id]
    );
    const [monthRes] = await pool.query(
      `SELECT SUM(total_amount) as total FROM payment_collections 
       WHERE assigned_admin_id = ? AND status = "approved" AND approved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [req.user.id]
    );

    // 3. Pending deposit (approved cash payments that haven't been deposited)
    const [pendingDepositRes] = await pool.query(
      `SELECT SUM(total_amount) as total FROM payment_collections 
       WHERE assigned_admin_id = ? AND status = "approved" AND payment_method = "cash"`,
      [req.user.id]
    );
    
    const [alreadyDepositedRes] = await pool.query(
      `SELECT SUM(deposit_amount) as total FROM bank_deposits 
       WHERE admin_id = ? AND status = "approved"`,
      [req.user.id]
    );

    const totalCashApproved = pendingDepositRes[0]?.total || 0;
    const totalCashDeposited = alreadyDepositedRes[0]?.total || 0;
    const pendingCashInHand = Math.max(0, totalCashApproved - totalCashDeposited);

    res.json({
      success: true,
      walletBalance,
      today: todayRes[0]?.total || 0,
      weekly: weekRes[0]?.total || 0,
      monthly: monthRes[0]?.total || 0,
      pendingCashInHand,
      totalDeposited: totalCashDeposited
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ==========================================
// 2. BANK DEPOSIT MODULE
// ==========================================

// POST Admin submits deposit
router.post('/submit-deposit', authenticateToken, authorize('admin'), upload.fields([
  { name: 'deposit_slip_image', maxCount: 1 },
  { name: 'screenshot', maxCount: 1 }
]), async (req, res) => {
  const { bank_name, account_number, deposit_slip_number, deposit_date, deposit_amount } = req.body;

  if (!bank_name || !account_number || !deposit_slip_number || !deposit_date || !deposit_amount) {
    return res.status(400).json({ success: false, message: 'Please fill out all bank deposit details' });
  }

  const slipImage = req.files['deposit_slip_image'] ? `/uploads/deposits/${req.files['deposit_slip_image'][0].filename}` : null;
  const screenshotImage = req.files['screenshot'] ? `/uploads/deposits/${req.files['screenshot'][0].filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO bank_deposits 
       (admin_id, bank_name, account_number, deposit_slip_number, deposit_date, deposit_amount, deposit_slip_image, screenshot) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, bank_name, account_number, deposit_slip_number, deposit_date, deposit_amount, slipImage, screenshotImage]
    );

    await logActivity(req, 'SUBMIT_BANK_DEPOSIT', { bank_name, deposit_slip_number, deposit_amount });

    // Notify all master users
    const [masters] = await pool.query('SELECT id FROM master_users');
    for (const m of masters) {
      await sendNotification(
        m.id,
        'master',
        'New Bank Deposit Waiting Approval',
        `Admin ${req.user.name} submitted a bank deposit of ₹${deposit_amount} to ${bank_name}.`,
        'payment'
      );
    }

    res.json({ success: true, message: 'Bank deposit submitted successfully for approval' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET Admin's submitted bank deposits history
router.get('/deposits-history', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bank_deposits WHERE admin_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, deposits: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ==========================================
// 3. MASTER APPROVALS & STATS
// ==========================================

// GET Master: Bank Deposits waiting approval
router.get('/master/pending-deposits', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bd.*, a.name as admin_name, a.email as admin_email 
       FROM bank_deposits bd
       JOIN admins a ON bd.admin_id = a.id
       WHERE bd.status = 'pending'
       ORDER BY bd.created_at DESC`
    );
    res.json({ success: true, deposits: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Approve Deposit
router.post('/master/deposit/:id/approve', authenticateToken, authorize('master'), async (req, res) => {
  const depositId = req.params.id;
  try {
    const [deposits] = await pool.query('SELECT * FROM bank_deposits WHERE id = ?', [depositId]);
    if (deposits.length === 0) return res.status(404).json({ success: false, message: 'Deposit request not found' });
    const dep = deposits[0];

    if (dep.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Deposit request is already processed' });
    }

    // 1. Approve deposit
    await pool.query(
      'UPDATE bank_deposits SET status = "approved", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id, depositId]
    );

    // 2. Reduce the amount from the Admin's wallet balance
    const [wallets] = await pool.query('SELECT id, balance FROM salary_wallets WHERE user_id = ? AND user_role = "admin"', [dep.admin_id]);
    if (wallets.length > 0) {
      const wallet = wallets[0];
      const newBal = Math.max(0, wallet.balance - dep.deposit_amount);
      await pool.query('UPDATE salary_wallets SET balance = ? WHERE id = ?', [newBal, wallet.id]);

      // Write ledger record for debit
      await pool.query(
        `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type, reference_id) 
         VALUES (?, 'debit', ?, ?, 'withdrawal', ?)`,
        [wallet.id, dep.deposit_amount, `Transferred/deposited to company bank account`, depositId]
      );
    }

    await logActivity(req, 'MASTER_APPROVE_DEPOSIT', { depositId, amount: dep.deposit_amount, admin_id: dep.admin_id });

    // Notify Admin
    await sendNotification(
      dep.admin_id,
      'admin',
      'Bank Deposit Approved',
      `Your bank deposit of ₹${dep.deposit_amount} has been approved by the Master administrator.`,
      'payment'
    );

    res.json({ success: true, message: 'Bank deposit approved successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Reject Deposit
router.post('/master/deposit/:id/reject', authenticateToken, authorize('master'), async (req, res) => {
  const depositId = req.params.id;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

  try {
    const [deposits] = await pool.query('SELECT * FROM bank_deposits WHERE id = ?', [depositId]);
    if (deposits.length === 0) return res.status(404).json({ success: false, message: 'Deposit request not found' });
    const dep = deposits[0];

    if (dep.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Deposit request is already processed' });
    }

    await pool.query(
      'UPDATE bank_deposits SET status = "rejected", rejected_by = ?, rejected_reason = ? WHERE id = ?',
      [req.user.id, reason, depositId]
    );

    await logActivity(req, 'MASTER_REJECT_DEPOSIT', { depositId, reason });

    // Notify Admin
    await sendNotification(
      dep.admin_id,
      'admin',
      'Bank Deposit Rejected',
      `Your bank deposit of ₹${dep.deposit_amount} was rejected. Reason: ${reason}`,
      'payment'
    );

    res.json({ success: true, message: 'Deposit rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET Master: Company Bank Dashboard Statistics
router.get('/master/bank-stats', authenticateToken, authorize('master'), async (req, res) => {
  try {
    // 1. Total Company Bank Balance (sum of all approved bank deposits)
    const [totalDepositRes] = await pool.query('SELECT SUM(deposit_amount) as total FROM bank_deposits WHERE status = "approved"');
    const lifetimeDeposited = totalDepositRes[0]?.total || 0;

    // 2. Daily, weekly, monthly company bank deposits
    const [todayRes] = await pool.query('SELECT SUM(deposit_amount) as total FROM bank_deposits WHERE status = "approved" AND DATE(deposit_date) = CURRENT_DATE');
    const [weekRes] = await pool.query('SELECT SUM(deposit_amount) as total FROM bank_deposits WHERE status = "approved" AND deposit_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [monthRes] = await pool.query('SELECT SUM(deposit_amount) as total FROM bank_deposits WHERE status = "approved" AND deposit_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)');

    // 3. Collection by Payment Method overall
    const [paymentMethodRes] = await pool.query(
      'SELECT payment_method, SUM(total_amount) as total FROM payment_collections WHERE status="approved" GROUP BY payment_method'
    );

    // 4. Monthly Deposits Timeline (for chart)
    const [monthlyChartRes] = await pool.query(
      `SELECT DATE_FORMAT(deposit_date, '%Y-%m') as month, SUM(deposit_amount) as total 
       FROM bank_deposits 
       WHERE status = 'approved' 
       GROUP BY month 
       ORDER BY month ASC 
       LIMIT 12`
    );

    // 5. Daily Collections Timeline (for chart)
    const [collectionChartRes] = await pool.query(
      `SELECT DATE(approved_at) as date, SUM(total_amount) as total 
       FROM payment_collections 
       WHERE status = 'approved' 
       GROUP BY date 
       ORDER BY date ASC 
       LIMIT 15`
    );

    res.json({
      success: true,
      lifetimeDeposited,
      today: todayRes[0]?.total || 0,
      weekly: weekRes[0]?.total || 0,
      monthly: monthRes[0]?.total || 0,
      paymentMethods: paymentMethodRes,
      monthlyChart: monthlyChartRes,
      collectionChart: collectionChartRes
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ==========================================
// 4. SALARY WALLET MODULE
// ==========================================

// GET details & ledger of salary wallet
router.get('/salary-wallet', authenticateToken, async (req, res) => {
  try {
    // 1. Ensure user has a wallet
    await pool.query(
      `INSERT INTO salary_wallets (user_id, user_role, balance, pending_salary, paid_salary) 
       VALUES (?, ?, 0.00, 0.00, 0.00) 
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.user.role]
    );

    const [wallets] = await pool.query('SELECT * FROM salary_wallets WHERE user_id = ? AND user_role = ?', [req.user.id, req.user.role]);
    const wallet = wallets[0];

    // 2. Fetch withdrawal requests history
    const [withdrawals] = await pool.query(
      'SELECT * FROM salary_withdrawals WHERE user_id = ? AND user_role = ? ORDER BY created_at DESC',
      [req.user.id, req.user.role]
    );

    // 3. Fetch ledger logs
    const [ledger] = await pool.query(
      'SELECT * FROM wallet_ledger WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 100',
      [wallet.id]
    );

    // 4. Calculate aggregates
    const [aggregates] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN reference_type = 'commission' AND description LIKE '%repair%' THEN amount ELSE 0.00 END), 0.00) as total_repair_commission,
        COALESCE(SUM(CASE WHEN reference_type = 'commission' AND description LIKE '%accessories%' THEN amount ELSE 0.00 END), 0.00) as total_accessories_commission,
        COALESCE(SUM(CASE WHEN reference_type = 'bonus' THEN amount ELSE 0.00 END), 0.00) as total_bonus,
        COALESCE(SUM(CASE WHEN reference_type = 'incentive' THEN amount ELSE 0.00 END), 0.00) as total_incentive,
        COALESCE(SUM(CASE WHEN reference_type = 'fine' THEN amount ELSE 0.00 END), 0.00) as total_fine,
        COALESCE(SUM(CASE WHEN reference_type = 'advance' THEN amount ELSE 0.00 END), 0.00) as total_advance
       FROM wallet_ledger 
       WHERE wallet_id = ?`,
      [wallet.id]
    );

    res.json({
      success: true,
      wallet,
      withdrawals,
      ledger,
      aggregates: aggregates[0] || {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST submit salary withdrawal request
router.post('/withdraw', authenticateToken, async (req, res) => {
  const { amount, bank_account, upi_id, reason } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });

  try {
    const [wallets] = await pool.query('SELECT * FROM salary_wallets WHERE user_id = ? AND user_role = ?', [req.user.id, req.user.role]);
    if (wallets.length === 0) return res.status(404).json({ success: false, message: 'Wallet not found' });
    const wallet = wallets[0];

    if (wallet.status === 'locked' || wallet.status === 'frozen') {
      return res.status(403).json({ success: false, message: `Your salary wallet is locked or frozen. Please contact Master.` });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient salary wallet balance' });
    }

    // Insert request
    await pool.query(
      `INSERT INTO salary_withdrawals (user_id, user_role, amount, bank_account, upi_id, reason) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, req.user.role, amount, bank_account || null, upi_id || null, reason || null]
    );

    // Freeze withdrawal amount by transferring to pending_salary
    await pool.query(
      'UPDATE salary_wallets SET balance = balance - ?, pending_salary = pending_salary + ? WHERE id = ?',
      [amount, amount, wallet.id]
    );

    // Write debit ledger
    await pool.query(
      `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type) 
       VALUES (?, 'debit', ?, ?, 'withdrawal')`,
      [wallet.id, amount, `Requested salary withdrawal: ${reason || 'No description'}`]
    );

    await logActivity(req, 'REQUEST_WITHDRAWAL', { amount });

    // Notify all masters
    const [masters] = await pool.query('SELECT id FROM master_users');
    for (const m of masters) {
      await sendNotification(
        m.id,
        'master',
        'New Salary Withdrawal Request',
        `${req.user.role.toUpperCase()} employee ${req.user.name} requested withdrawal of ₹${amount}.`,
        'salary'
      );
    }

    res.json({ success: true, message: 'Withdrawal request submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ==========================================
// 5. MASTER SALARY & WALLET CONTROL
// ==========================================

// GET Master: all pending withdrawal requests
router.get('/master/withdrawals', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sw.*, 
       COALESCE(s.name, a.name, t.name) as employee_name,
       COALESCE(s.email, a.email, t.email) as employee_email
       FROM salary_withdrawals sw
       LEFT JOIN staff_members s ON sw.user_role = 'staff' AND sw.user_id = s.id
       LEFT JOIN admins a ON sw.user_role = 'admin' AND sw.user_id = a.id
       LEFT JOIN technicians t ON sw.user_role = 'technician' AND sw.user_id = t.id
       ORDER BY sw.created_at DESC`
    );
    res.json({ success: true, withdrawals: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Approve/Reject withdrawal
router.post('/master/withdraw/:id/approve', authenticateToken, authorize('master'), async (req, res) => {
  const reqId = req.params.id;
  const { action, reason } = req.body; // 'approve' or 'reject'
  
  try {
    const [requests] = await pool.query('SELECT * FROM salary_withdrawals WHERE id = ?', [reqId]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    const wr = requests[0];

    if (wr.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal request is already processed' });
    }

    const [wallets] = await pool.query('SELECT id, balance, pending_salary FROM salary_wallets WHERE user_id = ? AND user_role = ?', [wr.user_id, wr.user_role]);
    if (wallets.length === 0) return res.status(404).json({ success: false, message: 'Wallet not found' });
    const wallet = wallets[0];

    if (action === 'approve') {
      // Transition to 'processing' (2 Days Waiting status)
      await pool.query('UPDATE salary_withdrawals SET status = "processing", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id, reqId]);
      
      await logActivity(req, 'MASTER_APPROVE_WITHDRAWAL', { requestId: reqId, status: 'processing', amount: wr.amount });

      await sendNotification(
        wr.user_id,
        wr.user_role,
        'Salary Withdrawal Approved',
        `Your withdrawal request of ₹${wr.amount} has been approved. Payment will be processed within 2 working days.`,
        'salary'
      );
    } else {
      // Rejected: return money back to wallet balance
      await pool.query('UPDATE salary_withdrawals SET status = "rejected", rejected_by = ? WHERE id = ?', [req.user.id, reqId]);
      
      const newBal = parseFloat(wallet.balance) + parseFloat(wr.amount);
      const newPending = Math.max(0, parseFloat(wallet.pending_salary) - parseFloat(wr.amount));
      
      await pool.query('UPDATE salary_wallets SET balance = ?, pending_salary = ? WHERE id = ?', [newBal, newPending, wallet.id]);

      // Write credit back ledger
      await pool.query(
        `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type) 
         VALUES (?, 'credit', ?, ?, 'withdrawal')`,
        [wallet.id, wr.amount, `Reversal - Withdrawal request rejected: ${reason || ''}`]
      );

      await logActivity(req, 'MASTER_REJECT_WITHDRAWAL', { requestId: reqId, reason });

      await sendNotification(
        wr.user_id,
        wr.user_role,
        'Salary Withdrawal Rejected',
        `Your withdrawal request of ₹${wr.amount} was rejected. Reason: ${reason || 'Not specified'}`,
        'salary'
      );
    }

    res.json({ success: true, message: 'Withdrawal request processed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Confirm salary payment processed
router.post('/master/withdraw/:id/pay', authenticateToken, authorize('master'), async (req, res) => {
  const reqId = req.params.id;
  try {
    const [requests] = await pool.query('SELECT * FROM salary_withdrawals WHERE id = ?', [reqId]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    const wr = requests[0];

    if (wr.status !== 'processing') {
      return res.status(400).json({ success: false, message: 'Request must be approved first and in 2-days waiting status' });
    }

    // 1. Mark as paid
    await pool.query('UPDATE salary_withdrawals SET status = "paid", paid_at = CURRENT_TIMESTAMP WHERE id = ?', [reqId]);

    // 2. Reduce pending_salary and increase paid_salary stats
    const [wallets] = await pool.query('SELECT id, pending_salary, paid_salary FROM salary_wallets WHERE user_id = ? AND user_role = ?', [wr.user_id, wr.user_role]);
    if (wallets.length > 0) {
      const wallet = wallets[0];
      const newPending = Math.max(0, parseFloat(wallet.pending_salary) - parseFloat(wr.amount));
      const newPaid = parseFloat(wallet.paid_salary) + parseFloat(wr.amount);
      await pool.query('UPDATE salary_wallets SET pending_salary = ?, paid_salary = ? WHERE id = ?', [newPending, newPaid, wallet.id]);
    }

    await logActivity(req, 'MASTER_CONFIRM_PAYMENT', { requestId: reqId, amount: wr.amount });

    await sendNotification(
      wr.user_id,
      wr.user_role,
      'Salary Withdrawal Paid',
      `Your withdrawal request of ₹${wr.amount} has been processed. Money transferred to your account!`,
      'salary'
    );

    res.json({ success: true, message: 'Payment status updated to paid successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET Master: All employee commission lists
router.get('/master/commissions', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const [staff] = await pool.query(
      `SELECT sm.id, sm.staff_id as code, sm.name, sm.email, sm.status, 'staff' as role,
       cs.repair_commission, cs.accessories_commission,
       sw.balance as wallet_balance, sw.pending_salary as wallet_pending, sw.paid_salary as wallet_paid, sw.status as wallet_status 
       FROM staff_members sm
       LEFT JOIN commission_settings cs ON cs.user_role = 'staff' AND cs.user_id = sm.id
       LEFT JOIN salary_wallets sw ON sw.user_role = 'staff' AND sw.user_id = sm.id`
    );
    const [admins] = await pool.query(
      `SELECT a.id, a.email as code, a.name, a.email, a.status, 'admin' as role,
       cs.repair_commission, cs.accessories_commission,
       sw.balance as wallet_balance, sw.pending_salary as wallet_pending, sw.paid_salary as wallet_paid, sw.status as wallet_status 
       FROM admins a
       LEFT JOIN commission_settings cs ON cs.user_role = 'admin' AND cs.user_id = a.id
       LEFT JOIN salary_wallets sw ON sw.user_role = 'admin' AND sw.user_id = a.id`
    );
    const [techs] = await pool.query(
      `SELECT t.id, t.email as code, t.name, t.email, t.status, 'technician' as role,
       cs.repair_commission, cs.accessories_commission,
       sw.balance as wallet_balance, sw.pending_salary as wallet_pending, sw.paid_salary as wallet_paid, sw.status as wallet_status 
       FROM technicians t
       LEFT JOIN commission_settings cs ON cs.user_role = 'technician' AND cs.user_id = t.id
       LEFT JOIN salary_wallets sw ON sw.user_role = 'technician' AND sw.user_id = t.id`
    );

    res.json({ success: true, employees: [...staff, ...admins, ...techs] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Update commission settings
router.post('/master/commissions', authenticateToken, authorize('master'), async (req, res) => {
  const { user_id, user_role, repair_commission, accessories_commission } = req.body;
  if (!user_id || !user_role) return res.status(400).json({ success: false, message: 'Invalid target parameters' });

  try {
    await pool.query(
      `INSERT INTO commission_settings (user_id, user_role, repair_commission, accessories_commission) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE repair_commission = ?, accessories_commission = ?, updated_at = CURRENT_TIMESTAMP`,
      [user_id, user_role, repair_commission || 0, accessories_commission || 0, repair_commission || 0, accessories_commission || 0]
    );

    await logActivity(req, 'UPDATE_COMMISSION_SETTINGS', { user_id, user_role, repair_commission, accessories_commission });

    res.json({ success: true, message: 'Commission settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// POST Master: Wallet Control (add bonus, deducations, lock, freeze)
router.post('/master/wallet-control', authenticateToken, authorize('master'), async (req, res) => {
  const { user_id, user_role, action, amount, reason } = req.body;
  if (!user_id || !user_role || !action) return res.status(400).json({ success: false, message: 'Missing required parameters' });

  try {
    // 1. Ensure wallet exists
    await pool.query(
      `INSERT INTO salary_wallets (user_id, user_role, balance, pending_salary, paid_salary) 
       VALUES (?, ?, 0.00, 0.00, 0.00) 
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [user_id, user_role]
    );

    const [wallets] = await pool.query('SELECT * FROM salary_wallets WHERE user_id = ? AND user_role = ?', [user_id, user_role]);
    const wallet = wallets[0];

    let query = '';
    let description = '';
    let type = 'credit';

    if (action === 'bonus' || action === 'incentive' || action === 'manual_credit') {
      query = 'UPDATE salary_wallets SET balance = balance + ? WHERE id = ?';
      description = `Master credited ${action.toUpperCase()}: ${reason || 'No description'}`;
      type = 'credit';
    } else if (action === 'fine' || action === 'advance' || action === 'manual_debit') {
      query = 'UPDATE salary_wallets SET balance = GREATEST(0, balance - ?) WHERE id = ?';
      description = `Master debited ${action.toUpperCase()}: ${reason || 'No description'}`;
      type = 'debit';
    } else if (action === 'lock') {
      query = 'UPDATE salary_wallets SET status = "locked" WHERE id = ?';
      description = 'Salary wallet locked by Master';
    } else if (action === 'unlock') {
      query = 'UPDATE salary_wallets SET status = "active" WHERE id = ?';
      description = 'Salary wallet unlocked by Master';
    } else if (action === 'freeze') {
      query = 'UPDATE salary_wallets SET status = "frozen" WHERE id = ?';
      description = 'Employee wallet frozen by Master';
    } else if (action === 'resume') {
      query = 'UPDATE salary_wallets SET status = "active" WHERE id = ?';
      description = 'Employee wallet resumed by Master';
    }

    if (query) {
      if (['bonus', 'incentive', 'manual_credit', 'fine', 'advance', 'manual_debit'].includes(action)) {
        await pool.query(query, [amount || 0, wallet.id]);
        await pool.query(
          `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type) 
           VALUES (?, ?, ?, ?, ?)`,
          [wallet.id, type, amount || 0, description, action]
        );
      } else {
        await pool.query(query, [wallet.id]);
      }
    }

    await logActivity(req, 'MASTER_WALLET_CONTROL', { user_id, user_role, action, amount, reason });

    await sendNotification(
      user_id,
      user_role,
      'Wallet Updated by Admin',
      `Your wallet status/balance has been updated: ${description}`,
      'salary'
    );

    res.json({ success: true, message: 'Wallet action processed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ==========================================
// 6. REPORTS
// ==========================================

// GET Filterable reports & log details
router.get('/reports', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  const { start_date, end_date, staff_id, admin_id, type } = req.query;
  try {
    let collectionQuery = `
      SELECT pc.*, sm.name as staff_name, a.name as admin_name 
      FROM payment_collections pc
      JOIN staff_members sm ON pc.collected_by = sm.id
      JOIN admins a ON pc.assigned_admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date && end_date) {
      collectionQuery += ' AND DATE(pc.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    if (staff_id) {
      collectionQuery += ' AND pc.collected_by = ?';
      params.push(staff_id);
    }
    if (admin_id) {
      collectionQuery += ' AND pc.assigned_admin_id = ?';
      params.push(admin_id);
    }

    collectionQuery += ' ORDER BY pc.created_at DESC';
    const [collections] = await pool.query(collectionQuery, params);

    // Bank deposits report
    let depositQuery = `
      SELECT bd.*, a.name as admin_name 
      FROM bank_deposits bd
      JOIN admins a ON bd.admin_id = a.id
      WHERE 1=1
    `;
    const depParams = [];
    if (start_date && end_date) {
      depositQuery += ' AND bd.deposit_date BETWEEN ? AND ?';
      depParams.push(start_date, end_date);
    }
    if (admin_id) {
      depositQuery += ' AND bd.admin_id = ?';
      depParams.push(admin_id);
    }
    depositQuery += ' ORDER BY bd.deposit_date DESC';
    const [deposits] = await pool.query(depositQuery, depParams);

    // Salary withdrawals report
    let withdrawalQuery = `
      SELECT sw.*, 
      COALESCE(s.name, a.name, t.name) as employee_name
      FROM salary_withdrawals sw
      LEFT JOIN staff_members s ON sw.user_role = 'staff' AND sw.user_id = s.id
      LEFT JOIN admins a ON sw.user_role = 'admin' AND sw.user_id = a.id
      LEFT JOIN technicians t ON sw.user_role = 'technician' AND sw.user_id = t.id
      WHERE 1=1
    `;
    const swParams = [];
    if (start_date && end_date) {
      withdrawalQuery += ' AND DATE(sw.created_at) BETWEEN ? AND ?';
      swParams.push(start_date, end_date);
    }
    withdrawalQuery += ' ORDER BY sw.created_at DESC';
    const [withdrawals] = await pool.query(withdrawalQuery, swParams);

    // Wallet Ledger logs
    let ledgerQuery = `
      SELECT wl.*, sw.user_role,
      COALESCE(s.name, a.name, t.name) as employee_name
      FROM wallet_ledger wl
      JOIN salary_wallets sw ON wl.wallet_id = sw.id
      LEFT JOIN staff_members s ON sw.user_role = 'staff' AND sw.user_id = s.id
      LEFT JOIN admins a ON sw.user_role = 'admin' AND sw.user_id = a.id
      LEFT JOIN technicians t ON sw.user_role = 'technician' AND sw.user_id = t.id
      WHERE 1=1
    `;
    const ledgerParams = [];
    if (start_date && end_date) {
      ledgerQuery += ' AND DATE(wl.created_at) BETWEEN ? AND ?';
      ledgerParams.push(start_date, end_date);
    }
    ledgerQuery += ' ORDER BY wl.created_at DESC LIMIT 200';
    const [ledgers] = await pool.query(ledgerQuery, ledgerParams);

    res.json({
      success: true,
      collections,
      deposits,
      withdrawals,
      ledgers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET Audit Logs (Master only)
router.get('/audit-logs', authenticateToken, authorize('master'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.*, 
       COALESCE(s.name, a.name, t.name, m.name) as user_name
       FROM activity_logs al
       LEFT JOIN staff_members s ON al.user_role = 'staff' AND al.user_id = s.id
       LEFT JOIN admins a ON al.user_role = 'admin' AND al.user_id = a.id
       LEFT JOIN technicians t ON al.user_role = 'technician' AND al.user_id = t.id
       LEFT JOIN master_users m ON al.user_role = 'master' AND al.user_id = m.id
       ORDER BY al.created_at DESC LIMIT 500`
    );

    const mappedRows = rows.map(r => {
      let parsed = { details: '', device_info: 'unknown' };
      try {
        if (r.description && r.description.startsWith('{')) {
          const data = JSON.parse(r.description);
          parsed.details = typeof data.details === 'object' ? JSON.stringify(data.details) : String(data.details || '');
          parsed.device_info = data.device_info || 'unknown';
        } else {
          parsed.details = r.description || '';
        }
      } catch (e) {
        parsed.details = r.description || '';
      }
      return {
        ...r,
        details: parsed.details,
        device_info: parsed.device_info
      };
    });

    res.json({ success: true, logs: mappedRows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// GET fetch-order details automatically (Staff search)
router.get('/fetch-order/:id', authenticateToken, authorize('staff', 'admin'), async (req, res) => {
  const orderId = req.params.id;
  try {
    // 1. Check if there is already a collection entry for this order in payment_collections
    const [existingCol] = await pool.query(
      `SELECT status, receipt_number, total_amount FROM payment_collections 
       WHERE order_id = ? AND status IN ('pending', 'approved')`,
      [orderId]
    );
    
    if (existingCol.length > 0) {
      const col = existingCol[0];
      if (col.status === 'approved') {
        return res.json({
          success: false,
          alreadyPaid: true,
          message: `Payment Already Completed! (Receipt: ${col.receipt_number || 'N/A'}, Amount: ₹${col.total_amount})`
        });
      } else {
        return res.json({
          success: false,
          alreadyPaid: true,
          message: `Payment collection is already pending Admin approval for this order/repair.`
        });
      }
    }

    // 2. Try searching in repair_requests first
    let repairs = [];
    if (/^\d+$/.test(orderId)) {
      [repairs] = await pool.query(
        `SELECT rr.*, q.total_cost as quotation_amount, i.total_amount as invoice_amount, 
                i.paid_amount, i.balance_amount, i.payment_status as invoice_payment_status,
                t.name as technician_name
         FROM repair_requests rr
         LEFT JOIN quotations q ON q.repair_id = rr.id AND q.status = 'approved'
         LEFT JOIN invoices i ON i.repair_id = rr.id
         LEFT JOIN technicians t ON rr.assigned_technician = t.id
         WHERE rr.id = ?`,
        [Number(orderId)]
      );
    } else {
      [repairs] = await pool.query(
        `SELECT rr.*, q.total_cost as quotation_amount, i.total_amount as invoice_amount, 
                i.paid_amount, i.balance_amount, i.payment_status as invoice_payment_status,
                t.name as technician_name
         FROM repair_requests rr
         LEFT JOIN quotations q ON q.repair_id = rr.id AND q.status = 'approved'
         LEFT JOIN invoices i ON i.repair_id = rr.id
         LEFT JOIN technicians t ON rr.assigned_technician = t.id
         WHERE rr.tracking_number = ?`,
        [orderId]
      );
    }

    if (repairs.length > 0) {
      const r = repairs[0];
      
      // Log the fetch action for security audit
      await logActivity(req, 'FETCH_ORDER_DETAILS', { orderId, orderType: 'repair', trackingNumber: r.tracking_number });

      return res.json({
        success: true,
        orderType: 'mobile_repair',
        data: {
          customer_name: (r.first_name || '') + ' ' + (r.last_name || ''),
          customer_mobile: r.customer_mobile || '',
          customer_address: r.customer_address || 'N/A',
          order_type: 'Repair',
          order_date: r.created_at,
          delivery_date: r.delivered_at || 'Not Delivered Yet',
          device_name: r.device_type || 'Mobile Device',
          brand: r.brand || '',
          imei: r.imei || 'N/A',
          repair_amount: r.invoice_amount || r.quotation_amount || 0.00,
          accessories_amount: 0.00,
          pending_amount: r.balance_amount !== undefined ? r.balance_amount : (r.invoice_amount || r.quotation_amount || 0.00),
          paid_amount: r.paid_amount || 0.00,
          payment_status: r.invoice_payment_status || 'unpaid',
          warranty: r.warranty || 'No Warranty',
          assigned_technician: r.technician_name || 'Not Assigned',
          current_status: r.status
        }
      });
    }

    // 3. Try searching in accessory_orders
    let orders = [];
    if (/^\d+$/.test(orderId)) {
      [orders] = await pool.query(
        `SELECT o.*, c.name as customer_name 
         FROM accessory_orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ?`,
        [Number(orderId)]
      );
    } else {
      [orders] = await pool.query(
        `SELECT o.*, c.name as customer_name 
         FROM accessory_orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.tracking_number = ?`,
        [orderId]
      );
    }

    if (orders.length > 0) {
      const o = orders[0];

      // Fetch items of this order to extract device name (product name) and brand
      const [items] = await pool.query(
        `SELECT oi.*, p.name as product_name, p.brand 
         FROM accessory_order_items oi
         JOIN accessory_products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [o.id]
      );

      const deviceName = items.map(i => i.product_name).join(', ') || 'Accessory Product';
      const brandName = items.map(i => i.brand).filter(Boolean).join(', ') || 'N/A';

      // Log the fetch action for security audit
      await logActivity(req, 'FETCH_ORDER_DETAILS', { orderId, orderType: 'accessories', trackingNumber: o.tracking_number });

      return res.json({
        success: true,
        orderType: 'accessories_store',
        data: {
          customer_name: o.customer_name || 'N/A',
          customer_mobile: o.shipping_mobile || 'N/A',
          customer_address: o.shipping_address || 'N/A',
          order_type: 'Accessories',
          order_date: o.created_at,
          delivery_date: o.estimated_delivery_date || 'N/A',
          device_name: deviceName,
          brand: brandName,
          imei: 'N/A',
          repair_amount: 0.00,
          accessories_amount: o.total_amount,
          pending_amount: o.payment_status === 'paid' ? 0.00 : o.total_amount,
          paid_amount: o.payment_status === 'paid' ? o.total_amount : 0.00,
          payment_status: o.payment_status || 'unpaid',
          warranty: 'N/A',
          assigned_technician: 'N/A',
          current_status: o.order_status
        }
      });
    }

    // 4. If not found in either
    return res.status(404).json({ success: false, message: 'Record Not Found.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

module.exports = router;
