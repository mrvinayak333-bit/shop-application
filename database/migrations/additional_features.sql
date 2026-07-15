-- DATABASE MIGRATIONS FOR ADDITIONAL LMS FEATURES
USE mobile_repair_system;

-- 1. Alter Students Table to add profile columns
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fathers_name VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS age INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dob DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL;

-- 2. Create Certificate Templates Table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_file VARCHAR(500) NOT NULL,
  institute_logo VARCHAR(500) DEFAULT NULL,
  institute_signature VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Generated Certificates Table
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

-- 4. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 5. Create Support Messages Table
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

-- 6. Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_type ENUM('all', 'selected') DEFAULT 'all',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Announcement Recipients Table (for target_type = 'selected')
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  student_id INT NOT NULL,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
