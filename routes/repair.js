const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadRepairPhoto } = require('../middleware/upload');
const QRCode = require('qrcode');

// Generate unique tracking number
async function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('repair_requests')
    .select('*', { count: 'exact', head: true })
    .ilike('tracking_number', `SRM-${year}-%`);

  const nextCount = (count || 0) + 1;
  return `SRM-${year}-${String(nextCount).padStart(6, '0')}`;
}

router.get('/config', async (req, res) => {
  try {
    const [
      { data: types },
      { data: brands },
      { data: models }
    ] = await Promise.all([
      supabase.from('device_types').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('models').select('*').order('name')
    ]);
    res.json({ success: true, types, brands, models });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error loading config' });
  }
});

router.post('/', authenticateToken, authorize('customer'), uploadRepairPhoto.array('photos', 5), async (req, res) => {
  try {
    const body = req.body;
    const trackingNumber = await generateTrackingNumber();
    const qrCode = await QRCode.toDataURL(`TRACK:${trackingNumber}`);

    const repairData = {
      tracking_number: trackingNumber,
      customer_id: req.user.id,
      status: 'registered',
      qr_code: qrCode,
      ...body
    };

    // Remove file objects from repairData if they were accidentally included
    delete repairData.photos;

    const { data, error } = await supabase.from('repair_requests').insert(repairData).select();
    if (error) throw error;
    const repairId = data[0].id;

    // Photos
    if (req.files?.length > 0) {
      const photos = req.files.map(file => ({
        repair_id: repairId,
        photo_type: 'condition',
        file_path: `/uploads/repair_photos/${file.filename}`,
        uploaded_by: req.user.id
      }));
      await supabase.from('repair_photos').insert(photos);
    }

    await supabase.from('repair_status').insert({ repair_id: repairId, status: 'registered', notes: 'Repair registered' });
    await supabase.rpc('increment_customer_repairs', { customer_id: req.user.id }); // Needs RPC or manual update

    res.status(201).json({ success: true, message: 'Repair registered!', repair: { id: repairId, tracking_number: trackingNumber } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { data: repair, error } = await supabase
      .from('repair_requests')
      .select('*, customers(name, mobile)')
      .eq('tracking_number', req.params.trackingNumber)
      .single();

    if (error || !repair) return res.status(404).json({ success: false, message: 'Not found' });

    const { data: statusLog } = await supabase
      .from('repair_status')
      .select('*')
      .eq('repair_id', repair.id)
      .order('created_at', { ascending: true });

    res.json({ success: true, repair, statusLog });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ... Additional routes follow same pattern
module.exports = router;
