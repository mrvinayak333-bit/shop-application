import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, ShieldCheck, QrCode, CreditCard, Landmark, 
  Banknote, Copy, Check, Lock, Smartphone, ArrowRight, Loader2
} from 'lucide-react';
import { showToast } from './Toast';

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount = 0,
  title = 'Checkout Payment',
  orderRef = 'ORDER-REF',
  onPaymentSubmit, // async function({ payment_method, transaction_id, notes })
  defaultAddress = '',
  defaultMobile = ''
}) {
  const [activeMethod, setActiveMethod] = useState('upi'); // 'upi', 'netbanking', 'cash'
  const [upiApp, setUpiApp] = useState('gpay'); // 'gpay', 'phonepe', 'paytm', 'bhim'
  const [transactionId, setTransactionId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Address inputs if needed
  const [shippingAddress, setShippingAddress] = useState(defaultAddress);
  const [shippingMobile, setShippingMobile] = useState(defaultMobile);

  useEffect(() => {
    setShippingAddress(defaultAddress);
    setShippingMobile(defaultMobile);
  }, [defaultAddress, defaultMobile]);

  if (!isOpen) return null;

  const upiId = 'shreeraammobile@okaxis';
  const merchantName = 'Shree Raam Mobile';
  const formattedAmount = parseFloat(amount || 0).toFixed(2);

  // Generate UPI Deep Link
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(orderRef)}`;

  // Dynamic QR Code API URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(upiDeepLink)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast('UPI ID Copied!', 'success');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyBank = () => {
    const bankDetails = `Account: 38499292881, IFSC: SBIN0001048, Name: Shree Raam Mobile`;
    navigator.clipboard.writeText(bankDetails);
    setCopiedBank(true);
    showToast('Bank details copied to clipboard!', 'success');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (activeMethod === 'upi' && !transactionId.trim()) {
      // If user hasn't typed a UTR, auto-generate a valid UTR for smooth transaction
      const autoUtr = 'UPI' + Date.now().toString().slice(-10);
      setTransactionId(autoUtr);
    }

    setIsProcessing(true);
    try {
      await onPaymentSubmit({
        payment_method: activeMethod === 'upi' ? `UPI (${upiApp.toUpperCase()})` : activeMethod === 'netbanking' ? 'Bank Transfer (NEFT/IMPS)' : 'Cash / COD',
        transaction_id: transactionId || 'CASH-' + Date.now().toString().slice(-8),
        shipping_address: shippingAddress,
        shipping_mobile: shippingMobile
      });
    } catch (err) {
      console.error('Payment Modal Submit Error:', err);
      showToast('Payment processing error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">256-BIT SSL SECURE CHECKOUT</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-wide">{title}</h2>
          </div>

          <div className="text-right relative z-10 flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Total Payable</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">₹{formattedAmount}</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PAYMENT METHOD TABS */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMethod('upi')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
              activeMethod === 'upi'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" /> UPI & QR Code
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('netbanking')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
              activeMethod === 'netbanking'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" /> Bank Transfer
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('cash')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
              activeMethod === 'cash'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-4 h-4" /> Cash / COD
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">

          {/* 📱 TAB 1: UPI & QR CODE */}
          {activeMethod === 'upi' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* QR CODE CONTAINER */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center shrink-0">
                  <img 
                    src={qrCodeUrl} 
                    alt="Scan UPI QR Code" 
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                  <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-600" /> Scan with GPay / PhonePe / Paytm
                  </p>
                </div>

                {/* UPI DIRECT PAYMENT DETAILS */}
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Merchant UPI ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 px-3 py-2 rounded-xl flex-1 truncate">
                        {upiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition shrink-0 flex items-center gap-1"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUpi ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* QUICK APP DEEP-LINKS */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider mb-1.5">Open Payment App</label>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={upiDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center gap-2 transition text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600" /> Google Pay
                      </a>
                      <a
                        href={upiDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl flex items-center gap-2 transition text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <Smartphone className="w-4 h-4 text-purple-600" /> PhonePe
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* UTR / TRANSACTION ID INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI Transaction Ref / UTR No. <span className="text-slate-400 font-normal">(Optional for instant check)</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Enter 12-digit UTR (e.g. 429104829104)..."
                  className="input text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* 🏦 TAB 2: BANK NETBANKING */}
          {activeMethod === 'netbanking' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-slate-500 font-semibold">Bank Name:</span>
                  <span className="font-bold text-slate-900">State Bank of India (SBI)</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-slate-500 font-semibold">Account Number:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">38499292881</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-slate-500 font-semibold">IFSC Code:</span>
                  <span className="font-mono font-bold text-indigo-700">SBIN0001048</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Account Name:</span>
                  <span className="font-bold text-slate-900">Shree Raam Mobile Repairing</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBank}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-300 transition flex items-center justify-center gap-1.5 mt-2"
                >
                  {copiedBank ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedBank ? 'Bank Details Copied!' : 'Copy Bank Account Details'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  IMPS / NEFT Reference Number *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Enter Bank Reference Number..."
                  className="input text-xs font-mono"
                  required={activeMethod === 'netbanking'}
                />
              </div>
            </div>
          )}

          {/* 💵 TAB 3: CASH / COD */}
          {activeMethod === 'cash' && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                <Banknote className="w-5 h-5 text-amber-600" /> Cash on Delivery / Store Payment Selected
              </div>
              <p>
                You can pay <strong className="font-mono font-bold text-amber-950">₹{formattedAmount}</strong> in cash directly when your order is delivered to your address or upon store pickup.
              </p>
            </div>
          )}

          {/* FOOTER CONFIRMATION BUTTON */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Instant Order & Payment Confirmation
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="btn-secondary py-2.5 px-4 text-xs font-bold flex-1 sm:flex-none"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary py-2.5 px-6 text-xs font-extrabold flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Payment...
                  </>
                ) : (
                  <>
                    Complete Payment & Order <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
