require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const rateLimit = require('express-rate-limit');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const reactDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(reactDist)) { app.use(express.static(reactDist)); }

// Import Routes
const authRoutes = require('./routes/auth');
const masterRoutes = require('./routes/master');
const studentRoutes = require('./routes/student');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');
const technicianRoutes = require('./routes/technician');
const galleryRoutes = require('./routes/gallery');
const coursesRouter = require('./routes/courses');
const courseRoutes = require('./routes/course');
const certificateRoutes = require('./routes/certificate');
const repairRoutes = require('./routes/repair');
const notificationRoutes = require('./routes/notification');
const paymentRoutes = require('./routes/payment');
const reportRoutes = require('./routes/report');
const transactionRoutes = require('./routes/transactions');
const laptopRepairRoutes = require('./routes/laptop-repair');

// PUBLIC ROUTE: Verify Certificate Authenticity via scan QR
app.get('/verify-certificate/:certificateNumber', async (req, res) => {
  try {
    const certNumber = req.params.certificateNumber;
    const pool = require('./config/db');
    const [[cert]] = await pool.query(
      `SELECT gc.*, s.name AS student_name, s.student_id AS student_code, s.email AS student_email, c.title AS course_title
       FROM generated_certificates gc
       JOIN students s ON gc.student_id = s.id
       JOIN courses c ON gc.course_id = c.id
       WHERE gc.certificate_number = ?`,
      [certNumber]
    );

    if (!cert) {
      return res.status(404).send('<h1 style="text-align:center;margin-top:50px;color:#ef4444;font-family:sans-serif;">Certificate Verification Failed: Invalid Certificate Number</h1>');
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verify Certificate - SRM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', sans-serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #1f2937;
          }
          .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            max-width: 450px;
            width: 90%;
            padding: 30px;
            text-align: center;
            border-top: 8px solid #059669; /* emerald green top border */
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .field {
            margin-bottom: 15px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 10px;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            color: #9ca3af;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .value {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
          }
          .status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 15px;
          }
          .status.approved {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status.pending {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status.rejected {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .logo {
            font-size: 13px;
            font-weight: bold;
            color: #9ca3af;
            margin-top: 25px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">✓ Verification Successful</div>
          
          <div class="field">
            <div class="label">Certificate Number</div>
            <div class="value">${cert.certificate_number}</div>
          </div>
          
          <div class="field">
            <div class="label">Student Name</div>
            <div class="value">${cert.student_name}</div>
          </div>
          
          <div class="field">
            <div class="label">Course Completed</div>
            <div class="value">${cert.course_title}</div>
          </div>
          
          <div class="field">
            <div class="label">Completion Date</div>
            <div class="value">${new Date(cert.issue_date).toLocaleDateString()}</div>
          </div>

          <div class="status ${cert.status === 'approved' ? 'approved' : cert.status === 'pending_approval' ? 'pending' : 'rejected'}">
            Status: ${cert.status === 'approved' ? 'Authentic & Approved' : cert.status === 'pending_approval' ? 'Pending Approval' : 'Rejected'}
          </div>
          
          <div class="logo">SHREE RAAM MOBILE INSTITUTE</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h1 style="text-align:center;margin-top:50px;color:#ef4444;font-family:sans-serif;">Server Verification Error</h1>');
  }
});

// API Routes
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/courses', coursesRouter);
app.use('/api/course', courseRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/laptop-repair', laptopRepairRoutes);

// Serve Frontend Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login/:role', (req, res) => {
  const role = req.params.role;
  const validRoles = ['customer', 'student', 'admin', 'technician', 'master'];
  if (validRoles.includes(role)) {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'login', `${role}-login.html`));
  } else {
    res.status(404).send('Login page not found');
  }
});

// Dashboard routes (token validated client-side)
const dashboardRoles = ['customer', 'student', 'admin', 'technician', 'master'];
dashboardRoles.forEach(role => {
  app.get(`/dashboard/${role}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard', `${role}-dashboard.html`));
  });
});

if (fs.existsSync(reactDist)) {
  const spaIndex = path.join(reactDist, 'index.html');
  app.get('/', (req, res) => res.sendFile(spaIndex));
  app.get('/login/*', (req, res) => res.sendFile(spaIndex));
  app.get('/register/*', (req, res) => res.sendFile(spaIndex));
  app.get('/dashboard/*', (req, res) => res.sendFile(spaIndex));
  app.get('/repair/register', (req, res) => res.sendFile(spaIndex));
  app.get('/track/*', (req, res) => res.sendFile(spaIndex));
  app.get('/technician/*', (req, res) => res.sendFile(spaIndex));
} else {
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.get('/login/:role', (req, res) => {
    const role = req.params.role;
    const validRoles = ['customer', 'student', 'admin', 'technician', 'master'];
    if (validRoles.includes(role)) {
      res.sendFile(path.join(__dirname, 'public', 'pages', 'login', `${role}-login.html`));
    } else {
      res.status(404).send('Login page not found');
    }
  });
}

// 404 Handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
  } else {
    if (fs.existsSync(reactDist)) { res.sendFile(path.join(reactDist, 'index.html')); } else { res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); }
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

const useHttps = process.env.USE_HTTPS === 'true';
const sslKeyPath = process.env.SSL_KEY_PATH || './certs/localhost-key.pem';
const sslCertPath = process.env.SSL_CERT_PATH || './certs/localhost.crt';
let protocol = 'http';
let server = app;

if (useHttps && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  const httpsOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
  };
  server = https.createServer(httpsOptions, app);
  protocol = 'https';
} else if (useHttps) {
  console.warn(`WARNING: USE_HTTPS=true but certificate files not found at ${sslKeyPath} and ${sslCertPath}. Falling back to HTTP.`);
}

// Database Migration: Add delivery workflow columns
async function runMigrations() {
  const pool = require('./config/db');
  try {
    // Extend repair_requests.status ENUM to include new delivery statuses
    await pool.query(`ALTER TABLE repair_requests MODIFY COLUMN status ENUM(
      'registered','pickup_done','admin_verified','received_center','under_diagnosis',
      'inspection_done','quotation_sent','customer_approved','waiting_parts',
      'repair_started','ic_repair','software_install','testing','quality_test',
      'ready_delivery','repair_completed','admin_approved_delivery','admin_rejected_delivery',
      'handed_to_admin','ready_to_deliver','out_delivery','customer_received',
      'customer_confirmed','customer_issue_reported','payment_done','payment_verified',
      'successfully_delivered','feedback_given','delivered','cancelled','rejected'
    ) DEFAULT 'registered'`);

    // Add new delivery columns to repair_requests (ignore if already exist)
    const cols = [
      ['admin_verified_at', 'TIMESTAMP NULL'],
      ['admin_verified_by', 'INT NULL'],
      ['handover_at', 'TIMESTAMP NULL'],
      ['handover_technician_signature', 'TEXT NULL'],
      ['handover_admin_signature', 'TEXT NULL'],
      ['handover_device_condition', 'TEXT NULL'],
      ['handover_accessories', 'TEXT NULL'],
      ['customer_confirmed_at', 'TIMESTAMP NULL'],
      ['delivery_photo', 'VARCHAR(500) NULL'],
      ['delivered_by', 'VARCHAR(100) NULL'],
      ['delivered_at', 'TIMESTAMP NULL'],
      ['feedback_rating', 'INT NULL'],
      ['feedback_comments', 'TEXT NULL'],
      ['feedback_at', 'TIMESTAMP NULL'],
      ['payment_screenshot', 'VARCHAR(500) NULL'],
      ['payment_verified_by', 'INT NULL'],
      ['payment_verified_at', 'TIMESTAMP NULL'],
      ['delivery_type_option', "ENUM('pickup','home_delivery') DEFAULT 'pickup'"],
      ['repair_completion_notes', 'TEXT NULL'],
      ['repair_completed_at', 'TIMESTAMP NULL'],
    ];
    for (const [col, def] of cols) {
      try {
        await pool.query(`ALTER TABLE repair_requests ADD COLUMN ${col} ${def}`);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log(`Migration skip (exists): ${col}`);
      }
    }

    // Create delivery_handover_log table
    await pool.query(`CREATE TABLE IF NOT EXISTS delivery_handover_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      repair_id INT NOT NULL,
      from_role VARCHAR(20),
      to_role VARCHAR(20),
      from_user_id INT,
      to_user_id INT,
      device_condition TEXT,
      accessories_checklist TEXT,
      signature_from TEXT,
      signature_to TEXT,
      photo VARCHAR(500),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
    )`);

    // LMS migrations and sync: add payment_status and transaction_id to course_enrollments
    try {
      await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed'");
      await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(200) DEFAULT NULL");
    } catch (e) {
      console.log('Skip adding course_enrollments columns (already exists)');
    }

    // Sync legacy completed course_purchases into course_enrollments if missing
    try {
      await pool.query(`
        INSERT IGNORE INTO course_enrollments (student_id, course_id, assigned_at, payment_status, transaction_id)
        SELECT student_id, course_id, created_at, status, id
        FROM course_purchases
        WHERE status = 'completed'
      `);
      console.log('✅ Course enrollments synced with completed purchases');
    } catch (e) {
      console.error('Error syncing purchases to enrollments:', e.message);
    }

    console.log('✅ Database migrations completed');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

// Start Server
server.listen(PORT, async () => {
  console.log(`\n🔧 SHREE RAAM MOBAILE - Mobile Repairing Service`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Website: ${protocol}://localhost:${PORT}`);
  console.log(`📍 API: ${protocol}://localhost:${PORT}/api\n`);
  console.log(`Default Login:`);
  console.log(`  Master:  mr.vinayak333@gmail.com / VINAYAK@333`);
  console.log(`  Admin:   admin@repairsystem.com / master123\n`);
  console.log(`Contact WhatsApp: https://wa.me/919552210333\n`);
  await runMigrations();
});

module.exports = app;
