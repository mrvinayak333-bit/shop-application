const pool = require('./config/db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('Seeding test accounts...');
    
    // 1. Technician: tech@shop.com / tech123
    const techEmail = 'tech@shop.com';
    const techPassword = await bcrypt.hash('tech123', 10);
    const [existingTech] = await pool.query('SELECT id FROM technicians WHERE email = ?', [techEmail]);
    
    if (existingTech.length === 0) {
      await pool.query(
        'INSERT INTO technicians (name, email, password, mobile, created_by) VALUES (?, ?, ?, ?, ?)',
        ['Test Technician', techEmail, techPassword, '7777777777', 1]
      );
      console.log('✓ Created technician tech@shop.com');
    } else {
      await pool.query('UPDATE technicians SET password = ? WHERE email = ?', [techPassword, techEmail]);
      console.log('✓ Updated technician tech@shop.com password');
    }

    // 2. Customer: customer@shop.com / customer123
    const custEmail = 'customer@shop.com';
    const custPassword = await bcrypt.hash('customer123', 10);
    const [existingCust] = await pool.query('SELECT id FROM customers WHERE email = ?', [custEmail]);
    
    if (existingCust.length === 0) {
      await pool.query(
        'INSERT INTO customers (name, email, password, mobile) VALUES (?, ?, ?, ?)',
        ['Test Customer', custEmail, custPassword, '6666666666']
      );
      console.log('✓ Created customer customer@shop.com');
    } else {
      await pool.query('UPDATE customers SET password = ? WHERE email = ?', [custPassword, custEmail]);
      console.log('✓ Updated customer customer@shop.com password');
    }

    // 3. Student: SRMS-2026-4364 / student123
    const studentId = 'SRMS-2026-4364';
    const studentPassword = await bcrypt.hash('student123', 10);
    const [existingStudent] = await pool.query('SELECT id FROM students WHERE student_id = ?', [studentId]);
    if (existingStudent.length === 0) {
      await pool.query(
        'INSERT INTO students (student_id, name, email, mobile, password, status, enrollment_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [studentId, 'Test Student', 'student@shop.com', '5555555555', studentPassword, 'active']
      );
      console.log('✓ Created student SRMS-2026-4364');
    } else {
      await pool.query('UPDATE students SET password = ?, android_device_id = NULL WHERE student_id = ?', [studentPassword, studentId]);
      console.log('✓ Reset student SRMS-2026-4364 device ID and updated password');
    }

    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
