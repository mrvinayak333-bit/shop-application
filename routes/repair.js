const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadRepairPhoto } = require('../middleware/upload');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Delivery photo / payment screenshot upload
const deliveryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'delivery');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `delivery_${Date.now()}_${Math.round(Math.random()*1E9)}${path.extname(file.originalname)}`);
  }
});
const uploadDelivery = multer({ storage: deliveryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Generate unique tracking number: SRM-YYYY-NNNNNN
async function generateTrackingNumber(pool) {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    "SELECT COUNT(*) as cnt FROM repair_requests WHERE tracking_number LIKE ?",
    [`SRM-${year}-%`]
  );
  const count = (rows[0].cnt || 0) + 1;
  return `SRM-${year}-${String(count).padStart(6, '0')}`;
}

// CUSTOMER: Register a repair
router.post('/', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const { device_type, brand, model, imei, issue_description, device_condition, device_condition_multi, accessories, first_name, last_name, customer_mobile, customer_address } = req.body;
    if (!device_type || !brand || !issue_description) {
      return res.status(400).json({ success: false, message: 'Device type, brand and issue description are required' });
    }

    const trackingNumber = await generateTrackingNumber(pool);
    const qrData = `TRACK:${trackingNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const [result] = await pool.query(
      `INSERT INTO repair_requests (tracking_number, customer_id, first_name, last_name, customer_mobile, customer_address, device_type, brand, model, imei, issue_description, device_condition, device_condition_multi, accessories, qr_code, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'registered')`,
      [trackingNumber, req.user.id, first_name || null, last_name || null, customer_mobile || null, customer_address || null, device_type, brand, model, imei, issue_description, device_condition, device_condition_multi || null, accessories, qrCode]
    );

    await pool.query('INSERT INTO repair_status (repair_id, status, notes) VALUES (?,?,?)', [result.insertId, 'registered', 'Repair request registered']);
    await pool.query('UPDATE customers SET total_repairs = total_repairs + 1 WHERE id = ?', [req.user.id]);
    await pool.query('INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?,?,?,?)', [req.user.id, 'customer', 'REPAIR_REGISTER', `Repair registered: ${trackingNumber}`]);

    res.status(201).json({
      success: true, message: 'Your repair request submitted successfully!',
      repair: { id: result.insertId, tracking_number: trackingNumber, qr_code: qrCode }
    });
  } catch (err) {
    console.error('Repair Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUBLIC: Track repair by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.tracking_number, rr.device_type, rr.brand, rr.model, rr.status, rr.created_at, 
       rr.device_condition, rr.gps_location, rr.gps_lat, rr.gps_lng, rr.pickup_by, rr.pickup_date,
       rr.notes, rr.submission_photo, rr.customer_selfie,
       c.name as customer, c.mobile as customer_mobile
       FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id 
       WHERE rr.tracking_number=?`,
      [req.params.trackingNumber]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tracking number not found' });

    const [statusLog] = await pool.query('SELECT status, notes, created_at FROM repair_status WHERE repair_id=(SELECT id FROM repair_requests WHERE tracking_number=?) ORDER BY created_at ASC', [req.params.trackingNumber]);
    res.json({ success: true, repair: rows[0], statusLog });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Get all repairs
router.get('/all', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let query = 'SELECT rr.*, c.name as customer_name, c.mobile, t.name as tech_name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id LEFT JOIN technicians t ON rr.assigned_technician=t.id';
    const params = [];
    if (status) { query += ' WHERE rr.status=?'; params.push(status); }
    query += ' ORDER BY rr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [rows] = await pool.query(query, params);
    res.json({ success: true, repairs: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Assign technician
router.put('/:id/assign', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { technician_id } = req.body;
    await pool.query('UPDATE repair_requests SET assigned_technician=?, status=? WHERE id=?', [technician_id, 'accepted', req.params.id]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)', [req.params.id, 'accepted', 'Technician assigned', req.user.id, req.user.role]);
    res.json({ success: true, message: 'Technician assigned' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Update repair status
router.put('/:id/status', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await pool.query('UPDATE repair_requests SET status=? WHERE id=?', [status, req.params.id]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)', [req.params.id, status, notes || '', req.user.id, req.user.role]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MASTER/ADMIN: Quotation
router.post('/:id/quotation', authenticateToken, authorize('master', 'admin'), async (req, res) => {
  try {
    const { parts_cost, labor_cost, details } = req.body;
    const total = parseFloat(parts_cost || 0) + parseFloat(labor_cost || 0);
    await pool.query('INSERT INTO quotations (repair_id, parts_cost, labor_cost, total_cost, details, status, created_by) VALUES (?,?,?,?,?,?,?)', [req.params.id, parts_cost || 0, labor_cost || 0, total, details, 'sent', req.user.id]);
    res.status(201).json({ success: true, message: 'Quotation created', total });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});


// TECHNICIAN: Pickup verification with photos + GPS
router.post('/:id/pickup', authenticateToken, authorize('technician'), uploadRepairPhoto.fields([
  { name: 'device_photo', maxCount: 1 },
  { name: 'customer_selfie', maxCount: 1 },
]), async (req, res) => {
  try {
    const repairId = req.params.id;
    const { gps_lat, gps_lng, device_condition, problem_notes, otp_code } = req.body;
    if (req.files?.device_photo) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'pickup', '/uploads/repair_photos/' + req.files.device_photo[0].filename, req.user.id]);
    if (req.files?.customer_selfie) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'customer_selfie', '/uploads/repair_photos/' + req.files.customer_selfie[0].filename, req.user.id]);
    await pool.query('INSERT INTO pickup_verification (repair_id, device_photo, customer_selfie, gps_lat, gps_lng, otp_code, device_condition, problem_notes, verified_at) VALUES (?,?,?,?,?,?,?,?,NOW())', [repairId, req.files?.device_photo ? '/uploads/repair_photos/' + req.files.device_photo[0].filename : null, req.files?.customer_selfie ? '/uploads/repair_photos/' + req.files.customer_selfie[0].filename : null, gps_lat || null, gps_lng || null, otp_code || null, device_condition || null, problem_notes || null]);
    await pool.query('UPDATE repair_requests SET status=? WHERE id=?', ['pickup_done', repairId]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)', [repairId, 'pickup_done', 'Pickup verified by technician', req.user.id, 'technician']);
    res.json({ success: true, message: 'Pickup verified successfully' });
  } catch (err) { console.error('Pickup Error:', err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// TECHNICIAN: Upload repair photos
router.post('/:id/photos', authenticateToken, authorize('technician'), uploadRepairPhoto.array('photos', 10), async (req, res) => {
  try {
    const repairId = req.params.id;
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No photos uploaded' });
    for (const file of req.files) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'before', '/uploads/repair_photos/' + file.filename, req.user.id]);
    res.json({ success: true, message: req.files.length + ' photo(s) uploaded' });
  } catch (err) { console.error('Photo Upload Error:', err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUBLIC: Customer view repair by tracking
router.get('/customer/:trackingNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT rr.tracking_number, rr.device_type, rr.brand, rr.model, rr.status, rr.issue_description, rr.estimated_cost, rr.advance_amount, rr.created_at, c.name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.tracking_number=?',
      [req.params.trackingNumber]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const [statusLog] = await pool.query('SELECT status, notes, created_at FROM repair_status WHERE repair_id=(SELECT id FROM repair_requests WHERE tracking_number=?) ORDER BY created_at ASC', [req.params.trackingNumber]);
    const [quotation] = await pool.query('SELECT * FROM quotations WHERE repair_id=(SELECT id FROM repair_requests WHERE tracking_number=?) ORDER BY id DESC LIMIT 1', [req.params.trackingNumber]);

    res.json({ success: true, repair: rows[0], statusLog, quotation: quotation[0] || null });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUBLIC: Quotation PDF (accessible by all roles, supports query token for new window)
router.get('/:id/quotation/pdf', async (req, res) => {
  try {
    // Accept token from query string for new-window access
    let userId = null;
    if (req.query.token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* ignore invalid token */ }
    } else if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* ignore */ }
    }
    // Allow access even without auth (for printing from new window)
    const [qtRows] = await pool.query(
      `SELECT q.*, rr.tracking_number, rr.brand, rr.model, rr.device_type, rr.imei as repair_imei,
       c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address,
       t.name as technician_name
       FROM quotations q
       JOIN repair_requests rr ON q.repair_id=rr.id
       JOIN customers c ON rr.customer_id=c.id
       LEFT JOIN technicians t ON q.created_by=t.id
       WHERE q.repair_id=? ORDER BY q.id DESC LIMIT 1`,
      [req.params.id]
    );
    if (!qtRows.length) return res.status(404).json({ success: false, message: 'Quotation not found' });
    const q = qtRows[0];
    const html = `<!DOCTYPE html><html><head><title>Quotation ${q.job_card_no || 'SRM-' + q.repair_id}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}
    .header{text-align:center;border-bottom:3px solid #059669;padding-bottom:20px;margin-bottom:20px}
    .header h1{color:#059669;margin:0}.header p{margin:5px 0;color:#666}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0}
    .info-box{background:#f9fafb;padding:15px;border-radius:8px;border:1px solid #e5e7eb}
    .info-box h3{margin:0 0 8px;color:#059669;font-size:14px}.info-box p{margin:3px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#059669;color:white;padding:10px;text-align:left}
    td{padding:10px;border-bottom:1px solid #e5e7eb}
    .total-row{font-weight:bold;font-size:16px;background:#f0fdf4}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#999}
    .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold}
    .status-sent{background:#fef3c7;color:#92400e}.status-approved{background:#d1fae5;color:#065f46}
    .status-rejected{background:#fee2e2;color:#991b1b}
    @media print{body{padding:0}}</style></head><body>
    <div class="header"><h1>SHREE RAAM MOBILE</h1><p>Professional Mobile Repair Service</p><p>Solapur, Maharashtra | +91 95522 10333</p></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h2 style="margin:0">QUOTATION INVOICE</h2>
    <span class="status status-${q.status}">${q.status.toUpperCase()}</span></div>
    <div class="info-grid">
    <div class="info-box"><h3>Customer Details</h3><p><b>Name:</b> ${q.customer_name || 'N/A'}</p><p><b>Mobile:</b> ${q.customer_mobile || 'N/A'}</p><p><b>Address:</b> ${q.customer_address || 'N/A'}</p></div>
    <div class="info-box"><h3>Device Details</h3><p><b>Device:</b> ${q.device_name || q.brand + ' ' + q.model}</p><p><b>IMEI:</b> ${q.imei || q.repair_imei || 'N/A'}</p><p><b>Tracking:</b> ${q.tracking_number}</p></div>
    <div class="info-box"><h3>Quotation Info</h3><p><b>Job Card:</b> ${q.job_card_no || 'SRM-' + q.repair_id}</p><p><b>Date:</b> ${new Date(q.created_at).toLocaleDateString()}</p><p><b>Technician:</b> ${q.technician_name || 'N/A'}</p></div>
    <div class="info-box"><h3>Repair Info</h3><p><b>Device Type:</b> ${q.device_type || 'N/A'}</p><p><b>Est. Days:</b> ${q.estimated_days || 3}</p><p><b>Status:</b> ${q.status.toUpperCase()}</p></div>
    </div>
    ${q.diagnosis ? `<div style="margin:15px 0;padding:10px;background:#eff6ff;border-radius:8px"><b>Diagnosis:</b> ${q.diagnosis}</div>` : ''}
    ${q.spare_parts ? `<div style="margin:15px 0;padding:10px;background:#fefce8;border-radius:8px"><b>Spare Parts:</b> ${q.spare_parts}</div>` : ''}
    <table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    <tr><td>Parts Cost</td><td style="text-align:right">Rs.${parseFloat(q.parts_cost || 0).toFixed(2)}</td></tr>
    <tr><td>Labor Charges</td><td style="text-align:right">Rs.${parseFloat(q.labor_cost || 0).toFixed(2)}</td></tr>
    <tr><td>Other Charges</td><td style="text-align:right">Rs.${parseFloat(q.other_charges || 0).toFixed(2)}</td></tr>
    <tr><td>Discount</td><td style="text-align:right">-Rs.${parseFloat(q.discount || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td>Total Amount</td><td style="text-align:right">Rs.${parseFloat(q.total_cost || 0).toFixed(2)}</td></tr></table>
    ${q.notes ? `<div style="margin:15px 0;padding:10px;background:#f9fafb;border-radius:8px"><b>Notes:</b> ${q.notes}</div>` : ''}
    <div style="margin-top:40px;display:flex;justify-content:space-between">
    <div><p>_________________________</p><p>Customer Signature</p></div>
    <div><p>_________________________</p><p>Authorized Signature</p></div></div>
    <div class="footer"><p>This is a computer-generated quotation. | Thank you for choosing SHREE RAAM MOBILE.</p>
    <p>Terms: Quotation valid for 7 days. Advance payment may be required for spare parts.</p></div>
    <script>window.onload=function(){window.print()}</script></body></html>`;
    res.send(html);
  } catch (err) { console.error('PDF error:', err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ANY AUTHENTICATED USER: Approve/reject quotation (customer calls this)
router.put('/:id/quotation/approve', authenticateToken, async (req, res) => {
  try {
    const { approved, reject_reason } = req.body;
    const repairId = req.params.id;

    const [qt] = await pool.query('SELECT id FROM quotations WHERE repair_id=? ORDER BY id DESC LIMIT 1', [repairId]);
    if (!qt.length) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // Update quotation with approval data
    if (approved) {
      await pool.query('UPDATE quotations SET status=?, approved_at=NOW() WHERE id=?', ['approved', qt[0].id]);
    } else {
      await pool.query('UPDATE quotations SET status=?, reject_reason=?, approved_at=NOW() WHERE id=?', ['rejected', reject_reason || '', qt[0].id]);
    }

    // Update repair status
    const newRepairStatus = approved ? 'customer_approved' : 'cancelled';
    await pool.query('UPDATE repair_requests SET status=? WHERE id=?', [newRepairStatus, repairId]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by_role) VALUES (?,?,?,?)',
      [repairId, newRepairStatus, approved ? 'Customer approved quotation' : `Customer rejected quotation. Reason: ${reject_reason || 'Not provided'}`, 'customer']);

    // Get repair details for notifications
    const [repairRows] = await pool.query(
      'SELECT tracking_number, assigned_technician, customer_id FROM repair_requests WHERE id=?',
      [repairId]
    );

    if (repairRows.length) {
      const repair = repairRows[0];

      // Notify technician
      if (repair.assigned_technician) {
        await pool.query(
          'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
          [repair.assigned_technician, 'technician',
            approved ? 'Quotation Approved' : 'Quotation Rejected',
            approved ? `Customer approved quotation for ${repair.tracking_number}. You can now start repair.` : `Customer rejected quotation for ${repair.tracking_number}. Reason: ${reject_reason || 'Not provided'}`,
            'quotation']
        );
      }

      // Notify master panel
      await pool.query(
        'INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)',
        ['master',
          approved ? 'Quotation Approved' : 'Quotation Rejected',
          approved ? `Customer approved quotation for ${repair.tracking_number}` : `Customer rejected quotation for ${repair.tracking_number}`,
          'quotation']
      );

      // Notify customer
      await pool.query(
        'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
        [repair.customer_id, 'customer',
          approved ? 'Quotation Approved Successfully' : 'Quotation Rejected Successfully',
          approved ? `You approved the quotation for ${repair.tracking_number}. Repair will continue.` : `You rejected the quotation for ${repair.tracking_number}.`,
          'quotation']
      );
    }

    res.json({ success: true, message: approved ? 'Quotation approved' : 'Quotation rejected' });
  } catch (err) {
    console.error('Quotation approval error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// DELIVERY WORKFLOW ENDPOINTS
// ============================================================

// STEP 1: TECHNICIAN marks repair as completed
router.put('/:id/repair-complete', authenticateToken, authorize('technician'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const techId = req.user.id;
    const { notes } = req.body;

    const [repair] = await pool.query(
      'SELECT * FROM repair_requests WHERE id=? AND assigned_technician=?', [repairId, techId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found' });

    // Must have approved quotation to complete
    const [qt] = await pool.query("SELECT id FROM quotations WHERE repair_id=? AND status='approved' ORDER BY id DESC LIMIT 1", [repairId]);
    if (!qt.length) return res.status(400).json({ success: false, message: 'Cannot complete repair without approved quotation' });

    await pool.query(
      "UPDATE repair_requests SET status='repair_completed', repair_completed_at=NOW(), repair_completion_notes=? WHERE id=?",
      [notes || '', repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'repair_completed', notes || 'Repair completed by technician', techId, 'technician']
    );

    const r = repair[0];
    // Notify admin
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['admin', 'Repair Completed - Awaiting Verification',
       `Repair for ${r.tracking_number} (${r.brand} ${r.model}) has been completed. Please verify for delivery.`,
       'delivery']
    );
    // Notify master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Repair Completed',
       `Repair for ${r.tracking_number} completed by technician. Awaiting admin verification.`,
       'delivery']
    );
    // Notify customer
    await pool.query(
      "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
      [r.customer_id, 'customer', 'Repair Completed!',
       `Your device ${r.tracking_number} repair has been completed successfully. Awaiting admin verification for delivery.`,
       'delivery']
    );

    res.json({ success: true, message: 'Repair marked as completed. Admin will verify for delivery.' });
  } catch (err) {
    console.error('Repair complete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 2: ADMIN verifies completed repair (accept or reject)
router.put('/:id/admin-delivery-verify', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const adminId = req.user.id;
    const { approved, reject_reason } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND status='repair_completed'", [repairId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not in completed status' });

    const r = repair[0];

    if (approved) {
      await pool.query(
        "UPDATE repair_requests SET status='admin_approved_delivery', admin_verified_at=NOW(), admin_verified_by=? WHERE id=?",
        [adminId, repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'admin_approved_delivery', 'Repair verified and approved by admin for delivery', adminId, 'admin']
      );
      // Notify technician
      if (r.assigned_technician) {
        await pool.query(
          "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
          [r.assigned_technician, 'technician', 'Repair Approved for Delivery',
           `Admin approved repair for ${r.tracking_number}. Please hand over device to admin.`,
           'delivery']
        );
      }
      // Notify master
      await pool.query(
        "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
        ['master', 'Repair Approved for Delivery',
         `Admin verified repair for ${r.tracking_number}`, 'delivery']
      );
      res.json({ success: true, message: 'Repair approved for delivery' });
    } else {
      await pool.query(
        "UPDATE repair_requests SET status='admin_rejected_delivery' WHERE id=?",
        [repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'admin_rejected_delivery', `Rejected: ${reject_reason || 'Not specified'}`, adminId, 'admin']
      );
      // Notify technician
      if (r.assigned_technician) {
        await pool.query(
          "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
          [r.assigned_technician, 'technician', 'Repair Rejected by Admin',
           `Admin rejected repair for ${r.tracking_number}. Reason: ${reject_reason || 'Not specified'}. Please fix and resubmit.`,
           'delivery']
        );
      }
      res.json({ success: true, message: 'Repair rejected and returned to technician' });
    }
  } catch (err) {
    console.error('Admin delivery verify error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 3: TECHNICIAN hands over device to admin
router.put('/:id/handover-to-admin', authenticateToken, authorize('technician'), uploadDelivery.single('photo'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const techId = req.user.id;
    const { device_condition, accessories, technician_signature, admin_signature, notes } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND assigned_technician=? AND status IN ('admin_approved_delivery','admin_rejected_delivery')",
      [repairId, techId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not approved for handover' });

    const r = repair[0];
    const photoPath = req.file ? '/uploads/delivery/' + req.file.filename : null;

    await pool.query(
      "UPDATE repair_requests SET status='handed_to_admin', handover_at=NOW(), handover_technician_signature=?, handover_admin_signature=?, handover_device_condition=?, handover_accessories=? WHERE id=?",
      [technician_signature || null, admin_signature || null, device_condition || '', accessories || '', repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'handed_to_admin', `Device handed over to admin. Condition: ${device_condition || 'N/A'}`, techId, 'technician']
    );
    await pool.query(
      'INSERT INTO delivery_handover_log (repair_id, from_role, to_role, from_user_id, device_condition, accessories_checklist, signature_from, signature_to, photo, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [repairId, 'technician', 'admin', techId, device_condition || '', accessories || '', technician_signature || null, admin_signature || null, photoPath, notes || '']
    );

    // Notify admin
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['admin', 'Device Handed Over',
       `Technician handed over device for ${r.tracking_number}. Please verify and mark ready for customer.`,
       'delivery']
    );
    // Notify master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Device Handed Over to Admin',
       `Technician handed over device for ${r.tracking_number}`, 'delivery']
    );

    res.json({ success: true, message: 'Device handed over to admin successfully' });
  } catch (err) {
    console.error('Handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 4: ADMIN marks device ready for customer delivery
router.put('/:id/ready-for-customer', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const adminId = req.user.id;
    const { delivery_type } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND status='handed_to_admin'", [repairId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not handed over yet' });

    const r = repair[0];
    await pool.query(
      "UPDATE repair_requests SET status='ready_to_deliver', delivery_type_option=? WHERE id=?",
      [delivery_type || 'pickup', repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'ready_to_deliver', `Device ready for customer (${delivery_type || 'pickup'})`, adminId, 'admin']
    );

    // Notify customer
    await pool.query(
      "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
      [r.customer_id, 'customer', 'Your Device is Ready!',
       `Your device repair (${r.tracking_number}) has been completed successfully and is ready for ${delivery_type || 'pickup'}. Please collect it from our shop.`,
       'delivery']
    );
    // Notify master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Device Ready for Customer',
       `Device for ${r.tracking_number} is ready for customer delivery`, 'delivery']
    );

    res.json({ success: true, message: 'Device marked as ready for customer delivery' });
  } catch (err) {
    console.error('Ready for customer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 5: CUSTOMER confirms receiving the device
router.put('/:id/customer-receive', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const customerId = req.user.id;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND customer_id=? AND status='ready_to_deliver'",
      [repairId, customerId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not ready for delivery' });

    const r = repair[0];
    await pool.query(
      "UPDATE repair_requests SET status='customer_received', delivered_at=NOW() WHERE id=?",
      [repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'customer_received', 'Customer received the device', customerId, 'customer']
    );

    // Notify admin & master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['admin', 'Customer Received Device',
       `Customer received device for ${r.tracking_number}. Awaiting customer confirmation.`, 'delivery']
    );
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Customer Received Device',
       `Customer received device for ${r.tracking_number}`, 'delivery']
    );

    res.json({ success: true, message: 'Device received. Please confirm if it is working properly.' });
  } catch (err) {
    console.error('Customer receive error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 6: CUSTOMER confirms device working or reports issue
router.put('/:id/customer-confirm', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const customerId = req.user.id;
    const { confirmed, issue_description } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND customer_id=? AND status='customer_received'",
      [repairId, customerId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not received yet' });

    const r = repair[0];

    if (confirmed) {
      await pool.query(
        "UPDATE repair_requests SET status='customer_confirmed', customer_confirmed_at=NOW() WHERE id=?",
        [repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'customer_confirmed', 'Customer confirmed device is working properly', customerId, 'customer']
      );
      // Notify admin
      await pool.query(
        "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
        ['admin', 'Customer Confirmed Device Working',
         `Customer confirmed device for ${r.tracking_number} is working. Ready for payment.`, 'delivery']
      );
      res.json({ success: true, message: 'Thank you for confirming! Please proceed with payment.' });
    } else {
      await pool.query(
        "UPDATE repair_requests SET status='customer_issue_reported' WHERE id=?",
        [repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'customer_issue_reported', `Issue reported: ${issue_description || 'Not specified'}`, customerId, 'customer']
      );
      // Notify admin & technician
      await pool.query(
        "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
        ['admin', 'Customer Reported Issue',
         `Customer reported issue with ${r.tracking_number}: ${issue_description || 'Not specified'}`, 'delivery']
      );
      if (r.assigned_technician) {
        await pool.query(
          "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
          [r.assigned_technician, 'technician', 'Customer Reported Issue',
           `Customer reported issue with ${r.tracking_number}: ${issue_description || 'Not specified'}. Please check.`,
           'delivery']
        );
      }
      res.json({ success: true, message: 'Issue reported. Our team will look into it.' });
    }
  } catch (err) {
    console.error('Customer confirm error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 7: CUSTOMER makes payment
router.post('/:id/payment', authenticateToken, authorize('customer'), uploadDelivery.single('screenshot'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const customerId = req.user.id;
    const { amount, payment_method, transaction_id } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND customer_id=? AND status='customer_confirmed'",
      [repairId, customerId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not confirmed yet' });

    const r = repair[0];
    const [qt] = await pool.query(
      'SELECT * FROM quotations WHERE repair_id=? AND status="approved" ORDER BY id DESC LIMIT 1', [repairId]
    );
    const totalAmount = qt.length ? parseFloat(qt[0].total_cost) : parseFloat(amount || 0);
    const paidAmount = parseFloat(amount || totalAmount);

    const screenshotPath = req.file ? '/uploads/delivery/' + req.file.filename : null;

    // Create invoice
    const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();
    const subtotal = totalAmount;
    const taxPercent = 0;
    const taxAmount = 0;
    const discount = 0;
    const total = subtotal + taxAmount - discount;

    await pool.query(
      'INSERT INTO invoices (invoice_number, repair_id, customer_id, subtotal, tax_percent, tax_amount, discount, total_amount, paid_amount, balance_amount, payment_status, payment_method, invoice_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURDATE())',
      [invoiceNumber, repairId, customerId, subtotal, taxPercent, taxAmount, discount, total, paidAmount, total - paidAmount, 'paid', payment_method]
    );

    // Record payment
    const [[invoice]] = await pool.query('SELECT id FROM invoices WHERE invoice_number=?', [invoiceNumber]);
    await pool.query(
      'INSERT INTO payments (invoice_id, customer_id, amount, payment_method, transaction_id, payment_status) VALUES (?,?,?,?,?,?)',
      [invoice.id, customerId, paidAmount, payment_method, transaction_id || '', 'completed']
    );

    await pool.query(
      "UPDATE repair_requests SET status='payment_done', payment_screenshot=? WHERE id=?",
      [screenshotPath, repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'payment_done', `Payment of Rs.${paidAmount} made via ${payment_method}`, customerId, 'customer']
    );

    // Notify admin for verification
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['admin', 'Payment Received - Verify',
       `Customer paid Rs.${paidAmount} for ${r.tracking_number} via ${payment_method}. Please verify.`,
       'payment']
    );
    // Notify master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Payment Received',
       `Payment of Rs.${paidAmount} received for ${r.tracking_number} via ${payment_method}`, 'payment']
    );

    res.json({ success: true, message: 'Payment recorded successfully', invoice_number: invoiceNumber, amount: paidAmount });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 8: ADMIN verifies payment
router.put('/:id/verify-payment', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const adminId = req.user.id;
    const { verified } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND status='payment_done'", [repairId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or payment not done yet' });

    const r = repair[0];

    if (verified) {
      await pool.query(
        "UPDATE repair_requests SET status='payment_verified', payment_verified_by=?, payment_verified_at=NOW() WHERE id=?",
        [adminId, repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'payment_verified', 'Payment verified by admin', adminId, 'admin']
      );
      // Notify customer
      await pool.query(
        "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
        [r.customer_id, 'customer', 'Payment Verified',
         `Your payment for ${r.tracking_number} has been verified. Thank you!`, 'payment']
      );
      // Notify master
      await pool.query(
        "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
        ['master', 'Payment Verified',
         `Payment verified for ${r.tracking_number}`, 'payment']
      );
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      await pool.query(
        "UPDATE repair_requests SET status='customer_confirmed' WHERE id=?",
        [repairId]
      );
      await pool.query(
        'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
        [repairId, 'customer_confirmed', 'Payment verification rejected by admin', adminId, 'admin']
      );
      // Notify customer
      await pool.query(
        "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
        [r.customer_id, 'customer', 'Payment Verification Failed',
         `Your payment for ${r.tracking_number} could not be verified. Please try again.`, 'payment']
      );
      res.json({ success: true, message: 'Payment verification rejected' });
    }
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 9: ADMIN final delivery with OTP
router.put('/:id/final-delivery', authenticateToken, authorize('admin'), uploadDelivery.single('delivery_photo'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const adminId = req.user.id;
    const { otp, delivered_by_name, customer_signature, notes } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND status IN ('payment_verified','payment_done')",
      [repairId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or payment not verified' });

    const r = repair[0];
    const photoPath = req.file ? '/uploads/delivery/' + req.file.filename : null;

    // Verify OTP if provided
    if (otp && r.delivery_otp && otp !== r.delivery_otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    await pool.query(
      "UPDATE repair_requests SET status='successfully_delivered', delivered_at=NOW(), delivered_by=?, customer_signature=?, delivery_photo=? WHERE id=?",
      [delivered_by_name || req.user.name, customer_signature || null, photoPath, repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'successfully_delivered', `Delivered by ${delivered_by_name || req.user.name}`, adminId, 'admin']
    );
    await pool.query(
      'INSERT INTO delivery_handover_log (repair_id, from_role, to_role, from_user_id, notes, photo) VALUES (?,?,?,?,?,?)',
      [repairId, 'admin', 'customer', adminId, notes || 'Final delivery', photoPath]
    );
    await pool.query('UPDATE technicians SET total_repairs=total_repairs+1 WHERE id=?', [r.assigned_technician]);

    // Notify customer
    await pool.query(
      "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
      [r.customer_id, 'customer', 'Device Successfully Delivered!',
       `Your device (${r.tracking_number}) has been successfully delivered. Thank you for choosing SHREE RAAM MOBILE!`,
       'delivery']
    );
    // Notify master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'Device Successfully Delivered',
       `Device for ${r.tracking_number} has been delivered to customer`, 'delivery']
    );

    res.json({ success: true, message: 'Device delivered successfully!' });
  } catch (err) {
    console.error('Final delivery error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// STEP 10: CUSTOMER submits feedback
router.post('/:id/feedback', authenticateToken, authorize('customer'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const customerId = req.user.id;
    const { rating, comments } = req.body;

    const [repair] = await pool.query(
      "SELECT * FROM repair_requests WHERE id=? AND customer_id=? AND status IN ('successfully_delivered','delivered')",
      [repairId, customerId]
    );
    if (!repair.length) return res.status(404).json({ success: false, message: 'Repair not found or not delivered yet' });

    const r = repair[0];
    await pool.query(
      "UPDATE repair_requests SET status='feedback_given', feedback_rating=?, feedback_comments=?, feedback_at=NOW() WHERE id=?",
      [parseInt(rating) || 5, comments || '', repairId]
    );
    await pool.query(
      'INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'feedback_given', `Customer rated: ${rating} stars`, customerId, 'customer']
    );

    // Notify admin & master
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['admin', 'New Customer Feedback',
       `Customer gave ${rating} stars for ${r.tracking_number}: ${comments || 'No comments'}`, 'feedback']
    );
    await pool.query(
      "INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)",
      ['master', 'New Customer Feedback',
       `Customer rated ${rating} stars for ${r.tracking_number}`, 'feedback']
    );

    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate delivery OTP
router.post('/:id/generate-otp', authenticateToken, authorize('admin', 'technician'), async (req, res) => {
  try {
    const repairId = req.params.id;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await pool.query("UPDATE repair_requests SET delivery_otp=? WHERE id=?", [otp, repairId]);

    const [repair] = await pool.query('SELECT tracking_number, customer_id FROM repair_requests WHERE id=?', [repairId]);
    if (repair.length) {
      const r = repair[0];
      await pool.query(
        "INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)",
        [r.customer_id, 'customer', 'Delivery OTP Generated',
         `Your delivery OTP for ${r.tracking_number} is: ${otp}. Share this with the delivery person.`,
         'delivery']
      );
    }

    res.json({ success: true, otp, message: 'OTP generated and sent to customer' });
  } catch (err) {
    console.error('OTP generation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get full delivery timeline for a repair
router.get('/:id/delivery-timeline', authenticateToken, async (req, res) => {
  try {
    const repairId = req.params.id;
    const [statusLog] = await pool.query(
      'SELECT * FROM repair_status WHERE repair_id=? ORDER BY created_at ASC', [repairId]
    );
    const [handoverLog] = await pool.query(
      'SELECT * FROM delivery_handover_log WHERE repair_id=? ORDER BY created_at ASC', [repairId]
    );
    const [repair] = await pool.query(
      'SELECT id, tracking_number, status, repair_completed_at, admin_verified_at, handover_at, customer_confirmed_at, delivered_at, feedback_rating, feedback_comments, feedback_at, payment_screenshot, payment_verified_at, delivery_otp FROM repair_requests WHERE id=?',
      [repairId]
    );
    res.json({ success: true, statusLog, handoverLog, repair: repair[0] || null });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get repairs pending admin delivery verification
router.get('/delivery/pending-verification', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile, t.name as tech_name
       FROM repair_requests rr
       JOIN customers c ON rr.customer_id=c.id
       LEFT JOIN technicians t ON rr.assigned_technician=t.id
       WHERE rr.status='repair_completed'
       ORDER BY rr.repair_completed_at DESC`
    );
    res.json({ success: true, repairs: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get repairs pending payment verification
router.get('/delivery/pending-payment', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile, q.total_cost
       FROM repair_requests rr
       JOIN customers c ON rr.customer_id=c.id
       LEFT JOIN quotations q ON rr.id = q.repair_id AND q.id = (SELECT MAX(id) FROM quotations WHERE repair_id = rr.id AND status='approved')
       WHERE rr.status='payment_done'
       ORDER BY rr.updated_at DESC`
    );
    res.json({ success: true, repairs: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get repairs ready for delivery
router.get('/delivery/ready', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile, t.name as tech_name
       FROM repair_requests rr
       JOIN customers c ON rr.customer_id=c.id
       LEFT JOIN technicians t ON rr.assigned_technician=t.id
       WHERE rr.status IN ('handed_to_admin','ready_to_deliver','admin_approved_delivery')
       ORDER BY rr.updated_at DESC`
    );
    res.json({ success: true, repairs: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
