const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mobile_repair_system',
    multipleStatements: true
  });

  console.log('🔧 Updating database schema...\n');

  // Repair status update
  await c.query(`ALTER TABLE repair_requests MODIFY COLUMN status ENUM(
    'registered','pickup_done','admin_verified','received_center',
    'under_diagnosis','under_repair','waiting_parts','repair_done',
    'quality_test','ready_delivery','out_delivery','delivered','cancelled'
  ) DEFAULT 'registered'`);
  console.log('✅ Repair statuses updated (11-step tracking)');

  // New columns
  const alters = [
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) AFTER name",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo TEXT AFTER pincode",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS selfie_photo TEXT AFTER photo",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) AFTER tracking_number",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) AFTER first_name",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20) AFTER customer_id",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS customer_address TEXT AFTER model",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS device_photo TEXT AFTER accessories",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS device_condition_multi TEXT AFTER device_condition",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS spare_parts TEXT AFTER notes",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS quotation_notes TEXT AFTER spare_parts",
    "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS quotation_status ENUM('pending','sent','approved','rejected') DEFAULT 'pending'",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20) AFTER commission_percent",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS aadhar_photo TEXT AFTER aadhar_number",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30) AFTER aadhar_photo",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20) AFTER bank_account",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20) AFTER mobile",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20) AFTER permissions",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS aadhar_photo TEXT AFTER aadhar_number",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30) AFTER aadhar_photo",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20) AFTER bank_account",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20) AFTER mobile",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50) AFTER bank_ifsc",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) AFTER commission_type",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20) AFTER payment_method",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id INT AFTER payment_method"
  ];

  for (const alt of alters) {
    await c.query(alt);
  }
  console.log('✅ All new columns added');

  // Payment methods
  await c.query(`CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active'
  )`);
  await c.query(`INSERT IGNORE INTO payment_methods (name) VALUES 
    ('Cash'),('UPI'),('PhonePe'),('Google Pay'),('Paytm'),('Card Payment')`);
  console.log('✅ Payment methods table created');

  // Clean up master: keep only Vinayak
  await c.query('DELETE FROM master_users WHERE id != 1');
  await c.query("UPDATE master_users SET name='Vinayak', email='mr.vinayak333@gmail.com' WHERE id=1");
  console.log('✅ Master account cleaned up');

  // Settings update
  await c.query(`INSERT INTO settings (setting_key, setting_value, description) VALUES 
    ('app_name', 'SHREE RAAM MOBAILE', 'Application Name'),
    ('founder', 'Vinayak Sanjay Kumbhar', 'Founder Name'),
    ('contact_mobile', '919552210333', 'Contact Mobile'),
    ('whatsapp_link', 'https://wa.me/919552210333', 'WhatsApp Link')
    ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`);
  console.log('✅ App settings updated');

  console.log('\n🎉 Database update complete!');
  await c.end();
  process.exit();
})();
