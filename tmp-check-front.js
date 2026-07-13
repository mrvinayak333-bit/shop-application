const http = require('http');
const options = { hostname: 'localhost', port: 5173, path: '/login/master', method: 'GET' };
const req = http.request(options, res => {
  console.log('statusCode:', res.statusCode);
  res.on('data', d => process.stdout.write(d.toString().slice(0,500)));
});
req.on('error', error => { console.error('Request error:', error.message); process.exit(1); });
req.end();
