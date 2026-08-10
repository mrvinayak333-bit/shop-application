const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine Database Connection Details
const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'srm_mobile_fixit';
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;

// Auto SSL detection: Enable SSL if DB_SSL is 'true' OR connecting to cloud host (not localhost)
const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
const enableSSL = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && !isLocalHost);
const sslOptions = enableSSL ? { rejectUnauthorized: false } : false;

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
      database: parsed.pathname ? parsed.pathname.replace('/', '') : database,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: sslOptions
    };
  } catch (e) {
    console.warn('Notice parsing DATABASE_URL, fallback to individual DB_* parameters:', e.message);
  }
}

if (!dbConfig.host) {
  dbConfig = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: sslOptions
  };
}

// Automatic Database Creation for Local & Self-Hosted MySQL
async function ensureDatabaseExists() {
  if (isLocalHost) {
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        ssl: sslOptions
      });
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.end();
    } catch (err) {
      console.warn(`Notice during DB creation check: ${err.message}`);
    }
  }
}

// Ensure Database exists before pool initialization
ensureDatabaseExists();

const pool = mysql.createPool(dbConfig);

// Verify initial pool connection
pool.getConnection()
  .then(conn => {
    console.log(`✅ MySQL Database Connected Successfully [DB: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port} | SSL: ${enableSSL ? 'ENABLED' : 'DISABLED'}]`);
    conn.release();
  })
  .catch(err => {
    console.error(`❌ Database Connection Notice (${dbConfig.host}):`, err.message);
  });

module.exports = pool;
