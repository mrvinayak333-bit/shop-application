-- =====================================================
-- Mobile Repairing & Training Management System
-- FINAL CONSOLIDATED PRODUCTION SCHEMA (POSTGRESQL DIALECT)
-- =====================================================

-- 1. MASTER USERS
CREATE TABLE IF NOT EXISTS master_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role VARCHAR(50) DEFAULT 'master',
  status VARCHAR(50) DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ADMINS
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  alternate_mobile VARCHAR(20),
  role VARCHAR(50) DEFAULT 'admin',
  permissions TEXT,
  status VARCHAR(50) DEFAULT 'active',
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 3. TECHNICIANS
CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
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
  status VARCHAR(50) DEFAULT 'active',
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
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
  status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  mobile_verified BOOLEAN DEFAULT FALSE,
  total_repairs INT DEFAULT 0,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(150) UNIQUE,
  mobile VARCHAR(20),
  course VARCHAR(200),
  batch VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 6. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT FALSE,
  duration_days INT DEFAULT 0,
  banner_image VARCHAR(500) DEFAULT NULL,
  certificate_enabled BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. REPAIR REQUESTS (Mobile)
CREATE TABLE IF NOT EXISTS repair_requests (
  id SERIAL PRIMARY KEY,
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
  status VARCHAR(200) DEFAULT 'registered',
  priority VARCHAR(50) DEFAULT 'medium',
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
  delivery_type VARCHAR(50) DEFAULT 'pickup',
  delivery_type_option VARCHAR(50) DEFAULT 'pickup',
  notes TEXT,
  spare_parts TEXT,
  quotation_notes TEXT,
  quotation_status VARCHAR(50) DEFAULT 'pending',
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
  model_number VARCHAR(100) DEFAULT NULL,
  imei2 VARCHAR(50) DEFAULT NULL,
  serial_number VARCHAR(100) DEFAULT NULL,
  processor VARCHAR(100) DEFAULT NULL,
  ram VARCHAR(50) DEFAULT NULL,
  storage VARCHAR(50) DEFAULT NULL,
  color VARCHAR(50) DEFAULT NULL,
  purchase_date DATE DEFAULT NULL,
  warranty_status VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_technician) REFERENCES technicians(id) ON DELETE SET NULL
);

-- 8. REPAIR STATUS LOGS
CREATE TABLE IF NOT EXISTS repair_status (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  repair_id INT NOT NULL,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,
  details TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- 10. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_type VARCHAR(50) DEFAULT 'invoice',
  repair_id INT NOT NULL,
  customer_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_method_id INT,
  transaction_id VARCHAR(200),
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 12. COURSE ENROLLMENTS
CREATE TABLE IF NOT EXISTS course_enrollments (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'enrolled',
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_date DATE,
  payment_status VARCHAR(50) DEFAULT 'completed',
  transaction_id VARCHAR(200) DEFAULT NULL,
  progress JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (student_id, course_id)
);

-- 13. COURSE SUBJECTS
CREATE TABLE IF NOT EXISTS course_subjects (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 14. COURSE SUBJECT ITEMS
CREATE TABLE IF NOT EXISTS course_subject_items (
  id SERIAL PRIMARY KEY,
  subject_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  youtube_url VARCHAR(500) DEFAULT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES course_subjects(id) ON DELETE CASCADE
);

-- 15. STUDENT ITEM PROGRESS
CREATE TABLE IF NOT EXISTS student_item_progress (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  item_id INT NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES course_subject_items(id) ON DELETE CASCADE,
  UNIQUE (student_id, item_id)
);

-- 16. COURSE PURCHASES
CREATE TABLE IF NOT EXISTS course_purchases (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'manual',
  payment_screenshot VARCHAR(500) DEFAULT NULL,
  transaction_id VARCHAR(200),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (student_id, course_id)
);

-- 17. LAPTOP REPAIRS
CREATE TABLE IF NOT EXISTS laptop_repairs (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  issue_description TEXT NOT NULL,
  device_condition TEXT,
  accessories TEXT,
  estimated_cost DECIMAL(10,2),
  advance_amount DECIMAL(10,2) DEFAULT 0,
  assigned_technician INT,
  status VARCHAR(100) DEFAULT 'registered',
  priority VARCHAR(50) DEFAULT 'medium',
  warranty_months INT DEFAULT 0,
  warranty_expiry DATE,
  delivery_type VARCHAR(50) DEFAULT 'pickup',
  pickup_address TEXT,
  pickup_date TIMESTAMP NULL,
  delivery_otp VARCHAR(6),
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_technician) REFERENCES technicians(id) ON DELETE SET NULL
);

-- 18. LAPTOP REPAIR STATUS LOG
CREATE TABLE IF NOT EXISTS laptop_repair_status (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
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
  status VARCHAR(50) DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id) REFERENCES laptop_repairs(id) ON DELETE CASCADE
);

-- 20. GENERATED CERTIFICATES
CREATE TABLE IF NOT EXISTS generated_certificates (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_approval',
  pdf_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 21. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 22. SUPPORT MESSAGES
CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL,
  sender_role VARCHAR(50) NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  attachment_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- 23. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_type VARCHAR(50) DEFAULT 'all',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. ANNOUNCEMENT RECIPIENTS
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id SERIAL PRIMARY KEY,
  announcement_id INT NOT NULL,
  student_id INT NOT NULL,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 25. PAYMENT METHODS
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  upi_id VARCHAR(100),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active'
);

-- 26. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(300),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. WEBSITE SETTINGS
CREATE TABLE IF NOT EXISTS website_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. GALLERY PHOTOS
CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  photo_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. SLIDER IMAGES
CREATE TABLE IF NOT EXISTS slider_images (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  subtitle VARCHAR(300),
  link VARCHAR(500),
  image_path VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  sent_via VARCHAR(50),
  sent_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  user_role VARCHAR(20),
  action VARCHAR(200) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 32. CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  certificate_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  title VARCHAR(200),
  issue_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES master_users(id) ON DELETE SET NULL
);

-- 33. DYNAMIC DEVICE TYPES
CREATE TABLE IF NOT EXISTS device_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 34. DYNAMIC BRANDS
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  device_type_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_type_id) REFERENCES device_types(id) ON DELETE CASCADE,
  UNIQUE (device_type_id, name)
);

-- 35. DYNAMIC MODELS
CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  UNIQUE (brand_id, name)
);

-- 36. CERTIFICATE TEMPLATES
CREATE TABLE IF NOT EXISTS certificate_templates (
  id SERIAL PRIMARY KEY,
  template_file VARCHAR(500) NOT NULL,
  institute_logo VARCHAR(500) DEFAULT NULL,
  institute_signature VARCHAR(500) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 37. COMMISSION
CREATE TABLE IF NOT EXISTS commission (
  id SERIAL PRIMARY KEY,
  technician_id INT NOT NULL,
  repair_id INT NOT NULL,
  invoice_id INT,
  amount DECIMAL(10,2) NOT NULL,
  percent DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'pending',
  paid_date DATE,
  month_period VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY (repair_id) REFERENCES repair_requests(id) ON DELETE SET NULL
);

-- 38. COMMISSION SETTINGS
CREATE TABLE IF NOT EXISTS commission_settings (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) DEFAULT 'course',
  entity_id INT NOT NULL,
  entity_name VARCHAR(300) NOT NULL,
  commission_type VARCHAR(50) DEFAULT 'percentage',
  commission_value DECIMAL(10,2) NOT NULL,
  admin_commission_percent DECIMAL(5,2) DEFAULT 0,
  technician_commission_percent DECIMAL(5,2) DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 39. COMMISSION LEDGER
CREATE TABLE IF NOT EXISTS commission_ledger (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) DEFAULT 'repair',
  transaction_id INT,
  transaction_ref VARCHAR(100),
  commission_amount DECIMAL(10,2) NOT NULL,
  tax_deducted DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  payment_date TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 40. COMMISSION PAYMENTS
CREATE TABLE IF NOT EXISTS commission_payments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  utr_number VARCHAR(100),
  payment_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  created_by INT,
  verified_by INT,
  verification_date TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 41. DELIVERY HANDOVER LOG
CREATE TABLE IF NOT EXISTS delivery_handover_log (
  id SERIAL PRIMARY KEY,
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
);

-- DEFAULT SEED DATA
INSERT INTO master_users (id, name, email, password, mobile) VALUES
(1, 'Vinayak', 'mr.vinayak333@gmail.com', '$2a$10$9EWp6XmNolK447bq1cJEtefLalQKhaFnQsfz0G7WqGw9OqANSxR3u', '919552210333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (setting_key, setting_value, description) VALUES
('app_name', 'SHREE RAAM MOBAILE', 'Application Name'),
('founder', 'Vinayak Sanjay Kumbhar', 'Founder Name'),
('contact_mobile', '919552210333', 'Contact Mobile'),
('whatsapp_link', 'https://wa.me/919552210333', 'WhatsApp Link')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO payment_methods (id, name, type, is_active) VALUES
(1, 'Cash', 'cash', true),
(2, 'UPI', 'upi', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO device_types (id, name, is_active) VALUES 
(1, 'Smartphone', true),
(2, 'Tablet', true),
(3, 'MacBook', true),
(4, 'Laptop', true),
(5, 'Desktop Computer', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brands (id, device_type_id, name, is_active) VALUES
(1, 1, 'Apple (iPhone)', true),
(2, 1, 'Samsung', true),
(3, 1, 'OPPO', true),
(4, 1, 'vivo', true),
(5, 1, 'realme', true),
(6, 1, 'Xiaomi', true),
(7, 1, 'Redmi', true),
(8, 1, 'POCO', true),
(9, 1, 'OnePlus', true),
(10, 1, 'Motorola', true),
(11, 1, 'Nokia', true),
(12, 1, 'Google Pixel', true),
(13, 2, 'Apple (iPad)', true),
(14, 2, 'Samsung Galaxy Tab', true),
(15, 3, 'Apple MacBook Air', true),
(16, 3, 'Apple MacBook Pro', true),
(17, 4, 'HP', true),
(18, 4, 'Dell', true),
(19, 4, 'Lenovo', true),
(20, 5, 'Custom Built PC', true)
ON CONFLICT (id) DO NOTHING;
