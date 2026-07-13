const pool = require('./config/db');
(async () => {
  try {
    await pool.query("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) DEFAULT 'system'");
    console.log('notifications type fixed');
  } catch(e) { console.log('notif err:', e.message); }
  try {
    await pool.query("ALTER TABLE repair_requests MODIFY COLUMN status VARCHAR(50) DEFAULT 'registered'");
    console.log('repair_requests status fixed');
  } catch(e) { console.log('repair err:', e.message); }
  try {
    await pool.query("ALTER TABLE quotations MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");
    console.log('quotations status fixed');
  } catch(e) { console.log('quot err:', e.message); }
  process.exit(0);
})();
