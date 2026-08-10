const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system',
      multipleStatements: true
    });

    console.log('Connected to MySQL database for migration...');

    const sqlPath = path.join(__dirname, 'database', 'migrations', 'certification_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);

    console.log('✅ Certification System Database Migration Executed Successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

runMigration();
