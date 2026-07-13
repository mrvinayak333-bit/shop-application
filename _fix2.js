const fs = require("fs");
let s = fs.readFileSync("database/schema.sql", "utf8");

const newTables = `

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
`;

s = s.replace(
  ");\r\n\r\n-- =====================================================\r\n-- DEFAULT DATA INSERTIONS",
  ");" + newTables + "\r\n-- =====================================================\r\n-- DEFAULT DATA INSERTIONS"
);

// Update settings
s = s.replace("'Mobile Repair & Training System', 'Application Name'", "'SHREE RAAM MOBILE', 'Application Name'");
s = s.replace("'Welcome to Mobile Repairing & Training Management System', 'Welcome Message'", "'Welcome to SHREE RAAM MOBILE - Professional Repair Tracking', 'Welcome Message'");

fs.writeFileSync("database/schema.sql", s);
console.log("done");
