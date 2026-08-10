import { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, Search, AlertCircle, CheckCircle2, RefreshCw, Barcode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../lib/api';

export default function BarcodeScannerModal({ onClose, onRecordFound }) {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    // Initialize html5-qrcode camera scanner
    const scannerId = 'barcode-camera-reader';
    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 260, height: 140 },
        aspectRatio: 1.777,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true
      },
      /* verbose= */ false
    );

    html5QrcodeScannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        handleScanResult(decodedText);
      },
      (errorMessage) => {
        // Ignore background frame scanning errors
      }
    );

    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, []);

  const handleScanResult = async (scannedCode) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    setLoading(true);
    setError('');
    setSuccessMsg(`Barcode Scanned: ${cleanCode}`);

    try {
      // Query backend for this tracking number or barcode
      const res = await api.get(`/admin/customer-tracking?search=${encodeURIComponent(cleanCode)}`);
      
      if (res && res.success && res.trackingRecords && res.trackingRecords.length > 0) {
        const exactMatch = res.trackingRecords.find(
          r => r.token_number?.toLowerCase() === cleanCode.toLowerCase() ||
               r.tracking_number?.toLowerCase() === cleanCode.toLowerCase() ||
               String(r.id) === cleanCode
        ) || res.trackingRecords[0];

        setSuccessMsg(`Match Found: ${exactMatch.token_number} (${exactMatch.customer_name})`);
        
        // Pause for 400ms visual confirmation then pass to parent
        setTimeout(() => {
          onRecordFound(exactMatch);
          onClose();
        }, 400);
      } else {
        setError(`No Repair or Accessory Order found for Barcode: "${cleanCode}"`);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setError('Server lookup failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanResult(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">Live Barcode & QR Scanner</h3>
              <p className="text-[10px] text-gray-400">Scan tracking barcode or type tracking number</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Live Camera Scanner Box */}
        <div className="bg-gray-950 rounded-2xl p-2 border border-gray-800 overflow-hidden shadow-inner relative">
          <div id="barcode-camera-reader" className="w-full text-white text-xs font-mono"></div>
        </div>

        {/* Hardware Barcode Gun / Manual Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Hardware Barcode Scanner Gun / Type Code
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              <input
                type="text"
                autoFocus
                placeholder="Scan or enter code (e.g. SRM-2026-000001, ACC-2026-000001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs rounded-xl pl-10 pr-3 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Find
            </button>
          </div>
        </form>

        {/* Modal Action Buttons */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-xl text-xs transition"
          >
            Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
}
