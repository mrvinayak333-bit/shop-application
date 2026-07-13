const fs = require('fs');
const path = require('path');
const base = __dirname;

// 1. FIX middleware/upload.js
const uploadPath = path.join(base, 'middleware', 'upload.js');
let u = fs.readFileSync(uploadPath, 'utf8');
if (!u.includes('repair_photos')) {
  u = u.replace("'uploads/profiles'", "'uploads/profiles',\n  'uploads/repair_photos'");
  u = u.replace('// File filters', "// Repair Photo Upload\nconst repairPhotoStorage = multer.diskStorage({\n  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/repair_photos')),\n  filename: (req, file, cb) => { cb(null, 'repair_' + Date.now() + '_' + Math.round(Math.random()*1E9) + path.extname(file.originalname)); }\n});\n\n// File filters");
  u = u.replace("uploadLogo: multer({ storage: logoStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } })", "uploadLogo: multer({ storage: logoStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),\n  uploadRepairPhoto: multer({ storage: repairPhotoStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } })");
  fs.writeFileSync(uploadPath, u, 'utf8');
  console.log('Fixed: middleware/upload.js');
}

// 2. FIX routes/repair.js
const repairPath = path.join(base, 'routes', 'repair.js');
let r = fs.readFileSync(repairPath, 'utf8');
if (!r.includes('uploadRepairPhoto')) {
  r = r.replace("const QRCode = require('qrcode');", "const { uploadRepairPhoto } = require('../middleware/upload');\nconst QRCode = require('qrcode');");
  const endpoints = `
// TECHNICIAN: Pickup verification with photos + GPS
router.post('/:id/pickup', authenticateToken, authorize('technician'), uploadRepairPhoto.fields([
  { name: 'device_photo', maxCount: 1 },
  { name: 'customer_selfie', maxCount: 1 },
]), async (req, res) => {
  try {
    const repairId = req.params.id;
    const { gps_lat, gps_lng, device_condition, problem_notes, otp_code } = req.body;
    if (req.files?.device_photo) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'pickup', '/uploads/repair_photos/' + req.files.device_photo[0].filename, req.user.id]);
    if (req.files?.customer_selfie) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'customer_selfie', '/uploads/repair_photos/' + req.files.customer_selfie[0].filename, req.user.id]);
    await pool.query('INSERT INTO pickup_verification (repair_id, device_photo, customer_selfie, gps_lat, gps_lng, otp_code, device_condition, problem_notes, verified_at) VALUES (?,?,?,?,?,?,?,?,NOW())', [repairId, req.files?.device_photo ? '/uploads/repair_photos/' + req.files.device_photo[0].filename : null, req.files?.customer_selfie ? '/uploads/repair_photos/' + req.files.customer_selfie[0].filename : null, gps_lat || null, gps_lng || null, otp_code || null, device_condition || null, problem_notes || null]);
    await pool.query('UPDATE repair_requests SET status=? WHERE id=?', ['pickup_done', repairId]);
    await pool.query('INSERT INTO repair_status (repair_id, status, notes, updated_by, updated_by_role) VALUES (?,?,?,?,?)', [repairId, 'pickup_done', 'Pickup verified by technician', req.user.id, 'technician']);
    res.json({ success: true, message: 'Pickup verified successfully' });
  } catch (err) { console.error('Pickup Error:', err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// TECHNICIAN: Upload repair photos
router.post('/:id/photos', authenticateToken, authorize('technician'), uploadRepairPhoto.array('photos', 10), async (req, res) => {
  try {
    const repairId = req.params.id;
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No photos uploaded' });
    for (const file of req.files) await pool.query('INSERT INTO repair_photos (repair_id, photo_type, file_path, uploaded_by) VALUES (?,?,?,?)', [repairId, 'before', '/uploads/repair_photos/' + file.filename, req.user.id]);
    res.json({ success: true, message: req.files.length + ' photo(s) uploaded' });
  } catch (err) { console.error('Photo Upload Error:', err); res.status(500).json({ success: false, message: 'Server error' }); }
});

`;
  r = r.replace('// PUBLIC: Customer view repair by tracking', endpoints + '// PUBLIC: Customer view repair by tracking');
  fs.writeFileSync(repairPath, r, 'utf8');
  console.log('Fixed: routes/repair.js');
}

// 3. FIX routes/technician.js
const techPath = path.join(base, 'routes', 'technician.js');
let t = fs.readFileSync(techPath, 'utf8');
if (!t.includes('pending')) {
  t = t.replace("const [[{ commissionEarned }]]", "const [[{ pending }]] = await pool.query(\"SELECT COUNT(*) as pending FROM repair_requests WHERE assigned_technician=? AND status IN ('registered','pickup_done','admin_verified','received_center')\", [techId]);\n    const [[{ completedToday }]] = await pool.query(\"SELECT COUNT(*) as completedToday FROM repair_requests WHERE assigned_technician=? AND status='delivered' AND DATE(updated_at)=CURDATE()\", [techId]);\n    const [[{ commissionEarned }]]");
  t = t.replace('stats: { activeJobs, completedJobs, commissionEarned }', 'stats: { activeJobs, completedJobs, pending, completedToday, commissionEarned }');
  const myRepairs = `
// My Repairs with filter (awaiting, in-progress, completed)
router.get('/my-repairs', async (req, res) => {
  try {
    const techId = req.user.id;
    const { filter } = req.query;
    let statusCondition = '';
    if (filter === 'awaiting') statusCondition = "AND rr.status IN ('registered','pickup_done','admin_verified','received_center')";
    else if (filter === 'in-progress') statusCondition = "AND rr.status IN ('under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','out_delivery')";
    else if (filter === 'completed') statusCondition = "AND rr.status = 'delivered'";
    const [repairs] = await pool.query(\`SELECT rr.*, c.name as customer_name, c.mobile as customer_mobile FROM repair_requests rr JOIN customers c ON rr.customer_id=c.id WHERE rr.assigned_technician=? \${statusCondition} ORDER BY rr.created_at DESC LIMIT 100\`, [techId]);
    res.json({ success: true, repairs });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

`;
  t = t.replace('module.exports = router;', myRepairs + 'module.exports = router;');
  fs.writeFileSync(techPath, t, 'utf8');
  console.log('Fixed: routes/technician.js');
}

// 4. FIX server.js
const serverPath = path.join(base, 'server.js');
let s = fs.readFileSync(serverPath, 'utf8');
if (!s.includes('reactDist')) {
  s = s.replace("const path = require('path');", "const path = require('path');\nconst fs = require('fs');");
  s = s.replace("app.use('/uploads', express.static(path.join(__dirname, 'uploads')));", "app.use('/uploads', express.static(path.join(__dirname, 'uploads')));\n\nconst reactDist = path.join(__dirname, 'client', 'dist');\nif (fs.existsSync(reactDist)) { app.use(express.static(reactDist)); }");
  s = s.replace("// Serve Frontend Pages\napp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));", "// Serve Frontend Pages");
  s = s.replace("// 404 Handler", "if (fs.existsSync(reactDist)) {\n  const spaIndex = path.join(reactDist, 'index.html');\n  app.get('/', (req, res) => res.sendFile(spaIndex));\n  app.get('/track/*', (req, res) => res.sendFile(spaIndex));\n  app.get('/technician/*', (req, res) => res.sendFile(spaIndex));\n} else {\n  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));\n}\n\n// 404 Handler");
  s = s.replace("res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));", "if (fs.existsSync(reactDist)) { res.sendFile(path.join(reactDist, 'index.html')); } else { res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); }");
  fs.writeFileSync(serverPath, s, 'utf8');
  console.log('Fixed: server.js');
}

// 5. FIX package.json
const pkgPath = path.join(base, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts.dev = 'concurrently "nodemon server.js" "npm run dev:client"';
pkg.scripts['dev:server'] = 'nodemon server.js';
pkg.scripts['dev:client'] = 'cd client && npm run dev';
pkg.scripts.build = 'cd client && npm run build';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('Fixed: package.json');

console.log('\n=== All backend fixes applied! ===');
