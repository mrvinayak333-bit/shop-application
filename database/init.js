const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * INITIALIZE DATABASE SCRIPT
 * Creates the database and all tables from PROD_SCHEMA.sql
 * Includes automatic retry for cloud deployments
 */
async function initDatabase(retries = 5, delay = 5000) {
  let connection;

  console.log('--- Initializing Database ---');
  console.log('Host:', process.env.DB_HOST || 'localhost');
  console.log('Database:', process.env.DB_NAME || 'mobile_repair_system');

  for (let i = 0; i < retries; i++) {
    try {
      // Connect without selecting database first
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
        connectTimeout: 30000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
      });

      console.log(`✅ [Attempt ${i + 1}] Connected to MySQL server!`);

      // Read and execute schema
      const schemaPath = path.join(__dirname, 'PROD_SCHEMA.sql');
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');

      console.log('⏳ Creating database and tables from PROD_SCHEMA.sql...');
      await connection.query(schema);

      console.log('🎉 Database initialized successfully!');
      console.log('Database: mobile_repair_system');
      console.log('Tables created: 31');
      console.log('\nDefault Login Credentials:');
      console.log('  Master:  mr.vinayak333@gmail.com / VINAYAK@333');
      console.log('  Admin:   admin@repairsystem.com / master123');

      await connection.end();
      process.exit(0);

    } catch (err) {
      console.error(`❌ [Attempt ${i + 1}] Initialization failed:`, err.message);

      if (connection) await connection.end().catch(() => {});

      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error('🛑 CRITICAL: Max retries reached. Database initialization aborted.');
        process.exit(1);
      }
    }
  }
}

initDatabase();
