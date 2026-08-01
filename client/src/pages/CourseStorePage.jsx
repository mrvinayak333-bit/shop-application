import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Loader, CreditCard, Image, Upload, CheckCircle, Smartphone, Award, DollarSign } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function CourseStorePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Buy Modal State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadStore();
  }, [authLoading, isAuthenticated, user]);

  const loadStore = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/course-store');
      if (res && res.success) {
        setCourses(res.courses || []);
        setPendingPurchases(res.pendingPurchases || []);
      } else {
        showToast('Failed to load store data', 'error');
      }
    } catch (err) {
      showToast('Error loading course store', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!screenshotFile) return showToast('Payment receipt screenshot is required', 'error');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourse.id);
      formData.append('payment_method', paymentMethod);
      formData.append('amount_paid', selectedCourse.price);
      formData.append('screenshot', screenshotFile);

      const res = await api.upload('/student/course-store/buy', formData);
      if (res && res.success) {
        showToast('Purchase request submitted successfully!', 'success');
        setSelectedCourse(null);
        setScreenshotFile(null);
        setScreenshotPreview('');
        loadStore();
      } else {
        showToast(res?.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      showToast('Error submitting purchase request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <ToastContainer />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back control */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/dashboard/student')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        {/* Title */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" /> Course Store
            </h1>
            <p className="opacity-85 text-xs mt-0.5">Explore premium courses and start learning hardware/software repairs</p>
          </div>
          <span className="bg-white/20 border border-white/25 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            New Achievements
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Paid Courses */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Available for Purchase</h2>
            
            {courses.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-700">No new courses</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">You have already purchased or requested all active courses cataloged on Shree Raam Mobile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {courses.map(course => (
                  <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="h-44 bg-gray-100 relative">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase tracking-wider">
                            Shree Raam Mobile
                          </div>
                        )}
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-md">
                          ₹{course.price}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-extrabold text-gray-900 text-base mb-1.5 truncate capitalize">{course.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{course.description || 'No description provided.'}</p>
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-2">
                      <button 
                        onClick={() => setSelectedCourse(course)}
                        className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 font-bold text-xs"
                      >
                        <CreditCard className="w-4 h-4" /> Buy Course
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Verification Requests */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Pending Verification</h2>
            
            <div className="space-y-4">
              {pendingPurchases.map(p => (
                <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-4 flex gap-4 shadow-sm relative overflow-hidden">
                  {/* Lock Stripe */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                  
                  <div className="w-20 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0 border border-gray-100">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.course_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">LOCKED</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate capitalize">{p.course_name}</h3>
                    <p className="text-[10px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                      <Loader className="w-3 h-3 animate-spin" /> Verifying Payment
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Submitted: {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              
              {pendingPurchases.length === 0 && (
                <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-8 text-center text-zinc-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-zinc-300" />
                  <p className="text-xs">No pending verification course purchases found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Buy Course Payment Dialog */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideIn">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
              <h3 className="font-black text-lg">Complete Purchase</h3>
              <p className="opacity-80 text-xs mt-0.5">{selectedCourse.title}</p>
            </div>
            
            <form onSubmit={handleBuySubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800">Total Price</span>
                <span className="text-lg font-black text-emerald-900">₹{selectedCourse.price}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Payment Channel</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="input select text-xs"
                >
                  <option value="UPI / GPay">GPay / PhonePe / Paytm (UPI)</option>
                  <option value="Bank Transfer">Bank Account Transfer</option>
                  <option value="Cash / Manual">Cash Deposit</option>
                </select>
              </div>

              {/* Payment details panel */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-2 leading-relaxed">
                <p><strong>Step 1:</strong> Send payment of <strong>₹{selectedCourse.price}</strong> using chosen channel.</p>
                <p><strong>Step 2:</strong> Scan QR code or pay to mobile: <strong>+91 95522 10333</strong>.</p>
                <p><strong>Step 3:</strong> Take a screenshot of the transaction receipt and attach below.</p>
              </div>

              {/* Attachment box */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Upload Receipt Screenshot *</label>
                <div className="flex items-center gap-3">
                  <label className="border border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-4 w-20 h-20 flex flex-col items-center justify-center cursor-pointer transition text-gray-400 hover:text-emerald-600">
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] mt-1 font-semibold">Select File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleScreenshotChange}
                      className="hidden" 
                      required
                    />
                  </label>
                  {screenshotPreview && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={screenshotPreview} alt="Screenshot" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setScreenshotFile(null); setScreenshotPreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 hover:bg-gray-100 rounded-lg text-xs text-gray-600 font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-6 flex items-center gap-1.5 text-xs"
                >
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Submit Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
