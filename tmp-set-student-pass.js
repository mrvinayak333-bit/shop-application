const pool = require('./config/db');
const bcrypt = require('bcryptjs');
(async ()=>{
  try {
    const plain = process.argv[2] || 'student123';
    const hashed = await bcrypt.hash(plain, 10);
    const studentId = process.argv[3] || 'SRMS-2026-4364';
    const [res] = await pool.query('UPDATE students SET password = ? WHERE student_id = ?', [hashed, studentId]);
    console.log('Updated rows:', res.affectedRows);
    const [rows] = await pool.query('SELECT id,student_id,name,password FROM students WHERE student_id = ?', [studentId]);
    console.log('Student now:', rows);
  } catch (e) { console.error(e); }
  process.exit();
})();