-- LMS tables: courses, modules, contents, enrollments
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_free TINYINT(1) DEFAULT 0,
  duration_days INT DEFAULT 0,
  certificate_enabled TINYINT(1) DEFAULT 0,
  published TINYINT(1) DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  url VARCHAR(1024),
  file_path VARCHAR(1024),
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  user_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATE DEFAULT NULL,
  progress JSON DEFAULT NULL,
  UNIQUE KEY uq_course_user (course_id,user_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
