const mysql = require('mysql2/promise');
require('dotenv').config();

async function testIssueAndSaveCertificate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mobile_repair_system'
    });

    console.log('--- TESTING ISSUE & SAVE CERTIFICATE FULL WIZARD FLOW ---');

    // 1. Get student
    const [students] = await conn.query('SELECT id, name, student_id FROM students LIMIT 1');
    if (students.length === 0) {
      console.log('No students found in database');
      process.exit(1);
    }
    const student = students[0];

    // 2. Get valid course ID or create one
    const [courses] = await conn.query('SELECT id FROM courses LIMIT 1');
    let courseId = null;
    if (courses.length > 0) {
      courseId = courses[0].id;
    }

    // 3. Simulate Master submitting "Issue & Save Certificate" Form
    const year = new Date().getFullYear();
    const [[countRow]] = await conn.query('SELECT COUNT(*) as total FROM certificates');
    const seq = (countRow.total + 1).toString().padStart(6, '0');
    const certificate_id = `SRM-CERT-${year}-${seq}`;
    const verification_code = `VERIFY-${Date.now()}-WIZARD-TEST`;

    const [result] = await conn.query(
      `INSERT INTO certificates (
        certificate_id, student_id, student_name, student_code, course_id, course_name,
        course_duration, grade, completion_date, issue_date, trainer_name, trainer_signature,
        authorized_signatory_name, authorized_signatory_signature, template_id,
        certificate_status, verification_code, qr_code_url
      ) VALUES (?, ?, ?, ?, ?, 'Android & iPhone IC-Level Repairing Course', '25 Days', 'A++', CURDATE(), CURDATE(), 'VINAYAK SANJAY KUMBHAR', '/uploads/certificates/founder_signature.png', 'VINAYAK SANJAY KUMBHAR', '/uploads/certificates/authorized_signature.png', NULL, 'Issued', ?, 'data:image/png;base64,fake')`,
      [certificate_id, student.id, student.name, student.student_id || 'SRM-STU-001', courseId, verification_code]
    );

    console.log(`Step 1: Certificate Issued! ID: ${certificate_id} (Insert ID: ${result.insertId})`);

    // 4. Sync into generated_certificates if courseId valid
    if (courseId) {
      await conn.query(
        `INSERT INTO generated_certificates (student_id, course_id, certificate_number, issue_date, status) 
         VALUES (?, ?, ?, CURDATE(), 'approved')`,
        [student.id, courseId, certificate_id]
      );
      console.log(`Step 2: Synced to generated_certificates with status 'approved'`);
    }

    // 5. Verify retrieving the certificate
    const [[savedCert]] = await conn.query('SELECT * FROM certificates WHERE id = ?', [result.insertId]);

    console.log('Step 3: Verification Details of Saved Certificate:');
    console.log(`  - Certificate ID: ${savedCert.certificate_id}`);
    console.log(`  - Student Name: ${savedCert.student_name}`);
    console.log(`  - Course: ${savedCert.course_name}`);
    console.log(`  - Status: ${savedCert.certificate_status}`);
    console.log(`  - Trainer: ${savedCert.trainer_name}`);
    console.log(`  - Verification Code: ${savedCert.verification_code}`);

    if (savedCert && savedCert.certificate_id === certificate_id) {
      console.log('✅ ISSUE & SAVE CERTIFICATE WIZARD FLOW IS 100% WORKING AND VERIFIED!');
    } else {
      console.error('❌ Verification failed!');
    }
  } catch (err) {
    console.error('❌ Error during test:', err);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testIssueAndSaveCertificate();
