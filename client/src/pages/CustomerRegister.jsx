import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import api from '../lib/api';
import ToastContainer, { showToast } from '../components/Toast';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', mobile: '', address: '', city: '', state: '', pincode: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.password) {
      return showToast('Name, mobile and password are required', 'error');
    }
    setLoading(true);
    const res = await api.post('/customer/register', form);
    setLoading(false);

    if (res.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      showToast('Registration successful!');
      setTimeout(() => navigate('/dashboard/customer'), 500);
    } else {
      showToast(res.message || 'Registration failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8">
      <ToastContainer />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Smartphone className="w-10 h-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">SHREE RAAM MOBILE</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Customer Registration</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="input pl-10" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="10-digit mobile" className="input pl-10" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create password" className="input pl-10" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea name="address" value={form.address} onChange={handleChange} placeholder="Your address" className="input pl-10" rows={2} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="input" />
              <input name="state" value={form.state} onChange={handleChange} placeholder="State" className="input" />
            </div>

            <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" className="input" />

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already registered?{' '}
              <Link to="/login/customer" className="text-emerald-600 hover:underline font-medium">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
