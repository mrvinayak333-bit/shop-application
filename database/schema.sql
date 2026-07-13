-- =====================================================
-- Mobile Repairing & Training Management System
-- Complete Database Schema
-- =====================================================

CREATE DATABASE IF NOT EXISTS mobile_repair_system;
USE mobile_repair_system;

-- =====================================================
-- 1. MASTER USERS (Super Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS master_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role ENUM('master') DEFAULT 'master',
  status ENUM('active','inactive') DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ADMINS
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role ENUM('admin') DEFAULT 'admin',
  permissions TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_by INT,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 3. TECHNICIANS
-- =====================================================
CREATE TABLE IF NOT EXISTS technicians (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  specialization VARCHAR(200),
  experience VARCHAR(50),
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  status ENUM('active','inactive','busy') DEFAULT 'active',
  commission_percent DECIMAL(5,2) DEFAULT 0,
  total_repairs INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_by INT,
  last_login TIMESTAMP NULL,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. CUSTOMERS
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  alternate_mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  status ENUM('active','inactive') DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  mobile_verified BOOLEAN DEFAULT FALSE,
  total_repairs INT DEFAULT 0,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. STUDENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(150) UNIQUE,
  mobile VARCHAR(20),
  course VARCHAR(200),
  batch VARCHAR(100),
  status ENUM('active','inactive','completed') DEFAULT 'active',
  enrollment_date DATE,
  completion_date DATE,
  created_by INT,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 6. REPAIR REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  device_type VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  imei VARCHAR(50),
  issue_description TEXT NOT NULL,
  device_condition TEXT,
  accessories TEXT,
  estimated_cost DECIMAL(10,2),
  advance_amount DECIMAL(10,2) DEFAULT 0,
  assigned_technician INT,
  status ENUM('registered','pickup_done','admin_verified','received_center','under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','out_delivery','delivered','cancelled','rejected') DEFAULT 'registered',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  qr_code TEXT,
  warranty_months INT DEFAULT 0,
  warranty_expiry DATE,
  delivery_otp VARCHAR(6),
  customer_signature TEXT,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  pickup_address TEXT,
  pickup_date TIMESTAMP NULL,
  delivery_type ENUM('pickup','walkin','courier') DEFAULT 'pickup',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_technician) REFERENCES technicians(id) ON DELETE SET NULL
);

-- =====================================================
-- 7. REPAIR STATUS LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  updated_by INT,
  updated_by_role VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- =====================================================
-- 8. QUOTATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,
  details TEXT,
  status ENUM('draft','sent','approved','rejected') DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- =====================================================
-- 9. INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  repair_id INT NOT NULL,
  customer_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  invoice_date DATE,
  due_date DATE,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- =====================================================
-- 10. PAYMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(200),
  payment_status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- =====================================================
-- 11. NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('sms','email','whatsapp','push','system') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  sent_via VARCHAR(50),
  sent_status ENUM('pending','sent','failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. GALLERY IMAGES (Slider)
-- =====================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  image_path VARCHAR(500) NOT NULL,
  alt_text VARCHAR(200),
  page_location ENUM('home','customer_login','student_login','admin_login','technician_login','master_login','all') DEFAULT 'home',
  display_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 13. COURSES
-- =====================================================
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(200) NOT NULL,
  course_code VARCHAR(50) UNIQUE,
  description TEXT,
  duration VARCHAR(100),
  price DECIMAL(10,2),
  status ENUM('active','inactive') DEFAULT 'active',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 14. COURSE ENROLLMENTS (Student-Course Mapping)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  status ENUM('enrolled','in_progress','completed') DEFAULT 'enrolled',
  enrolled_date DATE,
  completed_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- =====================================================
-- 15. YOUTUBE VIDEOS
-- =====================================================
CREATE TABLE IF NOT EXISTS youtube_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  duration VARCHAR(20),
  description TEXT,
  display_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =====================================================
-- 16. COURSE MATERIALS (PDF, Images, Documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  file_type ENUM('pdf','image','document','other') DEFAULT 'document',
  file_path VARCHAR(500) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =====================================================
-- 17. CERTIFICATES
-- =====================================================
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  certificate_type ENUM('pdf','jpg') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  title VARCHAR(200),
  issue_date DATE,
  status ENUM('active','inactive') DEFAULT 'active',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- =====================================================
-- 18. ACTIVITY LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  action VARCHAR(200) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 19. GPS LOGS (Technician Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS gps_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  technician_id INT NOT NULL,
  repair_id INT,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE SET NULL
);

-- =====================================================
-- 20. COMMISSION
-- =====================================================
CREATE TABLE IF NOT EXISTS commission (
  id INT AUTO_INCREMENT PRIMARY KEY,
  technician_id INT NOT NULL,
  repair_id INT NOT NULL,
  invoice_id INT,
  amount DECIMAL(10,2) NOT NULL,
  percent DECIMAL(5,2),
  status ENUM('pending','paid') DEFAULT 'pending',
  paid_date DATE,
  month_period VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- =====================================================
-- 21. OTP CODES
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  otp VARCHAR(6) NOT NULL,
  purpose VARCHAR(50),
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 22. WARRANTY CLAIMS
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  customer_id INT NOT NULL,
  claim_reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected','resolved') DEFAULT 'pending',
  resolution TEXT,
  claimed_date DATE,
  resolved_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- =====================================================
-- 23. SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(300),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 24. REPAIR PHOTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  photo_type ENUM('pickup','customer_selfie','condition','before','after','diagnosis') DEFAULT 'condition',
  file_path VARCHAR(500) NOT NULL,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- =====================================================
-- 25. PICKUP VERIFICATION
-- =====================================================
CREATE TABLE IF NOT EXISTS pickup_verification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  device_photo VARCHAR(500),
  customer_selfie VARCHAR(500),
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  digital_signature TEXT,
  otp_code VARCHAR(6),
  device_condition JSON,
  problem_notes TEXT,
  verified_by INT,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- =====================================================
-- DEFAULT DATA INSERTIONS
-- =====================================================

-- Default Master User
INSERT INTO master_users (name, email, password, mobile) VALUES 
('Vinayak', 'mr.vinayak333@gmail.com', '$2a$10$9EWp6XmNolK447bq1cJEtefLalQKhaFnQsfz0G7WqGw9OqANSxR3u', '9999999999');

-- Default Admin
INSERT INTO admins (name, email, password, mobile, created_by) VALUES
('Admin User', 'admin@repairsystem.com', '$2a$10$97EoHRG5FsL2K4vstnbxauzEpeNNgg5TK3zHjfh841IOtved67rW2', '8888888888', 1);

-- Default Courses
INSERT INTO courses (course_name, course_code, description, duration, created_by) VALUES
('Mobile Repairing Basic Course', 'MRB-001', 'Basic level mobile repairing course covering fundamental concepts', '3 Months', 1),
('Mobile Repairing Hardware Advance Level Course', 'MRH-002', 'Advanced hardware level repairing with practical training', '6 Months', 1),
('Software Course', 'MRS-003', 'Mobile software troubleshooting, flashing, and unlocking techniques', '4 Months', 1);

-- Default Settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('app_name', 'SHREE RAAM MOBILE', 'Application Name'),
('welcome_message', 'Welcome to SHREE RAAM MOBILE - Professional Repair Tracking', 'Welcome Message'),
('logo_path', '/assets/logo.png', 'Application Logo Path'),
('otp_enabled', 'true', 'Enable OTP Verification'),
('sms_enabled', 'false', 'Enable SMS Notifications'),
('whatsapp_enabled', 'false', 'Enable WhatsApp Notifications'),
('email_enabled', 'false', 'Enable Email Notifications'),
('commission_default', '10', 'Default Commission Percentage');
