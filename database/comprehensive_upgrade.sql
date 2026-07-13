-- =====================================================================
-- COMPREHENSIVE DATABASE UPGRADE
-- Adds: Course Purchases, Commission System, Laptop Repairs, GST Removal
-- =====================================================================

USE mobile_repair_system;

-- =====================================================================
-- 1. COURSE PURCHASES - Student Purchase System
-- =====================================================================
CREATE TABLE IF NOT EXISTS course_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(200),
  status ENUM('completed','pending','failed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_purchase (student_id, course_id)
);

-- =====================================================================
-- 2. COURSE MATERIALS - Videos, PDFs, Study Materials
-- =====================================================================
CREATE TABLE IF NOT EXISTS course_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  material_type ENUM('video','pdf','document','image','quiz','assignment') DEFAULT 'document',
  title VARCHAR(300) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  file_size INT,
  duration_minutes INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =====================================================================
-- 3. COMMISSION SETTINGS - Per Course/Service Commissions
-- =====================================================================
CREATE TABLE IF NOT EXISTS commission_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('course','repair_model','service') DEFAULT 'course',
  entity_id INT NOT NULL,
  entity_name VARCHAR(300) NOT NULL,
  commission_type ENUM('percentage','fixed') DEFAULT 'percentage',
  commission_value DECIMAL(10,2) NOT NULL,
  admin_commission_percent DECIMAL(5,2) DEFAULT 0,
  technician_commission_percent DECIMAL(5,2) DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 4. COMMISSION LEDGER - Track Commissions Earned
-- =====================================================================
CREATE TABLE IF NOT EXISTS commission_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_role ENUM('admin','technician') NOT NULL,
  transaction_type ENUM('course','repair','service','deduction') DEFAULT 'repair',
  transaction_id INT,
  transaction_ref VARCHAR(100),
  commission_amount DECIMAL(10,2) NOT NULL,
  tax_deducted DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  status ENUM('pending','approved','paid','rejected') DEFAULT 'pending',
  payment_date TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 5. COMMISSION PAYMENTS - Track Payments Sent to Users
-- =====================================================================
CREATE TABLE IF NOT EXISTS commission_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_role ENUM('admin','technician') NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  utr_number VARCHAR(100),
  payment_date TIMESTAMP NOT NULL,
  status ENUM('pending','processed','failed','verified') DEFAULT 'pending',
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  created_by INT,
  verified_by INT,
  verification_date TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 6. LAPTOP REPAIRS - Laptop/Computer Repair Requests
-- =====================================================================
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
              'cancelled','rejected') DEFAULT 'registered',
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

-- =====================================================================
-- 7. LAPTOP REPAIR STATUS LOG
-- =====================================================================
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

-- =====================================================================
-- 8. LAPTOP QUOTATIONS
-- =====================================================================
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

-- =====================================================================
-- 9. REMOVE GST FIELDS FROM INVOICES
-- =====================================================================
ALTER TABLE invoices DROP COLUMN IF EXISTS gst_number;
ALTER TABLE invoices DROP COLUMN IF EXISTS cgst_percent;
ALTER TABLE invoices DROP COLUMN IF EXISTS sgst_percent;
ALTER TABLE invoices DROP COLUMN IF EXISTS igst_percent;
ALTER TABLE invoices DROP COLUMN IF EXISTS cgst_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS sgst_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS igst_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS gst_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS gst_tax;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_type;

-- Rename tax_percent and tax_amount to service_charge if they exist
ALTER TABLE invoices MODIFY COLUMN tax_percent DECIMAL(5,2) DEFAULT 0 COMMENT 'Service charge/handling charge';
ALTER TABLE invoices MODIFY COLUMN tax_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Service charge amount';

-- =====================================================================
-- 10. UPDATE INVOICE STRUCTURE FOR SERVICE BILL
-- =====================================================================
-- Add fields for Service Bill/Cash Memo format
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type ENUM('invoice','service_bill','cash_memo','receipt') DEFAULT 'invoice' AFTER invoice_number;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_charge_percent DECIMAL(5,2) DEFAULT 0 AFTER payment_verified_at;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS handling_charge DECIMAL(10,2) DEFAULT 0 AFTER service_charge_percent;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_gst_applicable BOOLEAN DEFAULT FALSE AFTER handling_charge;

-- =====================================================================
-- 11. POPULATE COMMISSION SETTINGS WITH DEFAULTS
-- =====================================================================
INSERT IGNORE INTO commission_settings (entity_type, entity_id, entity_name, commission_type, commission_value, admin_commission_percent, technician_commission_percent) 
VALUES 
  ('service', 1, 'Mobile Repair', 'percentage', 10, 5, 5),
  ('service', 2, 'Laptop Repair', 'percentage', 10, 5, 5),
  ('service', 3, 'Screen Replacement', 'fixed', 300, 0, 100),
  ('service', 4, 'Battery Replacement', 'fixed', 200, 0, 100),
  ('service', 5, 'Software Installation', 'fixed', 500, 0, 100);

-- =====================================================================
-- 12. ADD INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_course_purchases_student ON course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_course ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_user ON commission_ledger(user_id, user_role);
CREATE INDEX IF NOT EXISTS idx_commission_payments_user ON commission_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_laptop_repairs_customer ON laptop_repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_laptop_repairs_tech ON laptop_repairs(assigned_technician);
CREATE INDEX IF NOT EXISTS idx_laptop_repairs_status ON laptop_repairs(status);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON course_materials(course_id);

-- =====================================================================
-- 13. POPULATE COURSE MATERIALS SAMPLE DATA
-- =====================================================================
INSERT IGNORE INTO course_materials (course_id, material_type, title, description, sort_order)
SELECT id, 'document', 'Course Introduction', 'Welcome to the course', 1
FROM courses
WHERE status = 'active'
LIMIT 1;

-- =====================================================================
-- 14. UPDATE TECHNICIANS TABLE WITH COMMISSION TRACKING
-- =====================================================================
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS total_commission DECIMAL(10,2) DEFAULT 0 AFTER total_repairs;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0 AFTER total_commission;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS paid_commission DECIMAL(10,2) DEFAULT 0 AFTER pending_commission;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS commission_last_paid TIMESTAMP NULL AFTER paid_commission;

-- =====================================================================
-- 15. UPDATE ADMINS TABLE WITH COMMISSION TRACKING
-- =====================================================================
ALTER TABLE admins ADD COLUMN IF NOT EXISTS total_commission DECIMAL(10,2) DEFAULT 0 AFTER permissions;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0 AFTER total_commission;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS paid_commission DECIMAL(10,2) DEFAULT 0 AFTER pending_commission;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS commission_last_paid TIMESTAMP NULL AFTER paid_commission;

-- =====================================================================
-- 16. UPDATE COURSES TABLE
-- =====================================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0 AFTER published;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500) AFTER price;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id INT AFTER thumbnail;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS student_count INT DEFAULT 0 AFTER instructor_id;

-- =====================================================================
-- END OF UPGRADE SCRIPT
-- =====================================================================
