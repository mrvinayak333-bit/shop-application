import { useState, useEffect } from 'react';
import {
  Search, Filter, Printer, User, Phone, MapPin, Smartphone, Clock,
  CheckCircle, AlertCircle, RefreshCw, Calendar, FileText, ChevronRight,
  Eye, X, Shield, DollarSign, Wrench, Scan, ShoppingBag, Barcode
} from 'lucide-react';
import api from '../lib/api';
import StatusBadge from './StatusBadge';
import ThermalPrintModal from './ThermalPrintModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeGenerator from './BarcodeGenerator';

export default function CustomerTrackingList({ role = 'admin' }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [techFilter, setTechFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Record & Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [printRecord, setPrintRecord] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchRecords();
    if (role === 'admin') fetchTechnicians();
  }, [recordTypeFilter, statusFilter, techFilter, paymentFilter, startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (recordTypeFilter !== 'ALL') params.append('record_type', recordTypeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (techFilter !== 'ALL') params.append('technician_id', techFilter);
      if (paymentFilter !== 'ALL') params.append('payment_status', paymentFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/admin/customer-tracking?${params.toString()}`);
      if (res && res.success) {
        setRecords(res.trackingRecords || []);
      }
    } catch (err) {
      console.error('Fetch customer tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/admin/technicians/list');
      if (res && res.success) {
        setTechnicians(res.technicians || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRecordTypeFilter('ALL');
    setStatusFilter('ALL');
    setTechFilter('ALL');
    setPaymentFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Customer Repair & Accessories Tracking
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time repairs and accessory orders with POS thermal printer & Code128 Barcode Scanner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 shrink-0"
          >
            <Scan className="w-4 h-4" /> 📷 Scan Barcode
          </button>

          <button
            onClick={fetchRecords}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-gray-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Records
          </button>
        </div>
      </div>

      {/* Search & Filter Controls Panel */}
      <form onSubmit={handleSearchSubmit} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Token (SRM-2026-..., ACC-2026-...), Customer Name, Phone, Device, Accessory Item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs transition shadow-sm shrink-0"
          >
            Search Customer
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 text-xs">
          {/* Record Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Type</label>
            <select
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">All Categories</option>
              <option value="repair">🔧 Repairs Only</option>
              <option value="accessory">🛒 Accessories Store Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="placed">Order Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_repair">In Repair</option>
              <option value="shipped">Shipped</option>
              <option value="ready_delivery">Ready for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Technician Filter (Admin only) */}
          {role === 'admin' && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Technician</label>
              <select
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="ALL">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Status</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">All Payments</option>
              <option value="paid">Paid Full</option>
              <option value="partial">Partial Advance</option>
              <option value="unpaid">Unpaid / Due</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </form>

      {/* Customer Records Table */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-gray-900 border border-gray-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">Loading Customer Tracking Records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-gray-900 border border-dashed border-gray-800 rounded-2xl">
          <User className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-bold text-gray-300">No matching customer repair records found</h3>
          <p className="text-xs text-gray-500">Try adjusting your search criteria or date filters.</p>
          <button
            onClick={handleResetFilters}
            className="text-xs text-emerald-400 font-bold hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950 border-b border-gray-800 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Token / Tracking No</th>
                  <th className="px-4 py-3.5">Customer Name</th>
                  <th className="px-4 py-3.5">Phone Number</th>
                  <th className="px-4 py-3.5 max-w-[200px]">Customer Address</th>
                  <th className="px-4 py-3.5">Item / Device Specs</th>
                  <th className="px-4 py-3.5">Status</th>
                  {role === 'admin' && <th className="px-4 py-3.5">Executive</th>}
                  <th className="px-4 py-3.5">Balance Due</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/60 text-xs">
                {records.map((r) => {
                  const hasBalance = r.remaining_balance > 0;
                  const isAcc = r.record_type === 'accessory_order';

                  return (
                    <tr key={`${r.record_type}_${r.id}`} className="hover:bg-gray-800/40 transition">
                      {/* Category Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isAcc ? (
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-purple-400" /> Accessory Order
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-emerald-400" /> Mobile Repair
                          </span>
                        )}
                      </td>

                      {/* Prominent Token Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-mono font-black text-xs transition inline-flex items-center gap-1 shadow-sm"
                          title="Click to view complete details & Barcode"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          {r.token_number}
                        </button>
                      </td>

                      {/* Customer Name */}
                      <td className="px-4 py-3.5 font-extrabold text-white whitespace-nowrap">
                        {r.customer_name}
                      </td>

                      {/* Phone Number */}
                      <td className="px-4 py-3.5 font-bold text-gray-300 whitespace-nowrap">
                        {r.phone_number}
                      </td>

                      {/* Customer Address with Auto Word Wrapping */}
                      <td className="px-4 py-3.5 text-gray-400 max-w-[220px] whitespace-normal break-words leading-relaxed">
                        {r.customer_address}
                      </td>

                      {/* Item / Device Specs */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-gray-200 block">{r.device_brand}</span>
                        <span className="text-[11px] text-gray-400 font-medium block">{r.device_model}</span>
                      </td>

                      {/* Repair / Order Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.repair_status} />
                      </td>

                      {/* Executive (Admin view) */}
                      {role === 'admin' && (
                        <td className="px-4 py-3.5 font-medium text-gray-300 whitespace-nowrap">
                          {r.technician_name}
                        </td>
                      )}

                      {/* Balance Due */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-extrabold ${hasBalance ? 'text-amber-400' : 'text-emerald-400'}`}>
                          ₹{r.remaining_balance}
                        </span>
                        <span className="block text-[9px] uppercase font-bold text-gray-500">
                          {r.payment_status}
                        </span>
                      </td>

                      {/* Action Buttons: Details & Direct Thermal Print */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="bg-gray-800 hover:bg-gray-700 text-sky-400 border border-gray-700 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1"
                            title="View Record Details"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          <button
                            onClick={() => setPrintRecord(r)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition flex items-center gap-1 shadow-sm"
                            title="Direct POS Thermal Print"
                          >
                            <Printer className="w-3.5 h-3.5" /> 🖨 Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: COMPLETE CUSTOMER RECORD DETAILS & BARCODE ──────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-base">
                  {selectedRecord.record_type === 'accessory_order' ? 'Accessory Order Details & Barcode' : 'Customer & Repair Record Details'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prominent Token & Barcode Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Tracking Number / Code128</span>
                <h2 className="text-xl font-mono font-black text-white">{selectedRecord.token_number}</h2>
              </div>

              {/* Real Barcode SVG */}
              <div className="bg-white p-2 rounded-xl border border-gray-200">
                <BarcodeGenerator
                  value={selectedRecord.token_number}
                  width={1.6}
                  height={40}
                  fontSize={10}
                />
              </div>

              <button
                onClick={() => {
                  setPrintRecord(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40 shrink-0"
              >
                <Printer className="w-4 h-4" /> Print POS Bill
              </button>
            </div>

            {/* Complete Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Customer Box */}
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-2">
                <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-[11px] border-b border-gray-800 pb-1">
                  Customer Profile
                </h4>
                <div className="space-y-1.5">
                  <p><span className="text-gray-400 font-bold">Name:</span> <strong className="text-white text-sm">{selectedRecord.customer_name}</strong></p>
                  <p><span className="text-gray-400 font-bold">Phone Number:</span> <strong className="text-gray-200">{selectedRecord.phone_number}</strong></p>
                  <p><span className="text-gray-400 font-bold">Alt Phone:</span> <span className="text-gray-300">{selectedRecord.alt_phone_number}</span></p>
                  <div>
                    <span className="text-gray-400 font-bold block">Customer Address:</span>
                    <p className="text-gray-200 font-medium leading-relaxed mt-0.5 break-words">
                      {selectedRecord.customer_address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item / Device Box */}
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-2">
                <h4 className="font-extrabold text-sky-400 uppercase tracking-wider text-[11px] border-b border-gray-800 pb-1">
                  {selectedRecord.record_type === 'accessory_order' ? 'Accessories Item Details' : 'Device Specs & Status'}
                </h4>
                <div className="space-y-1.5">
                  <p><span className="text-gray-400 font-bold">Item Title:</span> <strong className="text-white">{selectedRecord.device_brand}</strong></p>
                  <p><span className="text-gray-400 font-bold">Details:</span> <strong className="text-white">{selectedRecord.device_model}</strong></p>
                  {selectedRecord.imei !== 'N/A' && <p><span className="text-gray-400 font-bold">IMEI:</span> <code className="text-sky-300 font-mono">{selectedRecord.imei}</code></p>}
                  <p><span className="text-gray-400 font-bold">Assigned Executive:</span> <strong className="text-gray-200">{selectedRecord.technician_name}</strong></p>
                  <p><span className="text-gray-400 font-bold">Expected Delivery:</span> <span className="text-gray-200">{selectedRecord.expected_delivery_date}</span></p>
                </div>
              </div>

              {/* Billing & Balance Box */}
              <div className="md:col-span-2 bg-gray-950 p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="font-extrabold text-amber-400 uppercase tracking-wider text-[11px]">Financial Status</h4>
                  <div className="flex gap-4 mt-1 text-xs">
                    <p><span className="text-gray-400">Total:</span> <strong className="text-white font-black">₹{selectedRecord.total_amount}</strong></p>
                    <p><span className="text-gray-400">Paid:</span> <strong className="text-emerald-400 font-bold">₹{selectedRecord.paid_amount}</strong></p>
                    <p><span className="text-gray-400">Balance:</span> <strong className="text-amber-400 font-black">₹{selectedRecord.remaining_balance}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedRecord.repair_status} />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                    {selectedRecord.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setPrintRecord(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-950/40"
              >
                <Printer className="w-4 h-4" /> Open Thermal POS Print Preview
              </button>

              <button
                onClick={() => setSelectedRecord(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-6 py-3 rounded-2xl transition text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LIVE CAMERA / HARDWARE BARCODE SCANNER ──────────────────────── */}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onRecordFound={(rec) => {
            setSelectedRecord(rec);
          }}
        />
      )}

      {/* ── MODAL 3: THERMAL POS PRINT PREVIEW WITH BARCODE (58mm / 80mm) ─────────── */}
      {printRecord && (
        <ThermalPrintModal
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
