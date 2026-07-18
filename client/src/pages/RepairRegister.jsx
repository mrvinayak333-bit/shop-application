import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function RepairRegister() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    device_type: '', brand: '', model: '', imei: '', issue_description: '',
    device_condition: '', accessories: '', first_name: '', last_name: '',
    customer_mobile: '', customer_address: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.device_type || !form.brand || !form.issue_description) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm">
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
                <select name="device_type" value={form.device_type} onChange={handleChange} className="input" required>
                  <option value="">Select device type</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Feature Phone">Feature Phone</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <input name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Samsung" className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. Galaxy S21" className="input" />
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
            <h2 className="font-semibold mb-3">Contact Details</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                <textarea name="customer_address" value={form.customer_address} onChange={handleChange} placeholder="Full address for pickup" className="input" rows={2} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Submitting...' : 'Register Repair'}
          </button>
        </form>
      </main>
    </div>
  );
}
