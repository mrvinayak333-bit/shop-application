const fs = require('fs');
const pool = require('./config/db');

(async () => {
  try {
    const sql = fs.readFileSync('./database/comprehensive_upgrade.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    console.log(`Running ${statements.length} SQL statements...`);
    let count = 0;
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await pool.query(statement);
        count++;
      } catch (e) {
        // Silently skip errors (tables already exist, etc.)
        if (!e.message.includes('already exists') && !e.message.includes('Unknown column')) {
          console.warn(`Statement ${count} warning:`, e.message.substring(0, 100));
        }
      }
    }
    
    console.log(`✅ Migration complete! Executed ${count} statements`);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit();
  }
})();
