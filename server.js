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
const supabase = require('./config/supabase');
const db = require('./config/db');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
const uploadDirs = [
  'uploads', 'uploads/profiles', 'uploads/repair_photos', 'uploads/pickup',
  'uploads/gallery', 'uploads/courses', 'uploads/payments', 'uploads/support',
  'uploads/logos', 'uploads/certificates', 'uploads/sliders'
];
uploadDirs.forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));

// Rate Limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests.' }
}));

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
if (fs.existsSync(reactDist)) app.use(express.static(reactDist));

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

// API Routes
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Supabase API is healthy' }));
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

// SPA Handling
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'API Not Found' });
  if (fs.existsSync(path.join(reactDist, 'index.html'))) return res.sendFile(path.join(reactDist, 'index.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// START SERVER
app.listen(PORT, async () => {
  console.log(`\n🚀 SRM SERVER [SUPABASE MODE]`);
  console.log(`📍 PORT: ${PORT}`);

  const isConnected = await db.testConnection();
  if (isConnected) {
    console.log('✅ Connected to Supabase Project rikdfuplqxpquzztyqwv');

    // Auto-Seed Master Account if missing
    try {
      const bcrypt = require('bcryptjs');
      const { data: masters } = await supabase.from('master_users').select('id').eq('email', 'mr.vinayak333@gmail.com');
      if (!masters?.length) {
        const pass = await bcrypt.hash('VINAYAK@333', 10);
        await supabase.from('master_users').insert({
          name: 'Vinayak Master', email: 'mr.vinayak333@gmail.com', password: pass, mobile: '919552210333', status: 'active'
        });
        console.log('👑 Default Master Account Created');
      }
    } catch (e) { console.warn('⚠️ Seeding skipped:', e.message); }
  } else {
    console.error('🛑 CRITICAL: Supabase connection failed.');
  }
});

module.exports = app;
