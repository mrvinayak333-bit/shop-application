const mysql = require('mysql2/promise');
require('dotenv').config();

async function testGenerateEndpoint() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('--- TESTING GENERATE CERTIFICATE ENDPOINT SQL QUERY ---');

    const [students] = await conn.query('SELECT id, name, student_id FROM students LIMIT 1');
    if (students.length === 0) {
      console.log('No students found in DB');
      process.exit(1);
    }
    const student = students[0];

    const year = new Date().getFullYear();
    const [[countRow]] = await conn.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certificate_id = `SRM-CERT-${year}-${seq}`;
    const verification_code = `VERIFY-${Date.now()}-GEN-TEST`;

    const [result] = await conn.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_id, course_name,
        course_duration, grade, completion_date, issue_date, trainer_name, trainer_signature,
        authorized_signatory_name, authorized_signatory_signature, template_id,
        certificate_status, verification_code, qr_code_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Issued', ?, ?)`,
      [
        certificate_id,
        student.id,
        student.name,
        student.student_id || null,
        null,
        'Android & iPhone IC-Level Repairing Course',
        '25 Days',
        'A++',
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0],
        'VINAYAK SANJAY KUMBHAR',
        '/uploads/certificates/founder_signature.png',
        'VINAYAK SANJAY KUMBHAR',
        '/uploads/certificates/authorized_signature.png',
        null,
        verification_code,
        'data:image/png;base64,fake'
      ]
    );

    console.log(`✅ Success! Generated Certificate #${result.insertId} (${certificate_id})`);
  } catch (err) {
    console.error('❌ SQL Execution Error:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testGenerateEndpoint();
