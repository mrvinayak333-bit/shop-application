const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database and tables...');
    await connection.query(schema);

    console.log('✅ Database initialized successfully!');
    console.log('Database: mobile_repair_system');
    console.log('Tables created: 23');
    console.log('\nDefault Login Credentials:');
    console.log('  Master:  mr.vinayak333@gmail.com / VINAYAK@333');
    console.log('  Admin:   admin@repairsystem.com / master123');
    console.log('\nYou can now run: npm start');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  } finally {
    if (connection) await connection.end();
    process.exit();
  }
}

initDatabase();
