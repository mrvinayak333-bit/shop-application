const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorize('technician'));

router.get('/dashboard', async (req, res) => {
  try {
    const techId = req.user.id;
    const [[tech]] = await pool.query('SELECT id,name,email,mobile,specialization,total_repairs,rating,commission_percent FROM technicians WHERE id=?', [techId]);
    const [[{ activeJobs }]] = await pool.query("SELECT COUNT(*) as activeJobs FROM repair_requests WHERE assigned_technician=? AND status NOT IN ('delivered','cancelled')", [techId]);
    const [[{ completedJobs }]] = await pool.query("SELECT COUNT(*) as completedJobs FROM repair_requests WHERE assigned_technician=? AND status='delivered'", [techId]);
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) as pending FROM repair_requests WHERE assigned_technician=? AND status IN ('received_center','under_diagnosis','inspection_done','quotation_sent','customer_approved')", [techId]);
    const [[{ completedToday }]] = await pool.query("SELECT COUNT(*) as completedToday FROM repair_requests WHERE assigned_technician=? AND status='delivered' AND DATE(updated_at)=CURDATE()", [techId]);
    const [[{ commissionEarned }]] = await pool.query('SELECT COALESCE(SUM(amount),0) as commissionEarned FROM commission WHERE technician_id=?', [techId]);
    const [[{ totalEarnings }]] = await pool.query('SELECT COALESCE(SUM(amount),0) as totalEarnings FROM commission WHERE technician_id=?', [techId]);
    const [[{ thisMonthEarnings }]] = await pool.query('SELECT COALESCE(SUM(amount),0) as thisMonthEarnings FROM commission WHERE technician_id=? AND MONTH(created_at)=MONTH(CURDATE()) AND YEAR(created_at)=YEAR(CURDATE())', [techId]);
    const [[{ inProgress }]] = await pool.query("SELECT COUNT(*) as inProgress FROM repair_requests WHERE assigned_technician=? AND status IN ('waiting_parts','repair_started','ic_repair','software_install','testing','quality_test','ready_delivery')", [techId]);
    const [[{ awaitingParts }]] = await pool.query("SELECT COUNT(*) as awaitingParts FROM repair_requests WHERE assigned_technician=? AND status='waiting_parts'", [techId]);

    // Recent repairs
    const [recentRepairs] = await pool.query(
      `SELECT rr.id, rr.tracking_number, rr.device_type, rr.brand, rr.model, rr.status, rr.created_at, rr.updated_at,
       c.name as customer_name, c.mobile as customer_mobile
       FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id
       WHERE rr.assigned_technician=? ORDER BY rr.updated_at DESC LIMIT 10`,
      [techId]
    );

    // Recent notifications
    const [notifications] = await pool.query(
      "SELECT * FROM notifications WHERE (user_id=? AND user_role='technician') OR (user_role='technician' AND user_id IS NULL) ORDER BY created_at DESC LIMIT 5",
      [techId]
    );

    // Commission history
    const [commissionHistory] = await pool.query(
      'SELECT * FROM commission WHERE technician_id=? ORDER BY created_at DESC LIMIT 10',
      [techId]
    );

    res.json({
      success: true,
      tech: tech || {},
      stats: {
        activeJobs, completedJobs, pending, completedToday, commissionEarned,
        totalEarnings, thisMonthEarnings, inProgress, awaitingParts
      },
      recentRepairs,
      notifications,
      commissionHistory
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/repair/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const repairId = req.params.id;
    const techId = req.user.id;
    
    // Update repair status
    await pool.query('UPDATE repair_requests SET status=? WHERE id=? AND assigned_technician=?', [status, repairId, techId]);
    
    // Log status change
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)', 
      [repairId, status, notes || '', techId, 'technician']);

    // Get repair details for notifications
    const [repairRows] = await pool.query(
      'SELECT tracking_number, customer_id, assigned_technician FROM repair_requests WHERE id=?', 
      [repairId]
    );
    
    if (repairRows.length) {
      const repair = repairRows[0];
      const statusLabels = {
        'received_center': 'Device Received',
        'under_diagnosis': 'Inspection Started',
        'inspection_done': 'Inspection Completed',
        'quotation_sent': 'Quotation Sent',
        'customer_approved': 'Customer Approved',
        'waiting_parts': 'Waiting for Spare Parts',
        'repair_started': 'Repair Started',
        'ic_repair': 'IC Level Repair',
        'software_install': 'Software Installation',
        'testing': 'Testing',
        'quality_test': 'Quality Testing',
        'ready_delivery': 'Ready for Delivery',
        'repair_completed': 'Repair Completed',
        'admin_approved_delivery': 'Admin Approved for Delivery',
        'admin_rejected_delivery': 'Admin Rejected',
        'handed_to_admin': 'Handed to Admin',
        'ready_to_deliver': 'Ready to Deliver',
        'out_delivery': 'Out for Delivery',
        'customer_received': 'Customer Received',
        'customer_confirmed': 'Customer Confirmed',
        'customer_issue_reported': 'Issue Reported',
        'payment_done': 'Payment Done',
        'payment_verified': 'Payment Verified',
        'successfully_delivered': 'Successfully Delivered',
        'feedback_given': 'Feedback Given',
        'delivered': 'Delivered'
      };
      
      const statusLabel = statusLabels[status] || status;
      
      // Notify customer
      await pool.query(
        'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
        [repair.customer_id, 'customer', `Repair Status Updated`, `Your device ${repair.tracking_number} status: ${statusLabel}`, 'status_update']
      );
      
      // Notify master panel
      await pool.query(
        'INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)',
        ['master', `Repair Status Updated`, `Repair ${repair.tracking_number} status: ${statusLabel}`, 'status_update']
      );
      
      // If delivered, update technician stats
      if (status === 'delivered') {
        await pool.query('UPDATE technicians SET total_repairs=total_repairs+1 WHERE id=?', [techId]);
      }
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ success: false, message: 'Server error' }); 
  }
});

router.get('/repair/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT rr.*, c.name as customer, c.mobile, c.address FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.id=? AND rr.assigned_technician=?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Repair not found' });
    const [statusLog] = await pool.query('SELECT * FROM repair_status WHERE repair_id=? ORDER BY created_at ASC', [req.params.id]);
    const [quotation] = await pool.query('SELECT * FROM quotations WHERE repair_id=? ORDER BY id DESC LIMIT 1', [req.params.id]);
    const [handoverLog] = await pool.query('SELECT * FROM delivery_handover_log WHERE repair_id=? ORDER BY created_at ASC', [req.params.id]);
    res.json({ success: true, repair: rows[0], statusLog, quotation: quotation[0] || null, handoverLog });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Create Quotation (Enhanced)
router.post('/repair/:id/quotation', async (req, res) => {
  try {
    const repairId = req.params.id;
    const techId = req.user.id;
    const { parts_cost, labor_cost, spare_parts, diagnosis, estimated_days,
            customer_name, device_name, imei, job_card_no,
            other_charges, discount, notes: quotation_notes } = req.body;

    // Prevent duplicate quotations
    const [existing] = await pool.query(
      "SELECT id FROM quotations WHERE repair_id=? AND status IN ('sent','approved') ORDER BY id DESC LIMIT 1",
      [repairId]
    );
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Quotation already sent for this repair' });
    }

    // Get repair details for auto-fill
    const [repRows] = await pool.query(
      'SELECT rr.tracking_number, rr.customer_id, rr.brand, rr.model, rr.imei, c.name as customer_name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.id=?',
      [repairId]
    );
    if (!repRows.length) return res.status(404).json({ success: false, message: 'Repair not found' });

    const rep = repRows[0];
    const partsCost = parseFloat(parts_cost || 0);
    const laborCost = parseFloat(labor_cost || 0);
    const otherCharges = parseFloat(other_charges || 0);
    const discountAmt = parseFloat(discount || 0);
    const total = partsCost + laborCost + otherCharges - discountAmt;
    const jobCard = job_card_no || `SRM-${repairId}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;

    await pool.query(
      `INSERT INTO quotations (repair_id, parts_cost, labor_cost, total_cost, spare_parts, diagnosis, estimated_days,
       customer_name, device_name, imei, job_card_no, other_charges, discount, notes, details, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [repairId, partsCost, laborCost, total, spare_parts || '', diagnosis || '', estimated_days || 3,
       customer_name || rep.customer_name, device_name || `${rep.brand} ${rep.model}`,
       imei || rep.imei || '', jobCard, otherCharges, discountAmt, quotation_notes || '',
       JSON.stringify(req.body), 'sent', techId]
    );

    await pool.query('UPDATE repair_requests SET status=? WHERE id=?', ['quotation_sent', repairId]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'quotation_sent', `Quotation created: Rs.${total}. Job Card: ${jobCard}`, techId, 'technician']);

    // Notify customer
    await pool.query(
      'INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
      [rep.customer_id, 'customer', 'Quotation Ready',
       `Your repair quotation for ${rep.tracking_number} is ready. Amount: Rs.${total}. Please review and approve or reject.`,
       'quotation']
    );

    // Notify master
    await pool.query(
      'INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)',
      ['master', 'New Quotation Created', `Quotation for ${rep.tracking_number} - Rs.${total}`, 'quotation']
    );

    res.status(201).json({ success: true, message: 'Quotation created and sent to customer', total, job_card: jobCard });
  } catch (err) { console.error('Quotation create error:', err); res.status(500).json({ success: false, message: 'Server error: ' + err.message }); }
});

// Update Quotation (customer approval with reject reason)
router.put('/repair/:id/quotation/approve', async (req, res) => {
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

// Get Quotation PDF (HTML for printing)
router.get('/repair/:id/quotation/pdf', async (req, res) => {
  try {
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


// My Repairs with filter (awaiting, in-progress, completed)
router.get('/my-repairs', async (req, res) => {
  try {
    const techId = req.user.id;
    const { filter } = req.query;
    let statusCondition = '';
    if (filter === 'awaiting') statusCondition = "AND rr.status IN ('received_center','under_diagnosis','inspection_done','quotation_sent','customer_approved')";
    else if (filter === 'in-progress') statusCondition = "AND rr.status IN ('waiting_parts','repair_started','ic_repair','software_install','testing','quality_test','ready_delivery')";
    else if (filter === 'completed') statusCondition = "AND rr.status = 'delivered'";
    const [repairs] = await pool.query(`SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.assigned_technician=? ${statusCondition} ORDER BY rr.created_at DESC LIMIT 100`, [techId]);
    res.json({ success: true, repairs });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
