#!/usr/bin/env node

console.log('\n🔍 SYSTEM DIAGNOSTICS\n');
console.log('='.repeat(50));

const http = require('http');

async function testEndpoint(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, success: res.statusCode < 400 });
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Timeout', success: false });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  // Test 1: Backend API Health
  console.log('\n📡 Backend API Status:');
  const backendHealth = await testEndpoint('http://localhost:5000/api/auth/profile', 'GET');
  if (backendHealth.error) {
    console.log('❌ Backend NOT RESPONDING:', backendHealth.error);
  } else {
    console.log(`✅ Backend RESPONDING (Status: ${backendHealth.status})`);
  }

  // Test 2: Admin Login
  console.log('\n👤 Admin Login Test:');
  const adminLogin = await testEndpoint('http://localhost:5000/api/auth/login', 'POST', {
    email: 'admin@repairsystem.com',
    password: 'master123',
    role: 'admin'
  });
  if (adminLogin.error) {
    console.log('❌ Login Failed:', adminLogin.error);
  } else {
    console.log(`✅ Login Successful (Status: ${adminLogin.status})`);
  }

  // Test 3: Student Login
  console.log('\n👨‍🎓 Student Login Test:');
  const studentLogin = await testEndpoint('http://localhost:5000/api/auth/login', 'POST', {
    mobileOrStudentId: 'SRMS-2026-4364',
    password: 'student123',
    role: 'student'
  });
  if (studentLogin.error) {
    console.log('❌ Student Login Failed:', studentLogin.error);
  } else {
    console.log(`✅ Student Login Successful (Status: ${studentLogin.status})`);
  }

  // Test 4: Frontend Server
  console.log('\n🖥️  Frontend Server Status:');
  const frontendHealth = await testEndpoint('http://localhost:5173/', 'GET');
  if (frontendHealth.error) {
    console.log('❌ Frontend NOT RESPONDING:', frontendHealth.error);
  } else {
    console.log(`✅ Frontend RESPONDING (Status: ${frontendHealth.status})`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📌 QUICK FIX GUIDE:');
  console.log('1. Open browser: http://localhost:5173');
  console.log('2. Login with: admin@repairsystem.com / master123');
  console.log('3. Or try student: SRMS-2026-4364 / student123');
  console.log('='.repeat(50) + '\n');

  process.exit(0);
}

runTests().catch(console.error);
