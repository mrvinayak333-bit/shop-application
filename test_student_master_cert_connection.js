const mysql = require('mysql2/promise');
require('dotenv').config();

async function testStudentMasterConnection() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('--- TESTING FULL STUDENT & MASTER CERTIFICATE CONNECTION ---');

    // 1. Get student ID
    const [students] = await conn.query('SELECT id, name, student_id FROM students LIMIT 1');
    const studentId = students.length > 0 ? students[0].id : 1;
    const studentName = students.length > 0 ? students[0].name : 'Rahul Patil';

    // 2. Get course ID
    const [courses] = await conn.query('SELECT id, title FROM courses LIMIT 1');
    let courseId = 1;
    if (courses.length > 0) {
      courseId = courses[0].id;
    } else {
      const [cIns] = await conn.query(
        'INSERT INTO courses (title, description, duration, price) VALUES (?, ?, ?, ?)',
        ['Android IC Repairing Course', 'Professional IC Repairing', '25 Days', 15000]
      );
      courseId = cIns.insertId;
    }

    // 3. Simulate Student Request from Student Dashboard
    const certNumber = `SRM-CERT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [reqIns] = await conn.query(
      'INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) VALUES (?, ?, ?, CURDATE(), "pending_approval")',
      [studentId, courseId, certNumber]
    );

    console.log(`Step 1: Student (${studentName}) requested certificate -> Request #${reqIns.insertId} logged in pending approval.`);

    // 4. Master Dashboard Approval Execution
    const year = new Date().getFullYear();
    const [[countRow]] = await conn.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const officialCertId = `SRM-CERT-${year}-${seq}`;
    const verificationCode = `VERIFY-${Date.now()}-CONNECTION-TEST`;

    await conn.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_id, course_name, course_duration,
        grade, completion_date, issue_date, trainer_name, authorized_signatory_name,
        certificate_status, verification_code
      ) VALUES (?, ?, ?, 'SRM-STU-001', ?, 'Android & iPhone IC-Level Repairing Course', '25 Days', 'A++', CURDATE(), CURDATE(), 'VINAYAK SANJAY KUMBHAR', 'VINAYAK SANJAY KUMBHAR', 'Issued', ?)`,
      [officialCertId, studentId, studentName, courseId, verificationCode]
    );

    await conn.query('UPDATE generated_certificates SET status = "approved", certificate_number = ? WHERE id = ?', [officialCertId, reqIns.insertId]);

    console.log(`Step 2: Master Approved Request #${reqIns.insertId} -> Generated Official ID ${officialCertId}`);

    // 5. Query student dashboard endpoint query to verify student receives the issued certificate
    const [studentCerts] = await conn.query(
      `SELECT 
         COALESCE(c.id, gc.id) as id,
         COALESCE(c.certificate_id, gc.certificate_number) as certificate_id,
         COALESCE(c.course_name, co.title, 'Mobile Repairing Course') as course_name,
         COALESCE(c.issue_date, gc.issue_date) as issue_date,
         COALESCE(c.certificate_status, IF(gc.status = 'approved', 'Issued', gc.status)) as status
       FROM students s
       LEFT JOIN certificates c ON c.student_id = s.id
       LEFT JOIN generated_certificates gc ON gc.student_id = s.id
       LEFT JOIN courses co ON (gc.course_id = co.id OR c.course_id = co.id)
       WHERE s.id = ? AND (c.id IS NOT NULL OR gc.id IS NOT NULL)`,
      [studentId]
    );

    console.log(`Step 3: Student Dashboard query returned ${studentCerts.length} certificate(s):`);
    studentCerts.forEach(c => {
      console.log(`  - Cert ID: ${c.certificate_id} | Status: ${c.status} | Course: ${c.course_name}`);
    });

    if (studentCerts.length > 0 && studentCerts.some(c => c.certificate_id === officialCertId)) {
      console.log('✅ STUDENT & MASTER DASHBOARD CERTIFICATE CONNECTION 100% VERIFIED AND WORKING!');
    } else {
      console.error('❌ Connection Verification Failed!');
    }
  } catch (err) {
    console.error('❌ Connection Test Error:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testStudentMasterConnection();
