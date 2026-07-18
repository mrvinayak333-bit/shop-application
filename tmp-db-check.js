const pool = require('./config/db');
(async () => {
  try {
    const [students] = await pool.query("SELECT id, student_id, name, password, status FROM students WHERE student_id='SRMS-2026-4364'");
    console.log('STUDENT ROW:', JSON.stringify(students, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
