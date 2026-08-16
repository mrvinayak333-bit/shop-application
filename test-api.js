const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:5000/api';

function testAPI(name, method, path, body = null, token = null) {
  return new Promise((resolve) => {
    // Normalize path to prevent double /api
    const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
    const url = new URL(API_BASE + cleanPath);
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            name,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            result: result
          });
        } catch (e) {
          resolve({ name, status: res.statusCode, success: res.statusCode >= 200 && res.statusCode < 300, error: 'Non-JSON Response' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ name, success: false, error: err.message });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 API Test Suite - Shop Application\n');
  console.log('='.repeat(50));

  // Test 1: Health Check
  console.log('\n📋 Test 1: API Health & Configuration');
  let result = await testAPI('GET /auth/login health check', 'POST', '/auth/login', { password: '' });
  console.log(`${result.status === 400 ? '✓' : '✗'} API Server Responding (Status: ${result.status})`);

  // Test 2: Database Connection
  console.log('\n📋 Test 2: Database Connectivity');
  result = await testAPI('Check DB Connection', 'POST', '/auth/login', { role: 'admin', email: 'admin@repairsystem.com', password: 'wrongpassword' });
  console.log(`${result.status === 401 ? '✓' : '✗'} Database Connection Active (Returned 401 for bad password)`);

  // Test 3: Authentication System
  console.log('\n📋 Test 3: Authentication System');
  
  // Master Login
  result = await testAPI('Master Login', 'POST', '/auth/login', {
    email: 'mr.vinayak333@gmail.com',
    password: 'VINAYAK@333',
    role: 'master'
  });
  const masterToken = result.result?.token;
  console.log(`${result.success ? '✓' : '✗'} Master Login: ${result.status} ${result.success ? '(Token received)' : ''}`);

  // Admin Login
  result = await testAPI('Admin Login', 'POST', '/auth/login', {
    email: 'admin@repairsystem.com',
    password: 'master123',
    role: 'admin'
  });
  const adminToken = result.result?.token;
  console.log(`${result.success ? '✓' : '✗'} Admin Login: ${result.status} ${result.success ? '(Token received)' : ''}`);

  // Student Login
  result = await testAPI('Student Login', 'POST', '/auth/login', {
    studentId: 'SRMS-2026-4364',
    password: 'student123',
    role: 'student'
  });
  const studentToken = result.result?.token;
  console.log(`${result.success ? '✓' : '✗'} Student Login: ${result.status} ${result.success ? '(Token received)' : ''}`);

  // Technician Login
  result = await testAPI('Technician Login', 'POST', '/auth/login', {
    email: 'tech@shop.com',
    password: 'tech123',
    role: 'technician'
  });
  const techToken = result.result?.token;
  console.log(`${result.success ? '✓' : '✗'} Technician Login: ${result.status} ${result.success ? '(Token received)' : ''}`);

  // Customer Login
  result = await testAPI('Customer Login', 'POST', '/auth/login', {
    email: 'customer@shop.com',
    password: 'customer123',
    role: 'customer'
  });
  const custToken = result.result?.token;
  console.log(`${result.success ? '✓' : '✗'} Customer Login: ${result.status} ${result.success ? '(Token received)' : ''}`);

  // Profile Verification using Token
  if (masterToken) {
    const profileRes = await testAPI('Profile Check', 'GET', '/auth/profile', null, masterToken);
    console.log(`${profileRes.success ? '✓' : '✗'} Master Token Profile Fetch: ${profileRes.status} (${profileRes.result?.user?.name || 'User'})`);
  }

  // Test 4: Course System
  console.log('\n📋 Test 4: Course System');
  result = await testAPI('Browse Available Courses', 'GET', '/courses', null, studentToken);
  console.log(`${result.success ? '✓' : '✗'} Browse Courses: ${result.status} (${Array.isArray(result.result) ? result.result.length : (result.result?.courses?.length || 0)} courses found)`);

  // Test 5: Commission System
  console.log('\n📋 Test 5: Commission Management System');
  result = await testAPI('Commission Dashboard', 'GET', '/transactions/commission/dashboard', null, adminToken);
  console.log(`${result.success ? '✓' : '✗'} Commission Dashboard: ${result.status} ${result.success ? '(Summary & ledger received)' : ''}`);

  result = await testAPI('Commission Settings', 'GET', '/transactions/commission-settings', null, adminToken);
  console.log(`${result.success ? '✓' : '✗'} Commission Settings: ${result.status}`);

  // Test 6: Laptop/Computer Repair Module
  console.log('\n📋 Test 6: Laptop/Computer Repair Module');
  result = await testAPI('Get Laptop Repairs (Admin)', 'GET', '/laptop-repair/admin/all', null, adminToken);
  console.log(`${result.success ? '✓' : '✗'} Laptop Repairs Admin All Endpoint: ${result.status}`);

  result = await testAPI('Get Pending Laptop Repairs (Admin)', 'GET', '/laptop-repair/admin/pending-verification', null, adminToken);
  console.log(`${result.success ? '✓' : '✗'} Laptop Repairs Pending Verification Endpoint: ${result.status}`);

  result = await testAPI('Track Laptop Repair Status', 'GET', '/laptop-repair/track/LR-TEST-001');
  console.log(`${result.success || result.status === 404 ? '✓' : '✗'} Laptop Repair Tracking Endpoint: ${result.status}`);

  // Test 7: Mobile Repair System
  console.log('\n📋 Test 7: Mobile Repair System');
  result = await testAPI('Mobile Repair Tracking', 'GET', '/repair/track/MR-TEST-001');
  console.log(`${result.success || result.status === 404 ? '✓' : '✗'} Mobile Repair Tracking Endpoint: ${result.status}`);

  // Test 8: Certificate System
  console.log('\n📋 Test 8: Certificate System');
  result = await testAPI('Certificate List (Master)', 'GET', '/certificate/list', null, masterToken);
  console.log(`${result.success ? '✓' : '✗'} Master Certificates List Endpoint: ${result.status} (${result.result?.certificates?.length || 0} certificates found)`);

  result = await testAPI('Certificate Pending Requests (Master)', 'GET', '/certificate/pending', null, masterToken);
  console.log(`${result.success ? '✓' : '✗'} Master Certificates Pending Endpoint: ${result.status}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ API Test Suite Completed Successfully!\n');

  process.exit();
}

runTests().catch(console.error);

