const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    console.log('Testing master login...');
    const masterRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mr.vinayak333@gmail.com', password: 'VINAYAK@333', role: 'master' })
    });
    const masterData = await masterRes.json();
    console.log('MASTER LOGIN:', masterData.success, masterData.message);
    if (!masterData.success) return;

    console.log('Testing /api/course/manage...');
    const courseRes = await fetch('http://localhost:5000/api/course/manage', {
      headers: { Authorization: 'Bearer ' + masterData.token }
    });
    const courseData = await courseRes.json();
    console.log('/api/course/manage response:', JSON.stringify(courseData, null, 2));

    console.log('Testing student login...');
    const studentRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'SRMS-2026-4364', password: 'VINAYAK@333', role: 'student' })
    });
    const studentData = await studentRes.json();
    console.log('STUDENT LOGIN:', studentData.success, studentData.message);
    if (!studentData.success) return;

    console.log('Testing /api/student/dashboard...');
    const dashboardRes = await fetch('http://localhost:5000/api/student/dashboard', {
      headers: { Authorization: 'Bearer ' + studentData.token }
    });
    const dashboardData = await dashboardRes.json();
    console.log('/api/student/dashboard response:', JSON.stringify(dashboardData, null, 2));
  } catch (err) {
    console.error('Error during API tests:', err);
  }
})();
