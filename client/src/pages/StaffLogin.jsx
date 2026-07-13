import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import ToastContainer, { showToast } from '../components/Toast';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return showToast('Email and password required', 'error');
    setLoading(true);

    try {
      // Try admin login first
      let res = await login(email, password, 'admin');
      if (res.success) {
        showToast('Welcome Admin!');
        navigate('/dashboard/admin');
        return;
      }

      // Try technician login
      res = await login(email, password, 'technician');
      if (res.success) {
        showToast('Welcome Technician!');
        navigate('/technician');
        return;
      }

      // Try master login
      res = await login(email, password, 'master');
      if (res.success) {
        showToast('Welcome Master!');
        navigate('/dashboard/master');
        return;
      }

      showToast('Invalid Staff ID or password', 'error');
    } catch (err) {
      showToast('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <ToastContainer />
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Login</h1>
            <p className="text-gray-600 text-sm">Access your staff dashboard</p>
            <p className="text-xs text-gray-400 mt-2">Staff ID Example: STF-2026-0001</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff ID Number</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Logging in...' : 'Login to Staff Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Staff accounts are created by the Master Panel only
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-sm">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
