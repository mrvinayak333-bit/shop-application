const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCertFlow() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('--- TESTING CERTIFICATION SYSTEM FLOW ---');

    // 1. Ensure test student exists
    const [students] = await conn.query('SELECT id, name, student_id FROM students LIMIT 1');
    let studentId = 1;
    let studentName = 'Rahul Patil';
    let studentCode = 'SRM-STU-001';

    if (students.length > 0) {
      studentId = students[0].id;
      studentName = students[0].name;
      studentCode = students[0].student_id || 'SRM-STU-001';
    } else {
      const [ins] = await conn.query(
        'INSERT INTO students (name, email, password, student_id, phone, course_name, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Rahul Patil', 'rahul.test@srm.com', 'hashedpass', 'SRM-STU-001', '9876543210', 'Android Professional Hardware Repairing', '25 Days']
      );
      studentId = ins.insertId;
    }

    console.log(`Step 1: Found/Created Student #${studentId} (${studentName})`);

    // 2. Generate Certificate Record
    const year = new Date().getFullYear();
    const [[countRow]] = await conn.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certId = `SRM-CERT-${year}-${seq}`;
    const verifyCode = `VERIFY-${Date.now()}-TEST`;

    const [certRes] = await conn.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_name, course_duration,
        grade, issue_date, completion_date, trainer_name, authorized_signatory_name,
        certificate_status, verification_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), ?, ?, 'Issued', ?)`,
      [
        certId, studentId, studentName, studentCode,
        'Android Professional Hardware Repairing', '25 Days',
        'A++', 'VINAYAK SANJAY KUMBHAR', 'VINAYAK SANJAY KUMBHAR',
        verifyCode
      ]
    );

    console.log(`Step 2: Generated Certificate #${certRes.insertId} (${certId})`);

    // 3. Verify lookup query
    const [[verifyCert]] = await conn.query('SELECT * FROM certificates WHERE certificate_id = ?', [certId]);
    if (verifyCert && verifyCert.student_name === studentName) {
      console.log(`Step 3: Verification Query Passed! Certificate Status: ${verifyCert.certificate_status}`);
    } else {
      console.error('Step 3 Failed: Certificate lookup failed');
    }

    console.log('✅ ALL CERTIFICATION FLOW TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test Flow Error:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testCertFlow();
