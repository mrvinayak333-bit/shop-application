-- DATABASE MIGRATIONS FOR DYNAMIC SMART DEVICE TYPES & BRANDS
USE mobile_repair_system;

-- 1. Create Device Types Table
CREATE TABLE IF NOT EXISTS device_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_type_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_type_id) REFERENCES device_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_type_brand (device_type_id, name)
);

-- 3. Create Models Table
CREATE TABLE IF NOT EXISTS models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  UNIQUE KEY unique_brand_model (brand_id, name)
);

-- 4. Alter Repair Requests to add dynamic info columns
ALTER TABLE repair_requests 
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS imei2 VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processor VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ram VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storage VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS warranty_status VARCHAR(50) DEFAULT NULL;

-- 5. Seed default device types
INSERT IGNORE INTO device_types (id, name, is_active) VALUES 
(1, 'Smartphone', 1),
(2, 'Tablet', 1),
(3, 'MacBook', 1),
(4, 'Laptop', 1),
(5, 'Desktop Computer', 1);

-- 6. Seed smartphone & tablet brands (Device type 1 & 2)
-- Smartphone brands
INSERT IGNORE INTO brands (device_type_id, name, is_active) VALUES
(1, 'Apple (iPhone)', 1),
(1, 'Samsung', 1),
(1, 'OPPO', 1),
(1, 'vivo', 1),
(1, 'realme', 1),
(1, 'Xiaomi', 1),
(1, 'Redmi', 1),
(1, 'POCO', 1),
(1, 'OnePlus', 1),
(1, 'Motorola', 1),
(1, 'Nokia', 1),
(1, 'Google Pixel', 1),
(1, 'Huawei', 1),
(1, 'Honor', 1),
(1, 'Infinix', 1),
(1, 'Tecno', 1),
(1, 'Lava', 1),
(1, 'Micromax', 1),
(1, 'ASUS', 1),
(1, 'Sony', 1),
(1, 'Nothing', 1),
(1, 'IQOO', 1),
(1, 'Acer', 1),
(1, 'Lenovo', 1),
(1, 'Blackview', 1),
(1, 'ZTE', 1),
(1, 'Meizu', 1),
(1, 'HTC', 1),
(1, 'Panasonic', 1),
(1, 'Sharp', 1),
(1, 'TCL', 1),
(1, 'Other', 1);

-- Tablet brands
INSERT IGNORE INTO brands (device_type_id, name, is_active) VALUES
(2, 'Apple (iPad)', 1),
(2, 'Samsung Galaxy Tab', 1),
(2, 'Lenovo Tab', 1),
(2, 'realme Pad', 1),
(2, 'Xiaomi Pad', 1),
(2, 'OnePlus Pad', 1),
(2, 'ASUS', 1),
(2, 'Huawei', 1),
(2, 'Nokia', 1),
(2, 'Other', 1);

-- 7. Seed MacBook brands (Device type 3)
INSERT IGNORE INTO brands (device_type_id, name, is_active) VALUES
(3, 'Apple MacBook Air', 1),
(3, 'Apple MacBook Pro', 1),
(3, 'Other', 1);

-- 8. Seed laptop brands (Device type 4)
INSERT IGNORE INTO brands (device_type_id, name, is_active) VALUES
(4, 'HP', 1),
(4, 'Dell', 1),
(4, 'Lenovo', 1),
(4, 'ASUS', 1),
(4, 'Acer', 1),
(4, 'MSI', 1),
(4, 'Samsung', 1),
(4, 'Apple', 1),
(4, 'Microsoft Surface', 1),
(4, 'Razer', 1),
(4, 'LG', 1),
(4, 'Huawei', 1),
(4, 'Toshiba', 1),
(4, 'Fujitsu', 1),
(4, 'Alienware', 1),
(4, 'Gigabyte', 1),
(4, 'Chuwi', 1),
(4, 'Avita', 1),
(4, 'Vaio', 1),
(4, 'Other', 1);

-- 9. Seed desktop brands (Device type 5)
INSERT IGNORE INTO brands (device_type_id, name, is_active) VALUES
(5, 'Custom Built PC', 1),
(5, 'HP', 1),
(5, 'Dell', 1),
(5, 'Lenovo', 1),
(5, 'ASUS', 1),
(5, 'Acer', 1),
(5, 'MSI', 1),
(5, 'Apple Mac', 1),
(5, 'Intel NUC', 1),
(5, 'Other', 1);
