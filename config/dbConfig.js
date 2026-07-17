require('dotenv').config();

function getDbConfig() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;

  // Enforce configuration in production (no localhost fallbacks)
  if (isProduction && !connectionString && !process.env.DB_HOST) {
    throw new Error('CRITICAL: Production database configuration is missing. You must define DATABASE_URL or DB_HOST.');
  }

  const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'mobile_repair_system',
    ssl: null
  };

  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);
      dbConfig.host = parsedUrl.hostname;
      dbConfig.port = parsedUrl.port ? parseInt(parsedUrl.port) : 5432;
      dbConfig.user = parsedUrl.username;
      dbConfig.password = decodeURIComponent(parsedUrl.password || '');
      dbConfig.database = parsedUrl.pathname.replace(/^\//, '');
      
      // Keep query parameters if they specify SSL configuration
      if (parsedUrl.searchParams.get('ssl-mode') || parsedUrl.searchParams.get('ssl')) {
        dbConfig.ssl = { rejectUnauthorized: false };
      }
    } catch (err) {
      console.error('Error parsing database connection URL:', err.message);
    }
  } else {
    // Determine the host (no localhost fallback in production)
    const envHost = process.env.DB_HOST || process.env.MYSQLHOST || process.env.PGHOST;
    if (isProduction && !envHost) {
      throw new Error('CRITICAL: DB_HOST environment variable is missing in production.');
    }
    dbConfig.host = envHost || 'localhost';

    dbConfig.port = parseInt(process.env.DB_PORT || process.env.PGPORT || process.env.MYSQLPORT || '5432');
    dbConfig.user = process.env.DB_USER || process.env.PGUSER || process.env.MYSQLUSER || (isProduction ? '' : 'postgres');
    dbConfig.password = process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.MYSQLPASSWORD || '';
    dbConfig.database = process.env.DB_NAME || process.env.PGDATABASE || process.env.MYSQLDATABASE || (isProduction ? '' : 'mobile_repair_system');
  }

  // SSL Configuration
  const explicitSslDisabled = process.env.DB_SSL === 'false' || process.env.MYSQL_SSL === 'false';
  
  if (!explicitSslDisabled) {
    const isRemoteDb = dbConfig.host && 
                       dbConfig.host !== 'localhost' && 
                       dbConfig.host !== '127.0.0.1' && 
                       !dbConfig.host.endsWith('.internal');

    const requiresSsl = process.env.DB_SSL === 'true' || 
                        process.env.DB_SSL === 'require' || 
                        process.env.MYSQL_SSL === 'true' || 
                        (dbConfig.host && (
                          dbConfig.host.includes('aivencloud.com') || 
                          dbConfig.host.includes('avns.net') || 
                          dbConfig.host.includes('railway')
                        )) || 
                        isRemoteDb;

    if (requiresSsl) {
      dbConfig.ssl = { rejectUnauthorized: false };

      // Optional strict verification if a custom CA is supplied (base64 or plain certificate text)
      if (process.env.DB_SSL_CA) {
        try {
          const caContent = process.env.DB_SSL_CA.startsWith('-----BEGIN CERTIFICATE-----')
            ? process.env.DB_SSL_CA
            : Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf8');
          dbConfig.ssl = {
            ca: caContent,
            rejectUnauthorized: true
          };
        } catch (caErr) {
          console.warn('⚠️ Warning: Failed to parse custom DB_SSL_CA. Falling back to secure default (rejectUnauthorized: false).', caErr.message);
        }
      }
    }
  }

  return dbConfig;
}

module.exports = getDbConfig();
