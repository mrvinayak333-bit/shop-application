import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowLeft, MapPin, Loader2, Globe, Search, Navigation, Check, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

const DEVICE_TYPES = ['Android', 'iPhone', 'Computer', 'Laptop'];

const BRANDS_BY_DEVICE_TYPE = {
  Android: [
    'Samsung',
    'Xiaomi / Redmi',
    'Realme',
    'OnePlus',
    'Vivo',
    'Oppo',
    'Poco',
    'Motorola',
    'Google Pixel',
    'Nothing',
    'Tecno',
    'Infinix',
    'Asus',
    'IQOO',
    'Honor',
    'Lava',
    'Micromax',
    'Nokia',
    'Other'
  ],
  iPhone: [
    'Apple (iPhone)'
  ],
  Computer: [
    'Dell',
    'HP',
    'Lenovo',
    'Apple (Mac / iMac)',
    'Custom PC / Assembled',
    'Acer',
    'ASUS',
    'Gigabyte',
    'MSI',
    'Intel',
    'AMD',
    'Other'
  ],
  Laptop: [
    'Dell',
    'HP',
    'Lenovo',
    'ASUS',
    'Acer',
    'Apple (MacBook)',
    'MSI',
    'Samsung',
    'Toshiba',
    'Sony Vaio',
    'Avita',
    'Honor / Huawei',
    'Microsoft Surface',
    'Other'
  ]
};

export default function RepairRegister() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Map Pin Drop Modal States
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCoords, setMapCoords] = useState({ lat: 18.5204, lon: 73.8567 }); // Default Pune/India coords
  const [mapAddress, setMapAddress] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    device_type: '',
    brand: '',
    custom_brand: '',
    model: '',
    imei: '',
    issue_description: '',
    device_condition: '',
    accessories: '',
    first_name: '',
    last_name: '',
    customer_mobile: '',
    customer_address: ''
  });

  const handleDeviceTypeChange = (e) => {
    const selectedType = e.target.value;
    const availableBrands = BRANDS_BY_DEVICE_TYPE[selectedType] || [];
    
    let autoBrand = '';
    if (availableBrands.length === 1) {
      autoBrand = availableBrands[0];
    }

    setForm(prev => ({
      ...prev,
      device_type: selectedType,
      brand: autoBrand,
      custom_brand: ''
    }));
  };

  const handleBrandChange = (e) => {
    const selectedBrand = e.target.value;
    setForm(prev => ({
      ...prev,
      brand: selectedBrand,
      custom_brand: selectedBrand === 'Other' ? prev.custom_brand : ''
    }));
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Reverse Geocoding Helper
  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          const parts = [
            addr.building || addr.house_number || addr.shop || addr.amenity,
            addr.road || addr.street || addr.pedestrian,
            addr.suburb || addr.neighbourhood || addr.residential || addr.village,
            addr.city || addr.town || addr.county || addr.district,
            addr.state,
            addr.postcode
          ].filter(Boolean);

          if (parts.length > 0) return parts.join(', ');
          if (data.display_name) return data.display_name;
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }

    // Fallback BDC
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const parts = [
          bdcData.locality,
          bdcData.city,
          bdcData.principalSubdivision,
          bdcData.countryName,
          bdcData.postcode
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch (fallbackErr) {
      console.warn('Fallback error:', fallbackErr);
    }

    return `GPS Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  // Direct GPS Detection
  const handlePinCurrentLocation = () => {
    if (!navigator.geolocation) {
      return showToast('Geolocation is not supported by your browser', 'error');
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addressText = await reverseGeocode(latitude, longitude);
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

        setForm(prev => ({
          ...prev,
          customer_address: `${addressText}\n📍 Google Maps: ${mapsUrl}`
        }));

        setLocating(false);
        showToast('📍 Device location detected and address filled!', 'success');
      },
      (error) => {
        setLocating(false);
        let errorMsg = 'Failed to get device location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access in your device settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Device location unavailable. Please check GPS status.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        showToast(errorMsg, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Open Map Pin Modal
  const handleOpenMapModal = () => {
    setShowMapModal(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setMapCoords({ lat, lon });
          const addr = await reverseGeocode(lat, lon);
          setMapAddress(addr);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Search Area in Map Modal
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          setMapCoords({ lat, lon });
          const addr = results[0].display_name;
          setMapAddress(addr);
          showToast('📍 Map pin moved to searched area', 'success');
        } else {
          showToast('No locations found for this query', 'warning');
        }
      }
    } catch (err) {
      showToast('Search failed. Try typing area name manually.', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Confirm Map Location Modal Selection
  const handleConfirmMapLocation = () => {
    const mapsUrl = `https://maps.google.com/?q=${mapCoords.lat},${mapCoords.lon}`;
    const parts = [
      houseNo.trim() ? `House/Shop: ${houseNo.trim()}` : '',
      landmark.trim() ? `Landmark: ${landmark.trim()}` : '',
      mapAddress.trim() || `GPS: ${mapCoords.lat.toFixed(6)}, ${mapCoords.lon.toFixed(6)}`,
      `📍 Google Maps: ${mapsUrl}`
    ].filter(Boolean);

    const finalFullAddress = parts.join('\n');

    setForm(prev => ({
      ...prev,
      customer_address: finalFullAddress
    }));

    setShowMapModal(false);
    showToast('📍 Pickup address & Google Maps pin filled successfully!', 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalBrand = form.brand === 'Other' ? form.custom_brand : form.brand;

    if (!form.device_type || !finalBrand || !form.issue_description) {
      return showToast('Device type, brand and issue description are required', 'error');
    }
    if (!isAuthenticated) {
      showToast('Please login first', 'error');
      navigate('/login/customer');
      return;
    }

    setLoading(true);
    const res = await api.post('/repair', {
      ...form,
      brand: finalBrand,
      first_name: form.first_name || user?.name?.split(' ')[0],
      last_name: form.last_name || user?.name?.split(' ').slice(1).join(' '),
      customer_mobile: form.customer_mobile || user?.mobile
    });
    setLoading(false);

    if (res.success) {
      showToast('Repair registered successfully! Tracking: ' + res.repair.tracking_number);
      setTimeout(() => navigate('/dashboard/customer'), 1000);
    } else {
      showToast(res.message || 'Registration failed', 'error');
    }
  };

  const availableBrands = BRANDS_BY_DEVICE_TYPE[form.device_type] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="card mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Smartphone className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register Repair</h1>
              <p className="text-sm text-gray-500">Fill in your device details</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-3">Device Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Type *</label>
                <select 
                  name="device_type" 
                  value={form.device_type} 
                  onChange={handleDeviceTypeChange} 
                  className="input font-medium" 
                  required
                >
                  <option value="">Select device type</option>
                  {DEVICE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <select 
                    name="brand" 
                    value={form.brand} 
                    onChange={handleBrandChange} 
                    className="input font-medium" 
                    disabled={!form.device_type}
                    required
                  >
                    <option value="">
                      {form.device_type ? 'Select brand' : 'Select device type first'}
                    </option>
                    {availableBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {form.brand === 'Other' && (
                    <input 
                      type="text"
                      name="custom_brand" 
                      value={form.custom_brand} 
                      onChange={handleChange} 
                      placeholder="Specify custom brand..." 
                      className="input mt-2" 
                      required 
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. Galaxy S21 / Inspiron 15" className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IMEI (optional)</label>
                <input name="imei" value={form.imei} onChange={handleChange} placeholder="Dial *#06# to check" className="input" maxLength={15} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
                <textarea name="issue_description" value={form.issue_description} onChange={handleChange} placeholder="Describe the problem..." className="input" rows={3} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Condition</label>
                <textarea name="device_condition" value={form.device_condition} onChange={handleChange} placeholder="Physical condition (scratches, dents, etc.)" className="input" rows={2} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accessories</label>
                <input name="accessories" value={form.accessories} onChange={handleChange} placeholder="Charger, case, etc." className="input" />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-3">Contact & Pickup Details</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input name="customer_mobile" value={form.customer_mobile} onChange={handleChange} placeholder="Contact number" className="input" />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Pickup Address *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenMapModal}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 py-1 px-2.5 rounded-lg transition-all shadow-xs"
                      title="Open Google Maps interactive pin drop"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>📍 Pin Drop Location</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePinCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1 px-2.5 rounded-lg transition-all disabled:opacity-50"
                      title="Auto-detect GPS location"
                    >
                      {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Navigation className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{locating ? 'GPS...' : '🎯 Auto GPS'}</span>
                    </button>

                    <a
                      href="https://maps.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 py-1 px-2 rounded-lg transition-all"
                      title="Open Google Maps app in new tab"
                    >
                      <Globe className="w-3.5 h-3.5 text-gray-600" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>

                <textarea 
                  name="customer_address" 
                  value={form.customer_address} 
                  onChange={handleChange} 
                  placeholder="Enter full pickup address manually, or click Pin Drop Location above..." 
                  className="input" 
                  rows={4} 
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  💡 You can drop pin via Google Maps or freely type/edit your house address details manually above.
                </p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Submitting...' : 'Register Repair'}
          </button>
        </form>

        {/* GOOGLE MAPS PIN DROP MODAL */}
        {showMapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 text-white">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Google Maps Pin Drop Location</h3>
                </div>
                <button 
                  onClick={() => setShowMapModal(false)} 
                  className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
                {/* Search Bar */}
                <form onSubmit={handleSearchLocation} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search city, area, or landmark in Google Maps..."
                    className="input text-xs flex-1"
                  />
                  <button 
                    type="submit" 
                    disabled={searching}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                  >
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </form>

                {/* Interactive Map Embed with Center Pin Marker */}
                <div className="relative rounded-xl overflow-hidden border border-gray-300 h-64 bg-gray-100 shadow-inner">
                  <iframe
                    title="Google Maps Pin Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lon}&z=16&output=embed`}
                    className="w-full h-full"
                  />

                  {/* Red Pin Overlay */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none drop-shadow-md">
                    <MapPin className="w-9 h-9 text-rose-600 fill-rose-100 animate-bounce" />
                  </div>

                  {/* Detect GPS Badge */}
                  <button
                    type="button"
                    onClick={handlePinCurrentLocation}
                    className="absolute bottom-3 right-3 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-1.5 transition"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Center GPS Location</span>
                  </button>
                </div>

                {/* Manual Address Fields inside Modal */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">House / Shop / Flat No.</label>
                    <input
                      type="text"
                      value={houseNo}
                      onChange={e => setHouseNo(e.target.value)}
                      placeholder="e.g. Shop 12, Floor 1"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Landmark / Street</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={e => setLandmark(e.target.value)}
                      placeholder="e.g. Near Bus Stand"
                      className="input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Area Address (Auto-filled from Pin)</label>
                  <textarea
                    value={mapAddress}
                    onChange={e => setMapAddress(e.target.value)}
                    placeholder="Address from map..."
                    className="input text-xs"
                    rows={2}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    📍 Coordinates: Lat {mapCoords.lat.toFixed(6)}, Lon {mapCoords.lon.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-gray-50 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMapLocation}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Fill Address</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
