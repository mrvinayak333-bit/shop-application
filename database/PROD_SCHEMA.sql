-- =====================================================
-- Mobile Repairing & Training Management System
-- FINAL CONSOLIDATED PRODUCTION SCHEMA
-- =====================================================

CREATE DATABASE IF NOT EXISTS mobile_repair_system;
USE mobile_repair_system;

-- 1. MASTER USERS
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

-- 2. ADMINS
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  alternate_mobile VARCHAR(20),
  role ENUM('admin') DEFAULT 'admin',
  permissions TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_by INT,
  last_login TIMESTAMP NULL,
  aadhar_number VARCHAR(20),
  aadhar_photo TEXT,
  bank_account VARCHAR(30),
  bank_ifsc VARCHAR(20),
  commission_type VARCHAR(50),
  commission_amount DECIMAL(10,2),
  total_commission DECIMAL(10,2) DEFAULT 0,
  pending_commission DECIMAL(10,2) DEFAULT 0,
  paid_commission DECIMAL(10,2) DEFAULT 0,
  commission_last_paid TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 3. TECHNICIANS
CREATE TABLE IF NOT EXISTS technicians (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  alternate_mobile VARCHAR(20),
  specialization VARCHAR(200),
  experience VARCHAR(50),
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(100),
  aadhar_number VARCHAR(20),
  aadhar_photo TEXT,
  bank_account VARCHAR(30),
  bank_ifsc VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  status ENUM('active','inactive','busy') DEFAULT 'active',
  commission_percent DECIMAL(5,2) DEFAULT 0,
  total_repairs INT DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  pending_commission DECIMAL(10,2) DEFAULT 0,
  paid_commission DECIMAL(10,2) DEFAULT 0,
  commission_last_paid TIMESTAMP NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  created_by INT,
  last_login TIMESTAMP NULL,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  alternate_mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  photo TEXT,
  selfie_photo TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  mobile_verified BOOLEAN DEFAULT FALSE,
  total_repairs INT DEFAULT 0,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. STUDENTS
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
  android_device_id VARCHAR(255) DEFAULT NULL,
  profile_photo VARCHAR(500) DEFAULT NULL,
  fathers_name VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  age INT DEFAULT NULL,
  dob DATE DEFAULT NULL,
  aadhaar_number VARCHAR(20) DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  created_by INT,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 6. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_free TINYINT(1) DEFAULT 0,
  duration_days INT DEFAULT 0,
  banner_image VARCHAR(500) DEFAULT NULL,
  certificate_enabled TINYINT(1) DEFAULT 0,
  published TINYINT(1) DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. REPAIR REQUESTS (Mobile)
CREATE TABLE IF NOT EXISTS repair_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  customer_mobile VARCHAR(20),
  customer_address TEXT,
  device_type VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  imei VARCHAR(50),
  issue_description TEXT NOT NULL,
  device_condition TEXT,
  device_condition_multi TEXT,
  device_photo TEXT,
  accessories TEXT,
  estimated_cost DECIMAL(10,2),
  advance_amount DECIMAL(10,2) DEFAULT 0,
  assigned_technician INT,
  status ENUM('registered','pickup_done','admin_verified','received_center','under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','out_delivery','delivered','cancelled','rejected','inspection_done','quotation_sent','customer_approved','repair_started','ic_repair','software_install','testing','repair_completed','admin_approved_delivery','admin_rejected_delivery','handed_to_admin','ready_to_deliver','customer_received','customer_confirmed','customer_issue_reported','payment_done','payment_verified','successfully_delivered','feedback_given') DEFAULT 'registered',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  qr_code TEXT,
  warranty_months INT DEFAULT 0,
  warranty_expiry DATE,
  delivery_otp VARCHAR(6),
  customer_signature TEXT,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  gps_location TEXT,
  pickup_address TEXT,
  pickup_date TIMESTAMP NULL,
  pickup_by VARCHAR(100),
  submission_photo VARCHAR(500),
  customer_selfie VARCHAR(500),
  delivery_type ENUM('pickup','walkin','courier') DEFAULT 'pickup',
  delivery_type_option ENUM('pickup','home_delivery') DEFAULT 'pickup',
  notes TEXT,
  spare_parts TEXT,
  quotation_notes TEXT,
  quotation_status ENUM('pending','sent','approved','rejected') DEFAULT 'pending',
  admin_verified_at TIMESTAMP NULL,
  admin_verified_by INT NULL,
  handover_at TIMESTAMP NULL,
  handover_technician_signature TEXT NULL,
  handover_admin_signature TEXT NULL,
  handover_device_condition TEXT NULL,
  handover_accessories TEXT NULL,
  customer_confirmed_at TIMESTAMP NULL,
  delivery_photo VARCHAR(500) NULL,
  delivered_by VARCHAR(100) NULL,
  delivered_at TIMESTAMP NULL,
  feedback_rating INT NULL,
  feedback_comments TEXT NULL,
  feedback_at TIMESTAMP NULL,
  payment_screenshot VARCHAR(500) NULL,
  payment_verified_by INT NULL,
  payment_verified_at TIMESTAMP NULL,
  repair_completion_notes TEXT NULL,
  repair_completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_technician) REFERENCES technicians(id) ON DELETE SET NULL
);

-- 8. REPAIR STATUS LOGS
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

-- 9. QUOTATIONS
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

-- 10. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_type ENUM('invoice','service_bill','cash_memo','receipt') DEFAULT 'invoice',
  repair_id INT NOT NULL,
  customer_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0 COMMENT 'Service charge/handling charge',
  tax_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Service charge amount',
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  gst_number VARCHAR(20),
  invoice_date DATE,
  due_date DATE,
  notes TEXT,
  service_charge_percent DECIMAL(5,2) DEFAULT 0,
  handling_charge DECIMAL(10,2) DEFAULT 0,
  is_gst_applicable BOOLEAN DEFAULT FALSE,
  payment_verified_at TIMESTAMP NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_method_id INT,
  transaction_id VARCHAR(200),
  payment_status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 12. COURSE ENROLLMENTS
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  status ENUM('enrolled','in_progress','completed') DEFAULT 'enrolled',
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_date DATE,
  payment_status VARCHAR(50) DEFAULT 'completed',
  transaction_id VARCHAR(200) DEFAULT NULL,
  progress JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- 13. COURSE SUBJECTS
CREATE TABLE IF NOT EXISTS course_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 14. COURSE SUBJECT ITEMS
CREATE TABLE IF NOT EXISTS course_subject_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('video', 'pdf', 'youtube', 'downloadable_file') NOT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  youtube_url VARCHAR(500) DEFAULT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES course_subjects(id) ON DELETE CASCADE
);

-- 15. STUDENT ITEM PROGRESS
CREATE TABLE IF NOT EXISTS student_item_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  item_id INT NOT NULL,
  completed TINYINT(1) DEFAULT 1,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES course_subject_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_item (student_id, item_id)
);

-- 16. COURSE PURCHASES
CREATE TABLE IF NOT EXISTS course_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'manual',
  payment_screenshot VARCHAR(500) DEFAULT NULL,
  transaction_id VARCHAR(200),
  status ENUM('completed','pending','failed','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_purchase (student_id, course_id)
);

-- 17. LAPTOP REPAIRS
CREATE TABLE IF NOT EXISTS laptop_repairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  device_type ENUM('laptop','desktop','printer','monitor','keyboard','mouse','other') NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  issue_description TEXT NOT NULL,
  device_condition TEXT,
  accessories TEXT,
  estimated_cost DECIMAL(10,2),
  advance_amount DECIMAL(10,2) DEFAULT 0,
  assigned_technician INT,
  status ENUM('registered','pickup_scheduled','pickup_done','received_center','under_diagnosis','diagnosis_done',
              'quotation_sent','customer_approved','waiting_parts','repair_started','repair_done','quality_test',
              'ready_delivery','handed_to_admin','ready_to_deliver','out_delivery','delivered','completed',
              'cancelled','rejected','admin_verified') DEFAULT 'registered',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  warranty_months INT DEFAULT 0,
  warranty_expiry DATE,
  delivery_type ENUM('pickup','walkin','courier') DEFAULT 'pickup',
  pickup_address TEXT,
  pickup_date TIMESTAMP NULL,
  delivery_otp VARCHAR(6),
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_technician) REFERENCES technicians(id) ON DELETE SET NULL
);

-- 18. LAPTOP REPAIR STATUS LOG
CREATE TABLE IF NOT EXISTS laptop_repair_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  updated_by INT,
  updated_by_role VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES laptop_repairs(id) ON DELETE CASCADE
);

-- 19. LAPTOP QUOTATIONS
CREATE TABLE IF NOT EXISTS laptop_quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_id INT NOT NULL,
  job_card_no VARCHAR(50),
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  other_charges DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  details TEXT,
  spare_parts TEXT,
  estimated_days INT,
  status ENUM('draft','sent','approved','rejected','completed') DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES laptop_repairs(id) ON DELETE CASCADE
);

-- 20. GENERATED CERTIFICATES
CREATE TABLE IF NOT EXISTS generated_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  status ENUM('pending_approval', 'approved', 'rejected') DEFAULT 'pending_approval',
  pdf_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 21. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 22. SUPPORT MESSAGES
CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  sender_role ENUM('student', 'master', 'admin') NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  attachment_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- 23. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_type ENUM('all', 'selected') DEFAULT 'all',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. ANNOUNCEMENT RECIPIENTS
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  student_id INT NOT NULL,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 25. PAYMENT METHODS
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  upi_id VARCHAR(100),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  status ENUM('active','inactive') DEFAULT 'active'
);

-- 26. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(300),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 27. WEBSITE SETTINGS
CREATE TABLE IF NOT EXISTS website_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. GALLERY PHOTOS
CREATE TABLE IF NOT EXISTS gallery_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  photo_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. SLIDER IMAGES
CREATE TABLE IF NOT EXISTS slider_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  subtitle VARCHAR(300),
  link VARCHAR(500),
  image_path VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  sent_via VARCHAR(50),
  sent_status ENUM('pending','sent','failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  action VARCHAR(200) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEFAULT DATA
INSERT IGNORE INTO master_users (id, name, email, password, mobile) VALUES
(1, 'Vinayak', 'mr.vinayak333@gmail.com', '$2a$10$9EWp6XmNolK447bq1cJEtefLalQKhaFnQsfz0G7WqGw9OqANSxR3u', '919552210333');

INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('app_name', 'SHREE RAAM MOBAILE', 'Application Name'),
('founder', 'Vinayak Sanjay Kumbhar', 'Founder Name'),
('contact_mobile', '919552210333', 'Contact Mobile'),
('whatsapp_link', 'https://wa.me/919552210333', 'WhatsApp Link');

INSERT IGNORE INTO payment_methods (name, type, is_active) VALUES
('Cash', 'cash', 1),
('UPI', 'upi', 1);
