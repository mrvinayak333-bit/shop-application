import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, ArrowLeft, Loader, Upload, X, Check, Laptop, Tablet, 
  Monitor, Watch, AlertCircle, User, CheckSquare, Clipboard 
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function RepairRegister() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  
  // Database configurations
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [allBrands, setAllBrands] = useState([]);

  // Form states
  const [form, setForm] = useState({
    device_type: '', 
    brand: '', 
    model: '', 
    color: '',
    device_condition_multi: '', // Maps to Problem Category
    issue_description: '',
    first_name: '', 
    last_name: '',
    customer_mobile: '', 
    whatsapp: '',
    customer_address: ''
  });

  // Accessories checkboxes state
  const [accessoriesList, setAccessoriesList] = useState({
    Charger: false,
    Cable: false,
    SIM: false,
    'Memory Card': false,
    'Back Cover': false,
    Box: false,
    Other: false
  });

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/repair/config');
      if (res?.success) {
        setDeviceTypes(res.types || []);
        setAllBrands(res.brands || []);
      }
    } catch (err) {
      showToast('Error loading device selections', 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  // Pre-fill user contact info if logged in
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        customer_mobile: user.mobile || '',
        customer_address: user.address || ''
      }));
    }
  }, [user]);

  // Handle device type dropdown updates
  const handleDeviceTypeChange = (e) => {
    const selected = e.target.value;
    setForm(prev => ({ ...prev, device_type: selected, brand: '', model: '' }));
    
    // Map selected view value to database type name
    let dbTypeName = selected;
    if (selected === 'Mobile') dbTypeName = 'Smartphone';
    if (selected === 'Desktop PC') dbTypeName = 'Desktop Computer';
    if (selected === 'Smart Watch') dbTypeName = 'Smart Watch';

    const typeObj = deviceTypes.find(t => t.name.toLowerCase() === dbTypeName.toLowerCase());
    
    // Fallback: search by similar name if not found
    const matchObj = typeObj || deviceTypes.find(t => t.name.toLowerCase().includes(selected.toLowerCase().substring(0, 5)));
    
    if (matchObj) {
      setForm(prev => ({ ...prev, brand: '' }));
    }
  };

  // Filter brands depending on chosen type
  const getFilteredBrands = () => {
    if (!form.device_type) return [];
    
    let dbTypeName = form.device_type;
    if (form.device_type === 'Mobile') dbTypeName = 'Smartphone';
    if (form.device_type === 'Desktop PC') dbTypeName = 'Desktop Computer';
    if (form.device_type === 'Smart Watch') dbTypeName = 'Smart Watch';

    const typeObj = deviceTypes.find(t => t.name.toLowerCase() === dbTypeName.toLowerCase()) || deviceTypes.find(t => t.name.toLowerCase().includes(form.device_type.toLowerCase().substring(0, 5)));
    if (!typeObj) return [];
    return allBrands.filter(b => b.device_type_id === typeObj.id && b.is_active === 1);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCheckboxChange = (name) => {
    setAccessoriesList(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addPhotos(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      addPhotos(Array.from(e.target.files));
    }
  };

  const addPhotos = (files) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (photos.length + validImages.length > 5) {
      return showToast('You can upload up to 5 photos only', 'warning');
    }
    setPhotos(prev => [...prev, ...validImages]);
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.device_type || !form.brand || !form.model || !form.device_condition_multi || !form.issue_description || !form.first_name || !form.customer_mobile) {
      return showToast('Please fill all required (*) fields', 'error');
    }
    if (!isAuthenticated) {
      showToast('Please login first', 'error');
      navigate('/login/customer');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    // Append core text values
    Object.keys(form).forEach(key => {
      if (form[key]) {
        // Map display type to DB type string on submit
        if (key === 'device_type') {
          let dbVal = form[key];
          if (form[key] === 'Mobile') dbVal = 'Smartphone';
          if (form[key] === 'Desktop PC') dbVal = 'Desktop Computer';
          formData.append(key, dbVal);
        } else {
          formData.append(key, form[key]);
        }
      }
    });

    // Accessories list
    const checkedAcc = Object.keys(accessoriesList).filter(k => accessoriesList[k]);
    if (checkedAcc.length > 0) {
      formData.append('accessories', checkedAcc.join(', '));
    }

    // Attach photos
    photos.forEach(file => {
      formData.append('photos', file);
    });

    try {
      const res = await api.upload('/repair', formData);
      if (res.success) {
        showToast('Repair registered successfully! Tracking ID: ' + res.repair.tracking_number, 'success');
        setTimeout(() => navigate('/dashboard/customer'), 1500);
      } else {
        showToast(res.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Server connection error. Failed to book repair.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const problemCategories = [
    'Dead', 'Display', 'Charging', 'Battery', 'Network', 'Software', 
    'Camera', 'Speaker', 'Mic', 'Water Damage', 'Heating', 'Auto Restart', 'Other'
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 dark:bg-slate-905 transition">
      <Navbar />
      <ToastContainer />
      
      <main className="max-w-[850px] mx-auto px-4 py-8">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 font-bold mb-6 text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Form Container (Clean white, soft accent shadow) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700/60 shadow-xl shadow-slate-100/40 dark:shadow-none">
          
          <div className="border-b border-slate-100 dark:border-slate-700 pb-5 mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Register Repair Request</h1>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Book your repair instantly in less than 1 minute. Provide basic device specifications below.</p>
          </div>

          {configLoading ? (
            <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-emerald-500" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION 1: DEVICE INFORMATION */}
              <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-mono text-xs">1</span>
                  Device Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Device Type *</label>
                    <select 
                      name="device_type" 
                      value={form.device_type} 
                      onChange={handleDeviceTypeChange}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm"
                      required
                    >
                      <option value="">Select Device Type</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Laptop">Laptop</option>
                      <option value="MacBook">MacBook</option>
                      <option value="Desktop PC">Desktop PC</option>
                      <option value="Smart Watch">Smart Watch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Brand *</label>
                    <select 
                      name="brand" 
                      value={form.brand} 
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800"
                      disabled={!form.device_type}
                      required
                    >
                      <option value="">Select Brand</option>
                      {getFilteredBrands().map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Model Name *</label>
                    <input 
                      type="text" 
                      name="model" 
                      value={form.model} 
                      onChange={handleChange}
                      placeholder="e.g. Galaxy S24 / iPhone 15"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Device Color (Optional)</label>
                    <input 
                      type="text" 
                      name="color" 
                      value={form.color} 
                      onChange={handleChange}
                      placeholder="e.g. Space Black"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PROBLEM DETAILS */}
              <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-mono text-xs">2</span>
                  Problem Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Problem Category *</label>
                    <select 
                      name="device_condition_multi" 
                      value={form.device_condition_multi} 
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm"
                      required
                    >
                      <option value="">Select fault type</option>
                      {problemCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Problem Description *</label>
                    <textarea 
                      name="issue_description" 
                      value={form.issue_description} 
                      onChange={handleChange}
                      placeholder="Phone not charging. Water damaged yesterday. Display black."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ACCESSORIES RECEIVED */}
              <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-mono text-xs">3</span>
                  Accessories Received
                </h2>

                <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
                  {Object.keys(accessoriesList).map(name => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={accessoriesList[name]} 
                        onChange={() => handleCheckboxChange(name)}
                        className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECTION 4: DEVICE PHOTOS */}
              <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-mono text-xs">4</span>
                  Device Photos (Max 5 Images)
                </h2>

                {/* Drag & Drop Box */}
                <div 
                  onDragEnter={handleDrag} 
                  onDragOver={handleDrag} 
                  onDragLeave={handleDrag} 
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                    dragActive ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-350 dark:border-slate-700'
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Drag and drop your photos here, or</p>
                  
                  <label className="inline-block mt-3 text-sm font-bold text-emerald-500 hover:text-emerald-700 cursor-pointer select-none">
                    browse files
                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                  </label>
                  
                  {/* Photo previews list */}
                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                      {photoPreviews.map((preview, idx) => (
                        <div key={idx} className="aspect-square border rounded-xl relative overflow-hidden group shadow-sm bg-slate-50 flex items-center justify-center">
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-1 rounded-full transition shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: CUSTOMER DETAILS */}
              <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-mono text-xs">5</span>
                  Customer Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">First Name *</label>
                    <input 
                      type="text" 
                      name="first_name" 
                      value={form.first_name} 
                      onChange={handleChange}
                      placeholder="e.g. Sanjay"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Last Name</label>
                    <input 
                      type="text" 
                      name="last_name" 
                      value={form.last_name} 
                      onChange={handleChange}
                      placeholder="e.g. Patil"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Mobile Number *</label>
                    <input 
                      type="text" 
                      name="customer_mobile" 
                      value={form.customer_mobile} 
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">WhatsApp Number (Optional)</label>
                    <input 
                      type="text" 
                      name="whatsapp" 
                      value={form.whatsapp} 
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Pickup Address (Optional)</label>
                    <textarea 
                      name="customer_address" 
                      value={form.customer_address} 
                      onChange={handleChange}
                      placeholder="Where should we collect the device?"
                      rows={2}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#22C55E] hover:bg-green-600 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 text-base"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Register Repair Request'}
                </button>
              </div>

            </form>
          )}

        </div>
      </main>
    </div>
  );
}
