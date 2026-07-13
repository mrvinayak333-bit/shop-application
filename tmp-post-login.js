const http = require('http');
const data = JSON.stringify({ email: 'admin@repairsystem.com', password: 'master123', role: 'admin' });
const options = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
const req = http.request(options, res => {
  console.log('statusCode:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});
req.on('error', error => { console.error('Request error:', error.message); process.exit(1); });
req.write(data); req.end();
