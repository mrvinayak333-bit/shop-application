const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDefaults() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('Fixing default values for legacy fields in certificates table...');

    await conn.query('ALTER TABLE certificates MODIFY COLUMN file_path VARCHAR(500) DEFAULT NULL');
    await conn.query('ALTER TABLE certificates MODIFY COLUMN certificate_type VARCHAR(50) DEFAULT "pdf"');
    await conn.query('ALTER TABLE certificates MODIFY COLUMN title VARCHAR(255) DEFAULT "Certificate of Completion"');

    console.log('✅ Legacy columns updated to allow null/default values successfully!');
  } catch (err) {
    console.error('❌ Error fixing defaults:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

fixDefaults();
