const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mobile_repair_system',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Database Connected Successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database Connection Failed:', err.message);
    console.log('Make sure MySQL is running and the database exists.');
    console.log('Run: npm run db-init to create the database and tables.');
  });

module.exports = pool;
