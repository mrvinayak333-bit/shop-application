const mysql = require('mysql2/promise');
require('dotenv').config();

// Debug connection info (Password hidden for security)
console.log('--- Database Connection Debug ---');
console.log('Host:', process.env.DB_HOST || 'localhost (Default)');
console.log('Port:', process.env.DB_PORT || '3306 (Default)');
console.log('User:', process.env.DB_USER || 'root (Default)');
console.log('Database:', process.env.DB_NAME || 'mobile_repair_system');
console.log('SSL Enabled:', process.env.DB_SSL === 'true');
console.log('---------------------------------');

/**
 * DATABASE CONFIGURATION
 * Optimized for production with automatic retries and high timeouts
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mobile_repair_system',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,

  // High timeouts for remote cloud databases (Render -> External DB)
  connectTimeout: 60000, // 60 seconds
  acquireTimeout: 60000, // 60 seconds

  // Mandatory for most cloud MySQL providers
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
};

const pool = mysql.createPool(dbConfig);

/**
 * TEST CONNECTION WITH RETRY
 * Essential for cloud environments where DB might wake up slowly
 */
async function testConnection(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log(`✅ [Attempt ${i + 1}/${retries}] Database Connected Successfully!`);
      conn.release();
      return true;
    } catch (err) {
      console.error(`❌ [Attempt ${i + 1}/${retries}] Connection Error:`, err.message);

      if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
        console.log('HINT: Check if DB_HOST is correct and your database allows remote connections.');
      }

      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  return false;
}

// Automatic start check
testConnection();

module.exports = pool;
module.exports.testConnection = testConnection;
