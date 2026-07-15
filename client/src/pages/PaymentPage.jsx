import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, Upload, FileText } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function PaymentPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [repair, setRepair] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [dbPaymentMethods, setDbPaymentMethods] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login/customer'); return; }
    loadRepair();
    fetchPaymentMethods();
  }, [id, isAuthenticated, navigate]);

  const fetchPaymentMethods = async () => {
    try {
      const res = await api.get('/payment/methods');
      if (res?.success) {
        setDbPaymentMethods(res.methods || []);
        if (res.methods?.length > 0) setSelectedMethod(res.methods[0].name);
      }
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

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

    const formData = new FormData();
    formData.append('payment_method', selectedMethod);
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }

    try {
      const res = await api.upload(`/customer/repairs/${id}/pay`, formData);
      if (res.success) {
        setSuccess(true);
        setInvoiceNumber(res.invoice_number || 'INV-' + id);
      } else {
        showToast(res.message || 'Payment submission failed', 'error');
      }
    } catch (err) {
      showToast('Connection error. Failed to record payment.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loading />;

  if (!repair) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12 transition">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <p className="text-red-500 font-bold mb-4">Quotation or Repair not found.</p>
          <button onClick={() => navigate('/dashboard/customer')} className="btn-primary">Go to Dashboard</button>
        </main>
      </div>
    );
  }

  const partsC = parseFloat(repair.parts_cost || 0);
  const laborC = parseFloat(repair.labor_cost || 0);
  const otherC = parseFloat(repair.other_charges || 0);
  const discC = parseFloat(repair.discount || 0);
  const total = partsC + laborC + otherC - discC;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12 transition">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-12">
          <div className="card text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Thank you! Your payment details are submitted and under verification by our technical department.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 text-sm space-y-2">
              <div className="flex justify-between text-gray-600"><span>Invoice No:</span><span className="font-bold text-gray-800">{invoiceNumber}</span></div>
              <div className="flex justify-between text-gray-600"><span>Device:</span><span className="font-semibold text-gray-800">{repair.brand} {repair.model}</span></div>
              <div className="flex justify-between text-gray-600"><span>Amount Paid:</span><span className="font-black text-green-700">₹{total.toFixed(2)}</span></div>
            </div>
            <button onClick={() => navigate('/dashboard/customer')} className="btn-primary w-full">Back to Dashboard</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 transition">
      <Navbar />
      <ToastContainer />
      <main className="max-w-md mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-gray-500 hover:text-green-600 font-bold mb-4 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Invoice Summary */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" /> Invoice summary
          </h2>
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
            {dbPaymentMethods.map(m => (
              <button key={m.id} onClick={() => setSelectedMethod(m.name)}
                className={`p-3 rounded-lg border text-center transition ${
                  selectedMethod === m.name ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-200' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}>
                <span className="text-2xl block mb-1">
                  {m.type === 'upi' ? '📱' : m.type === 'cash' ? '💵' : '💳'}
                </span>
                <span className="text-xs font-medium">{m.name}</span>
              </button>
            ))}
            {dbPaymentMethods.length === 0 && (
              <p className="col-span-4 text-xs text-red-500 font-bold">No active payment methods configured</p>
            )}
          </div>
          {/* Render active method details */}
          {(() => {
            const sel = dbPaymentMethods.find(m => m.name === selectedMethod);
            if (!sel) return null;
            return (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-1.5">
                <p className="font-bold text-gray-800">Payment details for {sel.name}:</p>
                {sel.type === 'upi' && sel.upi_id && (
                  <p className="font-mono text-green-700 font-bold">UPI ID: {sel.upi_id}</p>
                )}
                {(sel.type === 'card' || sel.type === 'netbanking') && (
                  <>
                    <p className="font-mono text-gray-700">Account No: {sel.bank_account || 'N/A'}</p>
                    {sel.ifsc_code && <p className="font-mono text-gray-700">IFSC Code: {sel.ifsc_code}</p>}
                  </>
                )}
                {sel.type === 'cash' && (
                  <p className="text-gray-600">Please pay in cash directly at the service center.</p>
                )}
              </div>
            );
          })()}
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
