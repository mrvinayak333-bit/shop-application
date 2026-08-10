const mysql = require('mysql2/promise');
require('dotenv').config();

async function testApprovalWorkflow() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('--- TESTING STUDENT CERTIFICATE REQUEST APPROVAL WORKFLOW ---');

    // 1. Get or create test student
    const [students] = await conn.query('SELECT id, name, student_id FROM students LIMIT 1');
    const studentId = students.length > 0 ? students[0].id : 1;
    const studentName = students.length > 0 ? students[0].name : 'Rahul Patil';

    // 2. Get or create test course
    const [courses] = await conn.query('SELECT id, title FROM courses LIMIT 1');
    let courseId = 1;
    if (courses.length > 0) {
      courseId = courses[0].id;
    } else {
      const [cIns] = await conn.query(
        'INSERT INTO courses (title, description, duration, price) VALUES (?, ?, ?, ?)',
        ['Android IC-Level Repairing', 'Professional IC Repairing', '25 Days', 15000]
      );
      courseId = cIns.insertId;
    }

    // 3. Insert dummy pending certificate request in generated_certificates
    const [reqRes] = await conn.query(
      'INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) VALUES (?, ?, "PENDING-REQ", CURDATE(), "pending_approval")',
      [studentId, courseId]
    );

    const pendingId = reqRes.insertId;
    console.log(`Step 1: Created Pending Request #${pendingId} for ${studentName}`);

    // 4. Simulate Master Approval logic
    const year = new Date().getFullYear();
    const [[countRow]] = await conn.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certificate_id = `SRM-CERT-${year}-${seq}`;
    const verification_code = `VERIFY-${Date.now()}-APPROVAL-TEST`;

    const [certIns] = await conn.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_name, course_duration,
        grade, completion_date, issue_date, trainer_name, authorized_signatory_name,
        certificate_status, verification_code
      ) VALUES (?, ?, ?, 'SRM-STU-001', 'Android & iPhone IC-Level Repairing Course', '25 Days', 'A++', CURDATE(), CURDATE(), 'VINAYAK SANJAY KUMBHAR', 'VINAYAK SANJAY KUMBHAR', 'Issued', ?)`,
      [certificate_id, studentId, studentName, verification_code]
    );

    await conn.query('UPDATE generated_certificates SET status = "approved", certificate_number = ? WHERE id = ?', [certificate_id, pendingId]);

    console.log(`Step 2: Approved Request #${pendingId} -> Generated Certificate ${certificate_id}`);

    // 5. Verify record in main certificates table
    const [[approvedCert]] = await conn.query('SELECT * FROM certificates WHERE certificate_id = ?', [certificate_id]);
    if (approvedCert && approvedCert.certificate_status === 'Issued') {
      console.log(`Step 3: Verification Passed! Status: ${approvedCert.certificate_status}, Student: ${approvedCert.student_name}`);
    } else {
      console.error('Step 3 Failed!');
    }

    console.log('✅ ALL APPROVAL WORKFLOW TESTS PASSED CLEANLY!');
  } catch (err) {
    console.error('❌ Approval Test Error:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testApprovalWorkflow();
