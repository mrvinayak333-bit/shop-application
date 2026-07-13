import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, Upload, FileText } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

const paymentMethods = [
  { name: 'Cash', icon: '💵' },
  { name: 'UPI', icon: '📱' },
  { name: 'PhonePe', icon: '📲' },
  { name: 'Google Pay', icon: '🔵' },
  { name: 'Paytm', icon: '💳' },
  { name: 'Debit Card', icon: '💳' },
  { name: 'Credit Card', icon: '💳' },
  { name: 'Net Banking', icon: '🏦' },
];

export default function PaymentPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [repair, setRepair] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login/customer'); return; }
    loadRepair();
  }, [id, isAuthenticated, navigate]);

  const loadRepair = async () => {
    try {
      const res = await api.get('/customer/dashboard');
      if (res.success) {
        const r = res.activeRepairs.find(rep => rep.id === parseInt(id));
        if (r) {
          setRepair(r);
          setQuotation(r);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be less than 5MB', 'error');
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePayment = async () => {
    if (!selectedMethod) return showToast('Please select a payment method', 'error');
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('payment_method', selectedMethod);
      formData.append('amount', repair?.total_cost || 0);
      if (screenshot) formData.append('screenshot', screenshot);
      const res = await api.post(`/repair/${id}/payment`, formData);
      if (res.success) {
        setSuccess(true);
        setInvoiceNumber(res.invoice_number);
        showToast('Payment submitted successfully!', 'success');
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error submitting payment', 'error'); }
    setProcessing(false);
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;
  if (!repair) return (
    <div className="min-h-screen"><Navbar />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Repair not found or payment not available</p>
        <button onClick={() => navigate('/dashboard/customer')} className="btn-primary mt-4">Back to Dashboard</button>
      </div>
    </div>
  );

  const partsC = parseFloat(repair.parts_cost || 0);
  const laborC = parseFloat(repair.labor_cost || 0);
  const otherC = parseFloat(repair.other_charges || 0);
  const discC = parseFloat(repair.discount || 0);
  const total = partsC + laborC + otherC - discC;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <ToastContainer />
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="card">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Submitted!</h1>
            <p className="text-gray-600 mb-4">Your payment has been recorded and is pending verification.</p>
            <div className="p-4 bg-green-50 rounded-lg mb-4 space-y-2 text-sm">
              <p><span className="font-medium">Invoice:</span> {invoiceNumber}</p>
              <p><span className="font-medium">Amount:</span> ₹{total.toFixed(2)}</p>
              <p><span className="font-medium">Method:</span> {selectedMethod}</p>
              <p><span className="font-medium">Tracking:</span> {repair.tracking_number}</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">Admin will verify your payment shortly. You will be notified once verified.</p>
            <button onClick={() => navigate('/dashboard/customer')} className="btn-primary w-full">Back to Dashboard</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-blue-600 hover:underline mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Invoice Summary */}
        <div className="card mb-4">
          <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-green-600" /> Payment
          </h1>
          <p className="text-sm text-gray-500 font-mono">{repair.tracking_number}</p>
          <p className="text-sm text-gray-600">{repair.brand} {repair.model}</p>
        </div>

        {/* Amount Breakdown */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">Invoice Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">Parts Cost</span><span>₹{partsC.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">Labor Cost</span><span>₹{laborC.toFixed(2)}</span>
            </div>
            {otherC > 0 && (
              <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-600">Other Charges</span><span>₹{otherC.toFixed(2)}</span>
              </div>
            )}
            {discC > 0 && (
              <div className="flex justify-between p-2 bg-green-50 rounded text-sm">
                <span className="text-green-600">Discount</span><span className="text-green-600">-₹{discC.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 font-bold">
              <span>Total Amount</span><span className="text-blue-600 text-xl">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">Select Payment Method</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paymentMethods.map(m => (
              <button key={m.name} onClick={() => setSelectedMethod(m.name)}
                className={`p-3 rounded-lg border text-center transition ${
                  selectedMethod === m.name ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-200' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}>
                <span className="text-2xl block mb-1">{m.icon}</span>
                <span className="text-xs font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Upload Payment Screenshot
          </h2>
          <input type="file" accept="image/*" onChange={handleScreenshotChange} className="input mb-3" />
          {screenshotPreview && (
            <div className="mt-2">
              <img src={screenshotPreview} alt="Payment screenshot" className="max-h-48 rounded-lg border" />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button onClick={handlePayment} disabled={processing || !selectedMethod} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
          {processing ? 'Processing...' : `Proceed to Pay ₹${total.toFixed(2)}`}
        </button>
        <p className="text-xs text-gray-500 text-center mt-3">
          Payment will be verified by admin. You will be notified once confirmed.
        </p>
      </main>
    </div>
  );
}
