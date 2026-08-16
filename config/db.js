const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
require('dotenv').config();

// Determine Database Connection Details
const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'postgres';
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (host.includes('supabase') ? 5432 : 3306);

const isPostgres = port === 5432 || host.includes('supabase') || host.includes('postgres') || process.env.DB_TYPE === 'postgres';
const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
const enableSSL = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && !isLocalHost);
const sslOptions = enableSSL ? { rejectUnauthorized: false } : false;

let poolWrapper = null;

if (isPostgres) {
  // Supabase / PostgreSQL Adapter
  const pgPool = new PgPool({
    host,
    port,
    user: user === 'root' ? 'postgres' : user,
    password: password || 'vinayak@1233',
    database: database === 'srm_mobile_fixit' || database === 'mobile_repair_system' ? 'postgres' : database,
    ssl: sslOptions || { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  // Query formatting helper: Converts MySQL '?' to PostgreSQL '$1, $2, $3...'
  function formatPgQuery(sql, params = []) {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => '$' + (paramIndex++));

    // Handle MySQL specific function conversions if any
    pgSql = pgSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

    // Automatically append RETURNING id to INSERT statements if not present
    const trimmed = pgSql.trim().toUpperCase();
    if (trimmed.startsWith('INSERT') && !trimmed.includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }

    return { pgSql, params };
  }

  poolWrapper = {
    isPostgres: true,
    async query(sql, params = []) {
      const { pgSql, params: formattedParams } = formatPgQuery(sql, params);
      try {
        const res = await pgPool.query(pgSql, formattedParams);
        const trimmed = sql.trim().toUpperCase();

        if (trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('EXPLAIN') || trimmed.startsWith('WITH')) {
          return [res.rows, res.fields];
        } else {
          const insertId = (res.rows && res.rows.length > 0 && res.rows[0].id) ? res.rows[0].id : null;
          const meta = {
            insertId,
            affectedRows: res.rowCount,
            changedRows: res.rowCount
          };
          return [meta, res.fields];
        }
      } catch (err) {
        // If RETURNING id failed because table has no 'id' column, fallback query without RETURNING
        if (err.message && err.message.includes('column "id" does not exist')) {
          let fallbackSql = sql.replace(/\?/g, (_, idx) => '$' + (idx + 1));
          let idx = 1;
          fallbackSql = sql.replace(/\?/g, () => '$' + (idx++));
          const res = await pgPool.query(fallbackSql, formattedParams);
          return [{ insertId: null, affectedRows: res.rowCount }, res.fields];
        }
        throw err;
      }
    },
    async getConnection() {
      const client = await pgPool.connect();
      return {
        query: (sql, params) => poolWrapper.query(sql, params),
        release: () => client.release()
      };
    },
    end: () => pgPool.end()
  };

  pgPool.connect()
    .then(client => {
      console.log(`✅ Supabase PostgreSQL Database Connected Successfully [Host: ${host}:${port} | Database: ${database}]`);
      client.release();
    })
    .catch(err => {
      console.error(`❌ Supabase PostgreSQL Connection Notice (${host}):`, err.message);
    });

} else {
  // Standard MySQL Adapter
  let dbConfig = {
    host,
    port,
    user,
    password,
    database: database === 'postgres' ? 'mobile_repair_system' : database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: sslOptions
  };

  const mysqlPool = mysql.createPool(dbConfig);

  poolWrapper = {
    isPostgres: false,
    query: (sql, params) => mysqlPool.query(sql, params),
    getConnection: () => mysqlPool.getConnection(),
    end: () => mysqlPool.end()
  };

  mysqlPool.getConnection()
    .then(conn => {
      console.log(`✅ MySQL Database Connected Successfully [DB: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port} | SSL: ${enableSSL ? 'ENABLED' : 'DISABLED'}]`);
      conn.release();
    })
    .catch(err => {
      console.error(`❌ Database Connection Notice (${dbConfig.host}):`, err.message);
    });
}

module.exports = poolWrapper;
