-- ====================================================
-- SRM MOBAILE FIXIT - CERTIFICATION SYSTEM MIGRATION
-- ====================================================

-- 1. UPDATE DEFAULT SETTINGS FOR BRANDING & ADDRESS
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('institute_name', 'SRM MOBAILE FIXIT', 'Institute Name'),
  ('institute_tagline', 'Mobile Repairing & Technical Training Institute', 'Institute Tagline'),
  ('institute_address', 'Solapur, Maharashtra – 413002', 'Official Institute Address'),
  ('founder_name', 'VINAYAK SANJAY KUMBHAR', 'Founder & Master Trainer Name'),
  ('founder_designation', 'FOUNDER & TRAINER', 'Founder Designation'),
  ('authorized_signatory_name', 'VINAYAK SANJAY KUMBHAR', 'Authorized Signatory Name'),
  ('authorized_signatory_designation', 'AUTHORIZED SIGNATORY', 'Authorized Signatory Designation'),
  ('founder_signature', '/uploads/certificates/founder_signature.png', 'Founder Signature Path'),
  ('authorized_signature', '/uploads/certificates/authorized_signature.png', 'Authorized Signature Path')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Replace old address everywhere in settings if present
UPDATE settings SET setting_value = 'Solapur, Maharashtra – 413002' WHERE setting_key = 'institute_address' OR setting_value LIKE '%Kasegaon%';

-- 2. UPGRADE CERTIFICATE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS certificate_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) DEFAULT 'SRM Official Standard Template',
  template_file VARCHAR(500) DEFAULT NULL,
  bg_image VARCHAR(500) DEFAULT NULL,
  institute_logo VARCHAR(500) DEFAULT '/srm_navbar_logo.png',
  institute_signature VARCHAR(500) DEFAULT NULL,
  authorized_signature VARCHAR(500) DEFAULT NULL,
  is_default TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safely add missing columns to certificate_templates
SET @dbname = DATABASE();
SET @tablename = "certificate_templates";

SET @columnname = "template_name";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE certificate_templates ADD COLUMN template_name VARCHAR(255) DEFAULT 'SRM Official Standard Template';"
));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = "bg_image";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE certificate_templates ADD COLUMN bg_image VARCHAR(500) DEFAULT NULL;"
));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = "authorized_signature";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE certificate_templates ADD COLUMN authorized_signature VARCHAR(500) DEFAULT NULL;"
));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. CERTIFICATES MAIN TABLE
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certificate_id VARCHAR(100) UNIQUE NOT NULL,
  student_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_code VARCHAR(100) DEFAULT NULL,
  course_id INT DEFAULT NULL,
  course_name VARCHAR(255) NOT NULL,
  course_duration VARCHAR(100) DEFAULT '25 Days',
  grade VARCHAR(50) DEFAULT 'A++',
  completion_date DATE DEFAULT NULL,
  issue_date DATE NOT NULL,
  trainer_name VARCHAR(255) DEFAULT 'VINAYAK SANJAY KUMBHAR',
  trainer_signature VARCHAR(500) DEFAULT NULL,
  authorized_signatory_name VARCHAR(255) DEFAULT 'VINAYAK SANJAY KUMBHAR',
  authorized_signatory_signature VARCHAR(500) DEFAULT NULL,
  template_id INT DEFAULT NULL,
  certificate_status ENUM('Draft', 'Generated', 'Issued', 'Revoked') DEFAULT 'Issued',
  verification_code VARCHAR(100) UNIQUE NOT NULL,
  qr_code_url VARCHAR(500) DEFAULT NULL,
  pdf_url VARCHAR(500) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Safely add missing columns to certificates table if it already exists
SET @tablename = "certificates";

SET @columnname = "certificate_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE certificates ADD COLUMN certificate_id VARCHAR(100) UNIQUE NOT NULL AFTER id;"
));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. INSERT DEFAULT TEMPLATE IF NONE EXISTS
INSERT INTO certificate_templates (template_name, is_default, is_active)
SELECT 'SRM Official Standard Template', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM certificate_templates LIMIT 1);
