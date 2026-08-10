const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const parsed = new URL(dbUrl);
    dbConfig = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace('/', '') : 'mobile_repair_system',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
  } catch (e) {
    console.error('Error parsing DATABASE_URL, fallback to DB_HOST parameters:', e.message);
  }
}

if (!dbConfig.host) {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mobile_repair_system',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Database Connected Successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database Connection Notice:', err.message);
  });

module.exports = pool;
