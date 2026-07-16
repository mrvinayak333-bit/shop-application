const fs = require('fs');
const path = require('path');
const { testConnection } = require('./config/db');
const pool = require('./config/db');

(async () => {
  try {
    console.log('🚀 Starting Migration Script...');

    // 1. Ensure DB connection
    const isConnected = await testConnection(3, 3000);
    if (!isConnected) {
      console.error('❌ Migration Aborted: No DB connection.');
      process.exit(1);
    }

    const migrationFile = path.join(__dirname, 'database', 'comprehensive_upgrade.sql');
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ Migration Aborted: File not found:', migrationFile);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    console.log(`Running ${statements.length} SQL statements...`);
    let count = 0;
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await pool.query(statement);
        count++;
      } catch (e) {
        // Silently skip common "exists" errors
        if (!e.message.includes('already exists') && !e.message.includes('Duplicate column')) {
          console.warn(`Statement ${count + 1} warning:`, e.message.substring(0, 100));
        }
      }
    }
    
    console.log(`✅ Migration complete! Executed ${count} statements.`);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit();
  }
})();
