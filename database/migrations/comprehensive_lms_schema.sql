-- UPGRADE FOR NEW COURSE MANAGEMENT SYSTEM
USE mobile_repair_system;

-- 1. Drop existing course-related tables in correct order of dependency
DROP TABLE IF EXISTS student_item_progress;
DROP TABLE IF EXISTS course_subject_items;
DROP TABLE IF EXISTS course_subjects;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS course_purchases;
DROP TABLE IF EXISTS youtube_videos;
DROP TABLE IF EXISTS course_materials;
DROP TABLE IF EXISTS course_contents;
DROP TABLE IF EXISTS course_modules;
DROP TABLE IF EXISTS courses;

-- 2. Create Courses Table
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_free TINYINT(1) DEFAULT 0,
  banner_image VARCHAR(500) DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Create Course Subjects Table (subjects inside courses)
CREATE TABLE course_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 4. Create Course Subject Items Table (videos, pdfs, etc. inside subjects)
CREATE TABLE course_subject_items (
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

-- 5. Create Course Enrollments Table (approved students access)
CREATE TABLE course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_course (student_id, course_id)
);

-- 6. Create Course Purchases Table (payment requests)
CREATE TABLE course_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  payment_method VARCHAR(50) DEFAULT 'manual',
  payment_screenshot VARCHAR(500) DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 7. Create Student Item Progress Table (items completed)
CREATE TABLE student_item_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  item_id INT NOT NULL,
  completed TINYINT(1) DEFAULT 1,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES course_subject_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_item (student_id, item_id)
);

-- 8. Add device security column to students table if not exists
ALTER TABLE students ADD COLUMN IF NOT EXISTS android_device_id VARCHAR(255) DEFAULT NULL;
