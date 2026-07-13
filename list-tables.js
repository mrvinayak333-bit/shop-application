const pool = require('./config/db');

(async () => {
  try {
    console.log('🔍 Listing ALL tables in mobile_repair_system database:\n');

    const [tables] = await pool.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'mobile_repair_system' ORDER BY TABLE_NAME");
    
    console.log(`Found ${tables.length} tables:\n`);
    tables.forEach((t, i) => {
      console.log(`${i + 1}. ${t.TABLE_NAME}`);
    });

    console.log('\n✅ Complete!\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();
