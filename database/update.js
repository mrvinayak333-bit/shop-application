const pool = require('../config/db');

(async () => {
  try {
    console.log('⏳ Connecting to database for update...');
    console.log('🔧 Updating database schema...\n');

    // Repair status update
    try {
      await pool.query(`ALTER TABLE repair_requests ALTER COLUMN status TYPE VARCHAR(200)`);
      console.log('✅ Repair statuses updated (11-step tracking)');
    } catch (e) {
      console.warn('Status update warning:', e.message);
    }

    // New columns
    const alters = [
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo TEXT",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS selfie_photo TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20)",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS customer_address TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS device_photo TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS device_condition_multi TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS spare_parts TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS quotation_notes TEXT",
      "ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS quotation_status VARCHAR(50) DEFAULT 'pending'",
      "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20)",
      "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS aadhar_photo TEXT",
      "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30)",
      "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20)",
      "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS aadhar_photo TEXT",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50)",
      "ALTER TABLE admins ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2)",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id INT"
    ];

    for (const alt of alters) {
      try {
        await pool.query(alt);
      } catch (e) {
        if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
          console.warn('Warning:', e.message);
        }
      }
    }
    console.log('✅ All new columns checked/added');

    // Settings update
    await pool.query(`INSERT INTO settings (setting_key, setting_value, description) VALUES
      ('app_name', 'SHREE RAAM MOBAILE', 'Application Name'),
      ('founder', 'Vinayak Sanjay Kumbhar', 'Founder Name'),
      ('contact_mobile', '919552210333', 'Contact Mobile'),
      ('whatsapp_link', 'https://wa.me/919552210333', 'WhatsApp Link')
      ON CONFLICT (setting_key) DO NOTHING`);
    console.log('✅ App settings updated');

    console.log('\n🎉 Database update complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database update failed:', err.message);
    process.exit(1);
  }
})();
