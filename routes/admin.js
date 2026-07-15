const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for pickup photos
const pickupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'pickup');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pickup_${Date.now()}${ext}`);
  }
});
const uploadPickup = multer({ storage: pickupStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticateToken);
router.use(authorize('admin', 'master'));

router.get('/dashboard', async (req, res) => {
  try {
    const [[{ totalCustomers }]] = await pool.query('SELECT COUNT(*) as totalCustomers FROM customers');
    const [[{ totalRepairs }]] = await pool.query('SELECT COUNT(*) as totalRepairs FROM repair_requests');
    const [[{ pendingRepairs }]] = await pool.query("SELECT COUNT(*) as pendingRepairs FROM repair_requests WHERE status NOT IN ('delivered','cancelled')");
    const [[{ completedRepairs }]] = await pool.query("SELECT COUNT(*) as completedRepairs FROM repair_requests WHERE status IN ('delivered','repair_done','quality_test','ready_delivery')");
    const [[{ pickupRequests }]] = await pool.query("SELECT COUNT(*) as pickupRequests FROM repair_requests WHERE status = 'registered'");
    const [[{ totalRevenue }]] = await pool.query('SELECT COALESCE(SUM(paid_amount), 0) as totalRevenue FROM invoices');
    const [[{ todayCollection }]] = await pool.query('SELECT COALESCE(SUM(paid_amount), 0) as todayCollection FROM invoices WHERE DATE(created_at) = CURDATE()');
    const [[{ monthlyIncome }]] = await pool.query('SELECT COALESCE(SUM(paid_amount), 0) as monthlyIncome FROM invoices WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())');
    const [[{ activeTechs }]] = await pool.query("SELECT COUNT(*) as activeTechs FROM technicians WHERE status='active'");

    const [recentRepairs] = await pool.query(
      'SELECT rr.tracking_number, rr.device_type, rr.brand, rr.status, c.name as customer, t.name as tech, rr.created_at FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id LEFT JOIN technicians t ON rr.assigned_technician=t.id ORDER BY rr.created_at DESC LIMIT 15'
    );

    res.json({ success: true, stats: { totalCustomers, totalRepairs, pendingRepairs, completedRepairs, pickupRequests, totalRevenue, todayCollection, monthlyIncome, activeTechs, cashback: 0, commission: 0, recentRepairs } });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// SEARCH: Search repair by tracking number
router.get('/repairs/search/:tracking', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.city as customer_city
       FROM repair_requests rr 
       JOIN customers c ON rr.customer_id=c.id 
       WHERE rr.tracking_number = ?`,
      [req.params.tracking]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tracking number not found' });
    res.json({ success: true, repair: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PICKUP: Admin picks up device with photos and GPS
router.put('/pickup', uploadPickup.fields([
  { name: 'submission_photo', maxCount: 1 },
  { name: 'customer_selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const { tracking_number, device_condition, notes, gps_location, gps_lat, gps_lng, admin_name } = req.body;
    if (!tracking_number) return res.status(400).json({ success: false, message: 'Tracking number required' });

    const [repairs] = await pool.query(
      'SELECT rr.id, rr.status, rr.customer_id, c.name as customer_name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.tracking_number = ?',
      [tracking_number]
    );
    if (!repairs.length) return res.status(404).json({ success: false, message: 'Repair not found' });

    const repairId = repairs[0].id;
    const customerName = repairs[0].customer_name;

    // Handle uploaded files
    let submissionPhotoPath = null;
    let customerSelfiePath = null;
    if (req.files?.submission_photo?.[0]) {
      submissionPhotoPath = '/uploads/pickup/' + req.files.submission_photo[0].filename;
    }
    if (req.files?.customer_selfie?.[0]) {
      customerSelfiePath = '/uploads/pickup/' + req.files.customer_selfie[0].filename;
    }

    // Update repair request
    await pool.query(
      `UPDATE repair_requests SET device_condition = ?, notes = ?, gps_location = ?, gps_lat = ?, gps_lng = ?, 
       pickup_by = ?, submission_photo = ?, customer_selfie = ?, status = ?, pickup_date = NOW() WHERE id = ?`,
      [device_condition || null, notes || null, gps_location || null, gps_lat || null, gps_lng || null,
       admin_name || req.user.name, submissionPhotoPath, customerSelfiePath, 'pickup_done', repairId]
    );

    // Log status change
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'pickup_done', `Pickup completed by ${admin_name || req.user.name}. Condition: ${device_condition || 'N/A'}`, req.user.id, 'admin']);

    // Log activity
    await pool.query('INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?,?,?,?)',
      [req.user.id, 'admin', 'PICKUP', `Pickup for ${tracking_number} | Condition: ${device_condition || 'N/A'} | GPS: ${gps_location || 'N/A'}`]);

    // Notify Master Panel
    await pool.query('INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)',
      ['master', 'Device Pickup Complete', `Device ${tracking_number} picked up by ${admin_name || req.user.name}. Condition: ${device_condition || 'N/A'}`, 'pickup']);

    // Notify Customer
    await pool.query('INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
      [repairs[0].customer_id, 'customer', 'Device Pickup Successful', `Your device (${tracking_number}) has been picked up successfully by ${admin_name || req.user.name}.`, 'pickup']);

    res.json({
      success: true,
      message: 'Successfully Submitted Device',
      pickupDetails: {
        customerName,
        trackingNumber: tracking_number,
        adminName: admin_name || req.user.name,
        submissionDateTime: new Date().toISOString(),
        deviceCondition: device_condition || 'N/A'
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error: ' + err.message }); }
});

// VERIFY: Admin verifies device and transfers to technician
router.put('/verify/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { technician_id, notes } = req.body;

    const [repairs] = await pool.query(
      'SELECT rr.id, rr.status, rr.customer_id, c.name as customer_name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.tracking_number = ?',
      [trackingNumber]
    );
    if (!repairs.length) return res.status(404).json({ success: false, message: 'Repair not found' });

    const repairId = repairs[0].id;
    const customerName = repairs[0].customer_name;
    const customerId = repairs[0].customer_id;

    // Get technician name if assigned
    let techName = 'N/A';
    if (technician_id) {
      const [techRows] = await pool.query('SELECT name FROM technicians WHERE id = ?', [technician_id]);
      if (techRows.length) techName = techRows[0].name;
    }

    // Update status to admin_verified
    const verifyNotes = `Admin Verification: ${notes || 'Device verified by admin'}\nAssigned to technician: ${techName}`;
    await pool.query(
      'UPDATE repair_requests SET status = ?, assigned_technician = ?, notes = CONCAT(COALESCE(notes, \'\'), \'\\n\\n\', ?) WHERE id = ?',
      ['admin_verified', technician_id || null, verifyNotes, repairId]
    );

    // Log status change
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)',
      [repairId, 'admin_verified', `Device verified and assigned to technician. ${notes || ''}`, req.user.id, 'admin']);

    // Log activity
    await pool.query('INSERT INTO activity_logs (user_id, user_role, action, description) VALUES (?,?,?,?)',
      [req.user.id, 'admin', 'VERIFY', `Verified ${trackingNumber} and assigned to technician`]);

    // Notify Master Panel
    await pool.query('INSERT INTO notifications (user_role, title, message, type) VALUES (?,?,?,?)',
      ['master', 'Device Verified', `Device ${trackingNumber} verified by admin and assigned to technician`, 'verification']);

    // Notify Customer
    await pool.query('INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
      [customerId, 'customer', 'Device Verified', `Your device (${trackingNumber}) has been verified and is now being processed by our technician.`, 'verification']);

    // Notify Technician if assigned
    if (technician_id) {
      await pool.query('INSERT INTO notifications (user_id, user_role, title, message, type) VALUES (?,?,?,?,?)',
        [technician_id, 'technician', 'New Repair Assigned', `You have been assigned a new repair: ${trackingNumber} for ${customerName}`, 'assignment']);
    }

    res.json({
      success: true,
      message: 'Device verified and transferred to technician',
      details: {
        trackingNumber,
        customerName,
        adminName: req.user.name,
        technicianName: techName,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error: ' + err.message }); }
});

// GET: All technicians for assignment
router.get('/technicians/list', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, specialization, status FROM technicians WHERE status = ?', ['active']);
    res.json({ success: true, technicians: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET: All repairs pending verification
router.get('/repairs/pending-verification', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile 
       FROM repair_requests rr 
       JOIN customers c ON rr.customer_id=c.id 
       WHERE rr.status = 'pickup_done'
       ORDER BY rr.pickup_date DESC`
    );
    res.json({ success: true, repairs: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// EXPORT: Admin activity data to Excel (CSV)
router.get('/export/activity', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.id, al.user_role, al.action, al.description, al.created_at, 
       COALESCE(a.name, t.name, m.name) as user_name
       FROM activity_logs al
       LEFT JOIN admins a ON al.user_id = a.id AND al.user_role = 'admin'
       LEFT JOIN technicians t ON al.user_id = t.id AND al.user_role = 'technician'
       LEFT JOIN masters m ON al.user_id = m.id AND al.user_role = 'master'
       ORDER BY al.created_at DESC LIMIT 5000`
    );
    
    const headers = ['ID', 'User Name', 'Role', 'Action', 'Description', 'Date & Time'];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([r.id, r.user_name || '', r.user_role, r.action, `"${(r.description || '').replace(/"/g, '""')}"`, r.created_at].join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=admin_activity_report.csv');
    res.send(csvRows.join('\n'));
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// EXPORT: Customer data to Excel (CSV)
router.get('/export/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.email, c.mobile, c.city, c.status, c.total_repairs, c.created_at,
       GROUP_CONCAT(rr.tracking_number ORDER BY rr.created_at DESC) as tracking_numbers
       FROM customers c
       LEFT JOIN repair_requests rr ON c.id = rr.customer_id
       GROUP BY c.id
       ORDER BY c.created_at DESC LIMIT 5000`
    );
    
    const headers = ['ID', 'Name', 'Email', 'Mobile', 'City', 'Status', 'Total Repairs', 'Tracking Numbers', 'Registered On'];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([r.id, r.name, r.email, r.mobile, r.city, r.status, r.total_repairs, r.tracking_numbers || '', r.created_at].join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customer_data_report.csv');
    res.send(csvRows.join('\n'));
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id,name,email,mobile,city,status,total_repairs,created_at FROM customers ORDER BY created_at DESC');
    res.json({ success: true, customers: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/technicians', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id,name,email,mobile,specialization,experience,status,total_repairs,rating FROM technicians ORDER BY created_at DESC');
    res.json({ success: true, technicians: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/repairs', async (req, res) => {
  try {
    const { status, tech_id, from, to } = req.query;
    let query = 'SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile, t.name as tech_name FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id LEFT JOIN technicians t ON rr.assigned_technician=t.id WHERE 1=1';
    const params = [];
    if (status) { query += ' AND rr.status=?'; params.push(status); }
    if (tech_id) { query += ' AND rr.assigned_technician=?'; params.push(tech_id); }
    if (from) { query += ' AND DATE(rr.created_at)>=?'; params.push(from); }
    if (to) { query += ' AND DATE(rr.created_at)<=?'; params.push(to); }
    query += ' ORDER BY rr.created_at DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, repairs: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get all quotations
router.get('/quotations', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT q.*, rr.tracking_number, rr.brand, rr.model,
      c.name as customer_name, c.mobile as customer_mobile,
      t.name as technician_name
      FROM quotations q
      JOIN repair_requests rr ON q.repair_id=rr.id
      JOIN customers c ON rr.customer_id=c.id
      LEFT JOIN technicians t ON q.created_by=t.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND q.status=?'; params.push(status); }
    query += ' ORDER BY q.created_at DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, quotations: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get all students for repairing course purchase
router.get('/students', async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT id, student_id, name, email, mobile, class, status, created_at
      FROM students
      ORDER BY name ASC
    `);
    res.json({ success: true, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
