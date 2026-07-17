import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Smartphone, Mail, Lock, Eye, EyeOff, Phone, BookOpen, Key } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import ToastContainer, { showToast } from '../components/Toast';

const roleConfig = {
  customer: { title: 'Customer Login', color: 'emerald', redirect: '/', field: 'mobile', label: 'Mobile Number', placeholder: '10-digit mobile number' },
  technician: { title: 'Technician Login', color: 'blue', redirect: '/technician', field: 'email', label: 'Email Address', placeholder: 'your@email.com' },
  admin: { title: 'Admin Login', color: 'purple', redirect: '/dashboard/admin', field: 'email', label: 'Email Address', placeholder: 'your@email.com' },
  master: { title: 'Master Login', color: 'orange', redirect: '/dashboard/master', field: 'email', label: 'Email Address', placeholder: 'your@email.com' },
  student: { title: 'Student Login', color: 'blue', redirect: '/dashboard/student', field: 'student_id', label: 'Student ID', placeholder: 'SRMS-2026-0001' },
};

export default function LoginPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const config = roleConfig[role] || roleConfig.customer;

  useEffect(() => {
    if (isAuthenticated && user) {
      const userConfig = roleConfig[user.role] || roleConfig.customer;
      navigate(userConfig.redirect);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return showToast('Please fill all fields', 'error');
    
    setLoading(true);
    
    let res;
    if (config.field === 'mobile') {
      res = await login(null, password, 'customer', identifier);
    } else if (config.field === 'student_id') {
      res = await login(null, password, 'student', identifier);
    } else {
      res = await login(identifier, password, role);
    }
    
    console.log('Login response:', res);
    setLoading(false);

    if (res.success) {
      showToast('Login successful!');
      setTimeout(() => navigate(config.redirect), 500);
    } else {
      showToast(res.message || 'Login failed', 'error');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return showToast('Please enter your email address', 'error');
    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Password reset link sent to your email!', 'success');
        setForgotMode(false);
      }
    } catch (err) {
      showToast('Failed to send reset link', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <ToastContainer />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Smartphone className="w-10 h-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">SHREE RAAM MOBILE</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {forgotMode ? 'Reset Password' : config.title}
          </h1>
          {role === 'student' && !forgotMode && <p className="text-sm text-gray-600 mt-2">Student ID Example: SRMS-2026-0001</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <p className="text-sm text-gray-500 text-center">
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input pl-10"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3">
                {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="text-sm text-emerald-600 hover:underline font-medium"
                >
                  &larr; Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{config.label}</label>
                <div className="relative">
                  {config.field === 'mobile' ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  ) : config.field === 'student_id' ? (
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  )}
                  <input
                    type={config.field === 'mobile' ? 'tel' : 'text'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={config.placeholder}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  {(role === 'master' || role === 'admin' || role === 'technician' || role === 'customer') && (
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-emerald-600 hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {!forgotMode && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/" className="text-emerald-600 hover:underline font-medium">
                  Register your device
                </Link>
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
