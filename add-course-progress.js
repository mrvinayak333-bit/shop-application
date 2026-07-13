const pool = require('./config/db');

(async () => {
  try {
    console.log('Adding `progress` column to course_enrollments if not exists...');
    await pool.query("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS progress JSON NULL");
    console.log('✅ Column added or already exists');
  } catch (err) {
    console.error('Error adding column:', err.message);
  } finally {
    process.exit();
  }
})();
