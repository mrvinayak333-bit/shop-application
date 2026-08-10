const mysql = require('mysql2/promise');
require('dotenv').config();

async function upgrade() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('Upgrading database schema for Certification System...');

    // Settings
    const settings = [
      ['institute_name', 'SRM MOBAILE FIXIT', 'Institute Name'],
      ['institute_tagline', 'Mobile Repairing & Technical Training Institute', 'Institute Tagline'],
      ['institute_address', 'Solapur, Maharashtra – 413002', 'Official Institute Address'],
      ['founder_name', 'VINAYAK SANJAY KUMBHAR', 'Founder & Master Trainer Name'],
      ['founder_designation', 'FOUNDER & TRAINER', 'Founder Designation'],
      ['authorized_signatory_name', 'VINAYAK SANJAY KUMBHAR', 'Authorized Signatory Name'],
      ['authorized_signatory_designation', 'AUTHORIZED SIGNATORY', 'Authorized Signatory Designation'],
      ['founder_signature', '/uploads/certificates/founder_signature.png', 'Founder Signature Path'],
      ['authorized_signature', '/uploads/certificates/authorized_signature.png', 'Authorized Signature Path']
    ];

    for (const [key, val, desc] of settings) {
      await conn.query(
        'INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, val, desc]
      );
    }

    // Update old address in settings
    await conn.query(
      "UPDATE settings SET setting_value = 'Solapur, Maharashtra – 413002' WHERE setting_key = 'institute_address' OR setting_value LIKE '%Kasegaon%'"
    );

    // Columns to add to certificate_templates
    const tmplAddCols = [
      ['is_default', 'TINYINT(1) DEFAULT 1'],
      ['template_name', 'VARCHAR(255) DEFAULT "SRM Official Standard Template"'],
      ['bg_image', 'VARCHAR(500) DEFAULT NULL'],
      ['authorized_signature', 'VARCHAR(500) DEFAULT NULL']
    ];

    const [tmplCols] = await conn.query('DESCRIBE certificate_templates');
    const existingTmplCols = tmplCols.map(c => c.Field);

    for (const [col, spec] of tmplAddCols) {
      if (!existingTmplCols.includes(col)) {
        await conn.query(`ALTER TABLE certificate_templates ADD COLUMN ${col} ${spec}`);
        console.log(`Added column ${col} to certificate_templates`);
      }
    }

    // Columns to add to certificates
    const certAddCols = [
      ['certificate_id', 'VARCHAR(100) DEFAULT NULL'],
      ['student_name', 'VARCHAR(255) DEFAULT ""'],
      ['student_code', 'VARCHAR(100) DEFAULT NULL'],
      ['course_id', 'INT DEFAULT NULL'],
      ['course_name', 'VARCHAR(255) DEFAULT "Android & iPhone Repairing Course"'],
      ['course_duration', 'VARCHAR(100) DEFAULT "25 Days"'],
      ['grade', 'VARCHAR(50) DEFAULT "A++"'],
      ['completion_date', 'DATE DEFAULT NULL'],
      ['trainer_name', 'VARCHAR(255) DEFAULT "VINAYAK SANJAY KUMBHAR"'],
      ['trainer_signature', 'VARCHAR(500) DEFAULT NULL'],
      ['authorized_signatory_name', 'VARCHAR(255) DEFAULT "VINAYAK SANJAY KUMBHAR"'],
      ['authorized_signatory_signature', 'VARCHAR(500) DEFAULT NULL'],
      ['template_id', 'INT DEFAULT NULL'],
      ['certificate_status', 'VARCHAR(50) DEFAULT "Issued"'],
      ['verification_code', 'VARCHAR(100) DEFAULT NULL'],
      ['qr_code_url', 'VARCHAR(500) DEFAULT NULL'],
      ['pdf_url', 'VARCHAR(500) DEFAULT NULL'],
      ['notes', 'TEXT DEFAULT NULL']
    ];

    const [certCols] = await conn.query('DESCRIBE certificates');
    const existingCertCols = certCols.map(c => c.Field);

    for (const [col, spec] of certAddCols) {
      if (!existingCertCols.includes(col)) {
        await conn.query(`ALTER TABLE certificates ADD COLUMN ${col} ${spec}`);
        console.log(`Added column ${col} to certificates`);
      }
    }

    console.log('✅ Certification System Database Schema Upgraded Successfully!');
  } catch (err) {
    console.error('❌ Upgrade Error:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

upgrade();
