import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { 
  DollarSign, Wrench, ShoppingCart, User, Clock, CheckCircle, XCircle, 
  Plus, Calendar, ArrowRight, Shield, List, Upload, Download, Eye,
  Database, RefreshCw, BarChart2, TrendingUp, Landmark, FileText, Image as ImageIcon,
  Search, ShieldAlert
} from 'lucide-react';

const BANK_NAMES = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Axis Bank",
  "Union Bank of India",
  "Canara Bank"
];

export default function PaymentCollection() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // overview, approve_collection, approve_deposit, company_bank, audit_logs, reports
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login/staff');
    } else if (isAuthenticated === true && user && !['master', 'admin', 'staff'].includes(user.role)) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Staff States
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [orderType, setOrderType] = useState('mobile_repair');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [totalAmount, setTotalAmount] = useState('');
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [staffCollections, setStaffCollections] = useState([]);
  
  // Denominations
  const [d500, setD500] = useState(0);
  const [d200, setD200] = useState(0);
  const [d100, setD100] = useState(0);
  const [d50, setD50] = useState(0);
  const [d20, setD20] = useState(0);
  const [d10, setD10] = useState(0);
  const [coins, setCoins] = useState(0);

  // Admin States
  const [pendingCollections, setPendingCollections] = useState([]);
  const [adminWallet, setAdminWallet] = useState(null);
  const [depositBank, setDepositBank] = useState('');
  const [depositAccount, setDepositAccount] = useState('');
  const [depositSlip, setDepositSlip] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositAmount, setDepositAmount] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Master States
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [companyBankStats, setCompanyBankStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Reports States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('all');
  const [reportData, setReportData] = useState(null);

  // Load Data based on role
  useEffect(() => {
    if (!isAuthenticated) return;
    loadRoleData();
  }, [isAuthenticated, activeTab]);

  const loadRoleData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'staff') {
        // Load Admins list
        const res = await api.get('/collection/admins');
        if (res.success) setAdmins(res.admins);
      }
      
      if (user?.role === 'admin') {
        // Load pending collections
        const resPending = await api.get('/collection/pending');
        if (resPending.success) setPendingCollections(resPending.collections);

        // Load admin wallet summary
        const resWallet = await api.get('/collection/admin-wallet');
        if (resWallet.success) setAdminWallet(resWallet);
      }

      if (user?.role === 'master') {
        if (activeTab === 'overview' || activeTab === 'approve_deposit') {
          const resDep = await api.get('/collection/master/pending-deposits');
          if (resDep.success) setPendingDeposits(resDep.deposits);
        }
        if (activeTab === 'company_bank') {
          const resStats = await api.get('/collection/master/bank-stats');
          if (resStats.success) setCompanyBankStats(resStats);
        }
        if (activeTab === 'audit_logs') {
          const resLogs = await api.get('/collection/audit-logs');
          if (resLogs.success) setAuditLogs(resLogs.logs);
        }
      }

      if (activeTab === 'reports') {
        fetchReports();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Search & Auto-fetch States
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [alreadyPaidMessage, setAlreadyPaidMessage] = useState('');

  // Auto fill amount on payment method change
  useEffect(() => {
    if (fetchedOrder && paymentMethod !== 'cash') {
      setTotalAmount(fetchedOrder.pending_amount.toString());
    }
  }, [paymentMethod, fetchedOrder]);

  const handleFetchOrder = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return showToast('Please enter a Repair ID or Order ID', 'error');

    setLoading(true);
    setSearchError('');
    setAlreadyPaidMessage('');
    setFetchedOrder(null);

    try {
      const res = await api.get(`/collection/fetch-order/${searchQuery.trim()}`);
      if (res.success) {
        setFetchedOrder(res.data);
        setOrderId(searchQuery.trim());
        setCustomerName(res.data.customer_name);
        setMobileNumber(res.data.customer_mobile);
        setOrderType(res.orderType);
        if (paymentMethod !== 'cash') {
          setTotalAmount(res.data.pending_amount.toString());
        }
        showToast('Customer record loaded successfully!');
      } else {
        if (res.alreadyPaid) {
          setAlreadyPaidMessage(res.message);
        } else {
          setSearchError(res.message || 'Record Not Found.');
        }
      }
    } catch (err) {
      setSearchError('Record Not Found.');
    } finally {
      setLoading(false);
    }
  };

  // Denominations Auto-Calculator
  const calcTotalCash = () => {
    return (d500 * 500) + (d200 * 200) + (d100 * 100) + (d50 * 50) + (d20 * 20) + (d10 * 10) + Number(coins);
  };

  useEffect(() => {
    if (paymentMethod === 'cash') {
      setTotalAmount(calcTotalCash().toString());
    }
  }, [d500, d200, d100, d50, d20, d10, coins, paymentMethod]);

  // Submit payment collection (Staff)
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!orderId || !customerName || !mobileNumber || !totalAmount || !selectedAdminId) {
      return showToast('Please complete all required fields', 'error');
    }

    const payload = {
      order_id: orderId,
      customer_name: customerName,
      mobile_number: mobileNumber,
      order_type: orderType,
      payment_method: paymentMethod,
      total_amount: Number(totalAmount),
      assigned_admin_id: selectedAdminId,
      cash_denominations: paymentMethod === 'cash' ? JSON.stringify({
        500: d500, 200: d200, 100: d100, 50: d50, 20: d20, 10: d10, coins: Number(coins)
      }) : null
    };

    try {
      const res = await api.post('/collection/submit', payload);
      if (res.success) {
        showToast('Payment collection submitted to Admin for approval!');
        // Reset form
        setOrderId('');
        setCustomerName('');
        setMobileNumber('');
        setTotalAmount('');
        setD500(0); setD200(0); setD100(0); setD50(0); setD20(0); setD10(0); setCoins(0);
      } else {
        showToast(res.message || 'Error submitting collection', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Approve Collection (Admin)
  const handleApproveCollection = async (id) => {
    if (!confirm('Approve this collection request? Money will move to your wallet.')) return;
    try {
      const res = await api.post(`/collection/collection/${id}/approve`);
      if (res.success) {
        showToast(`Collection Approved! Receipt: ${res.receiptNumber}`);
        loadRoleData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Reject Collection (Admin)
  const handleRejectCollection = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return showToast('Please specify reason', 'error');
    try {
      const res = await api.post(`/collection/collection/${rejectId}/reject`, { reason: rejectReason });
      if (res.success) {
        showToast('Collection request rejected');
        setRejectId(null);
        setRejectReason('');
        loadRoleData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Submit Bank Deposit (Admin)
  const handleBankDeposit = async (e) => {
    e.preventDefault();
    if (!depositBank || !depositAccount || !depositSlip || !depositAmount) {
      return showToast('Please fill all deposit details', 'error');
    }
    
    if (adminWallet && Number(depositAmount) > adminWallet.pendingCashInHand) {
      return showToast(`Cannot deposit more than cash in hand (₹${adminWallet.pendingCashInHand})`, 'error');
    }

    const formData = new FormData();
    formData.append('bank_name', depositBank);
    formData.append('account_number', depositAccount);
    formData.append('deposit_slip_number', depositSlip);
    formData.append('deposit_date', depositDate);
    formData.append('deposit_amount', depositAmount);
    if (slipFile) formData.append('deposit_slip_image', slipFile);
    if (screenshotFile) formData.append('screenshot', screenshotFile);

    setLoading(true);
    try {
      // Direct raw fetch because of multipart/form-data
      const response = await fetch('/api/collection/submit-deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const res = await response.json();
      if (res.success) {
        showToast('Bank deposit slip submitted successfully for approval!');
        setDepositBank('');
        setDepositAccount('');
        setDepositSlip('');
        setDepositAmount('');
        setSlipFile(null);
        setScreenshotFile(null);
        loadRoleData();
      } else {
        showToast(res.message || 'Deposit submission failed', 'error');
      }
    } catch (err) {
      showToast('Error uploading deposit files', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Approve Bank Deposit (Master)
  const handleApproveDeposit = async (id) => {
    if (!confirm('Approve this bank deposit? Amount will be shifted to Company Accounts.')) return;
    try {
      const res = await api.post(`/collection/master/deposit/${id}/approve`);
      if (res.success) {
        showToast('Bank deposit approved successfully!');
        loadRoleData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Reject Bank Deposit (Master)
  const handleRejectDeposit = async (id) => {
    const reason = prompt('Specify bank deposit rejection reason:');
    if (reason === null) return;
    if (!reason.trim()) return showToast('Rejection reason is required', 'error');

    try {
      const res = await api.post(`/collection/master/deposit/${id}/reject`, { reason });
      if (res.success) {
        showToast('Deposit request rejected');
        loadRoleData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Fetch Reports
  const fetchReports = async () => {
    try {
      let url = '/collection/reports';
      const params = [];
      if (startDate && endDate) {
        params.push(`start_date=${startDate}`);
        params.push(`end_date=${endDate}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      const res = await api.get(url);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Navbar />
      <ToastContainer />

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Title Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-8 h-8 text-emerald-600" /> SRM Payment Collection Center
            </h1>
            <p className="text-gray-500 mt-1">Enterprise flow: Staff → Admin → Master approval and audit logger</p>
          </div>
          
          {/* Role Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-800 font-semibold text-sm shadow-sm">
            <Shield className="w-4 h-4" /> Role: {user?.role?.toUpperCase()}
          </div>
        </div>

        {/* Master Navigation Tabs */}
        {user?.role === 'master' && (
          <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Deposit Approvals ({pendingDeposits.length})
            </button>
            <button onClick={() => setActiveTab('company_bank')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'company_bank' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Company Bank Dashboard
            </button>
            <button onClick={() => setActiveTab('audit_logs')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'audit_logs' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Live Audit Trails
            </button>
            <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Enterprise Reports
            </button>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        {user?.role === 'admin' && (
          <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Admin Wallet & Deposit
            </button>
            <button onClick={() => setActiveTab('approve_collection')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'approve_collection' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Staff Collections ({pendingCollections.length})
            </button>
            <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              My Reports
            </button>
          </div>
        )}

        {/* STAFF DASHBOARD VIEW */}
        {user?.role === 'staff' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Payment Collection Form */}
            <div className="lg:col-span-2 card bg-white p-6 shadow-md border rounded-2xl">
              <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-1.5 text-gray-800">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Collect Customer Payment
              </h2>
              
              {/* Single Search Box */}
              <form onSubmit={handleFetchOrder} className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">Search Repair ID OR Order ID *</label>
                <div className="flex gap-2">
                  <input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Enter Repair ID or Accessories Order ID (e.g. SRM-...)" 
                    className="input flex-1 font-semibold"
                    required
                  />
                  <button type="submit" className="btn-primary px-6 flex items-center gap-2 text-sm font-bold">
                    <Search className="w-4 h-4" /> Fetch Details
                  </button>
                </div>
              </form>

              {/* Record Not Found Error Display */}
              {searchError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 flex items-center gap-2 font-semibold text-sm">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> {searchError}
                </div>
              )}

              {/* Payment Already Completed Warning Display */}
              {alreadyPaidMessage && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-6 flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" /> {alreadyPaidMessage}
                </div>
              )}

              {/* Customer details load block */}
              {fetchedOrder && (
                <div className="space-y-6">
                  {/* Read-Only Customer Info */}
                  <div className="bg-gray-50 border rounded-xl p-4">
                    <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">Customer & Device Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Customer Name</span>
                        <span className="font-bold text-gray-800 text-sm">{fetchedOrder.customer_name}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Mobile Number</span>
                        <span className="font-bold text-gray-800 text-sm">{fetchedOrder.customer_mobile}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Address</span>
                        <span className="font-bold text-gray-800">{fetchedOrder.customer_address}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Device Name / Brand</span>
                        <span className="font-bold text-gray-800">{fetchedOrder.brand} {fetchedOrder.device_name}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">IMEI / Serial</span>
                        <span className="font-bold text-gray-800 font-mono">{fetchedOrder.imei}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Warranty status</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{fetchedOrder.warranty}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Assigned Technician</span>
                        <span className="font-bold text-gray-800">{fetchedOrder.assigned_technician}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Order Date</span>
                        <span className="font-bold text-gray-800">{new Date(fetchedOrder.order_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase">Current Status</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded capitalize">{fetchedOrder.current_status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                    <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wider mb-3">Financial Status</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-indigo-700 font-semibold uppercase">Repair Amount</span>
                        <span className="font-bold text-gray-800 text-sm">₹{fetchedOrder.repair_amount}</span>
                      </div>
                      <div>
                        <span className="block text-indigo-700 font-semibold uppercase">Accessories Amount</span>
                        <span className="font-bold text-gray-800 text-sm">₹{fetchedOrder.accessories_amount}</span>
                      </div>
                      <div>
                        <span className="block text-indigo-700 font-semibold uppercase">Paid Amount</span>
                        <span className="font-bold text-green-600 text-sm">₹{fetchedOrder.paid_amount}</span>
                      </div>
                      <div>
                        <span className="block text-indigo-700 font-semibold uppercase">Pending Balance</span>
                        <span className="font-extrabold text-amber-700 text-base">₹{fetchedOrder.pending_amount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Payment Input fields */}
                  <form onSubmit={handleStaffSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method *</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                          <option value="cash">Cash Payment</option>
                          <option value="upi">UPI / Online Transfer</option>
                          <option value="card">Card Payment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Total Collected Amount (₹)</label>
                        <input 
                          type="number" 
                          value={totalAmount} 
                          onChange={e => setTotalAmount(e.target.value)} 
                          className="input font-extrabold text-lg text-emerald-700" 
                          required 
                          disabled={paymentMethod === 'cash'} 
                        />
                      </div>
                    </div>

                    {/* Cash Denominations Entry */}
                    {paymentMethod === 'cash' && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mt-2">
                        <h3 className="font-bold text-emerald-800 text-xs mb-3">💵 Cash Denominations Helper</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹500</label>
                            <input type="number" min="0" value={d500} onChange={e => setD500(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹200</label>
                            <input type="number" min="0" value={d200} onChange={e => setD200(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹100</label>
                            <input type="number" min="0" value={d100} onChange={e => setD100(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹50</label>
                            <input type="number" min="0" value={d50} onChange={e => setD50(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹20</label>
                            <input type="number" min="0" value={d20} onChange={e => setD20(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">₹10</label>
                            <input type="number" min="0" value={d10} onChange={e => setD10(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                          <div>
                            <label className="block font-semibold text-emerald-900 mb-0.5">Coins Total</label>
                            <input type="number" min="0" value={coins} onChange={e => setCoins(Number(e.target.value))} className="input py-1 text-center" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Admin Cards List */}
                    <div className="mt-4 border-t pt-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Select Admin to deposit *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {admins.map(a => {
                          const lastLogin = a.last_login ? new Date(a.last_login) : null;
                          const isOnline = lastLogin && (new Date() - lastLogin) < (15 * 60 * 1000);
                          const initials = a.name ? a.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'AD';
                          const isSelected = selectedAdminId === a.id.toString() || selectedAdminId === a.id;

                          return (
                            <div 
                              key={a.id} 
                              onClick={() => setSelectedAdminId(a.id)}
                              className={`cursor-pointer p-3 border rounded-xl flex items-center gap-3 transition-all duration-200 hover:bg-gray-50 ${
                                isSelected 
                                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20' 
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                                  {initials}
                                </div>
                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-gray-800 truncate">{a.name}</p>
                                <p className="text-[9px] text-gray-400 truncate">ID: {a.id}</p>
                                <span className={`inline-flex items-center text-[9px] font-bold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                                  {isOnline ? '● Online' : '● Offline'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 shadow-md font-bold"
                      disabled={!selectedAdminId || Number(totalAmount) <= 0}
                    >
                      <ArrowRight className="w-4 h-4" /> Submit Collection (Wait Admin Approval)
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Instruction Sidecard */}
            <div className="card bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-6 shadow-lg rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-3">Enterprise Cash Flow Flowchart</h3>
                <div className="space-y-4 text-sm text-emerald-100">
                  <p>🟢 <b>1. Staff Collects</b>: Fill customer and order payment details, submit selection to target admin.</p>
                  <p>🟡 <b>2. Admin Verifies</b>: Admin cross-checks physical cash/UPI receipt, approves or rejects.</p>
                  <p>🔵 <b>3. Master Deposited</b>: Admin deposits sum to bank, Master approves, moves directly to Company Bank Balance.</p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10 mt-6">
                <p className="text-xs opacity-75">All actions are registered in the Live Audit Log tracking User ID, IP addresses, and unique device IDs.</p>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN OVERVIEW & DEPOSIT */}
        {user?.role === 'admin' && activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Admin Wallet Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Wallet Summary */}
              {adminWallet && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-emerald-500 rounded-xl">
                    <p className="text-sm font-semibold text-gray-500">Today's Verified Collections</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">₹{adminWallet.today}</p>
                  </div>
                  <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-blue-500 rounded-xl">
                    <p className="text-sm font-semibold text-gray-500">Weekly Total Collections</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">₹{adminWallet.weekly}</p>
                  </div>
                  <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-amber-500 rounded-xl">
                    <p className="text-sm font-semibold text-gray-500">Total Cash in Hand (Pending Deposit)</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">₹{adminWallet.pendingCashInHand}</p>
                  </div>
                </div>
              )}

              {/* Deposit to Bank Form */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-1.5 text-gray-800">
                  <Landmark className="w-5 h-5 text-emerald-600" /> Bank Deposit Submission
                </h2>

                <form onSubmit={handleBankDeposit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Bank Name *</label>
                      <select value={depositBank} onChange={e => setDepositBank(e.target.value)} className="input" required>
                        <option value="">-- Select Bank --</option>
                        {BANK_NAMES.map((b, i) => <option key={i} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Account Number *</label>
                      <input value={depositAccount} onChange={e => setDepositAccount(e.target.value)} placeholder="Enter accounts details" className="input" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Deposit Slip Number *</label>
                      <input value={depositSlip} onChange={e => setDepositSlip(e.target.value)} placeholder="Slip reference ID" className="input" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Deposit Date *</label>
                      <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className="input" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Deposit Amount (₹) *</label>
                      <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" className="input text-lg font-bold" required />
                    </div>
                  </div>

                  {/* Image Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-xl p-4 transition text-center bg-gray-50">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Deposit Slip Image</span>
                      <input type="file" onChange={e => setSlipFile(e.target.files[0])} className="w-full text-xs" />
                    </div>
                    <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-xl p-4 transition text-center bg-gray-50">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Transaction Screenshot</span>
                      <input type="file" onChange={e => setScreenshotFile(e.target.files[0])} className="w-full text-xs" />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" /> Submit Deposit Slip (Master Approval)
                  </button>
                </form>
              </div>

            </div>

            {/* Cash Hand Explanation Sidecard */}
            <div className="card bg-white p-6 shadow-md border rounded-2xl space-y-4">
              <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Admin Deposit Rules</h3>
              <p className="text-sm text-gray-600">
                1. physical Cash collected from staff members accumulates in your <b>Pending Deposit</b> wallet.
              </p>
              <p className="text-sm text-gray-600">
                2. After submitting cash physically to the bank, upload both the bank stamp slip image and payment app screenshot.
              </p>
              <p className="text-sm text-gray-600">
                3. Deposited balance is locked. It will only be moved to the <b>Company Accounts</b> once approved by the Master administrator.
              </p>
            </div>

          </div>
        )}

        {/* ADMIN VIEW: PENDING STAFF COLLECTIONS */}
        {user?.role === 'admin' && activeTab === 'approve_collection' && (
          <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg">Staff Collection Verification Requests</h2>
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">Pending: {pendingCollections.length}</span>
            </div>
            
            {pendingCollections.length === 0 ? (
              <div className="p-8 text-center text-gray-400">All staff collections are verified!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                      <th className="text-left py-3 px-4">Staff Name</th>
                      <th className="text-left py-3 px-4">Order ID</th>
                      <th className="text-left py-3 px-4">Customer Details</th>
                      <th className="text-left py-3 px-4">Payment Info</th>
                      <th className="text-left py-3 px-4">Denomination Details</th>
                      <th className="text-left py-3 px-4">Total Amount</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCollections.map(c => {
                      const den = c.cash_denominations ? JSON.parse(c.cash_denominations) : null;
                      return (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-800">{c.staff_name} <span className="block text-[10px] text-gray-400 font-mono">{c.staff_code}</span></td>
                          <td className="py-3 px-4 font-medium text-gray-900">{c.order_id} <span className="block text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded w-max mt-1 uppercase font-bold">{c.order_type.replace('_', ' ')}</span></td>
                          <td className="py-3 px-4">{c.customer_name} <span className="block text-xs text-gray-500">{c.mobile_number}</span></td>
                          <td className="py-3 px-4 font-semibold text-indigo-700 capitalize">{c.payment_method}</td>
                          <td className="py-3 px-4 text-xs font-mono">
                            {den ? (
                              <div className="grid grid-cols-2 gap-x-2">
                                <span>500x{den[500] || 0}</span>
                                <span>200x{den[200] || 0}</span>
                                <span>100x{den[100] || 0}</span>
                                <span>50x{den[50] || 0}</span>
                                <span>20x{den[20] || 0}</span>
                                <span>Coins: ₹{den.coins || 0}</span>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600">₹{c.total_amount}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleApproveCollection(c.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => { setRejectId(c.id); }} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADMIN COLLECTION REJECTION DIALOG */}
        {rejectId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-gray-800 text-lg mb-3">Reject Payment Collection</h3>
              <form onSubmit={handleRejectCollection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection *</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide feedback (e.g., Wrong cash count)" className="input min-h-[100px]" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary py-2 flex-1">Confirm Reject</button>
                  <button type="button" onClick={() => { setRejectId(null); setRejectReason(''); }} className="btn-secondary py-2 flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MASTER VIEW: BANK DEPOSIT APPROVALS */}
        {user?.role === 'master' && activeTab === 'overview' && (
          <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg">Bank Deposits Verification Panel</h2>
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">Pending: {pendingDeposits.length}</span>
            </div>

            {pendingDeposits.length === 0 ? (
              <div className="p-8 text-center text-gray-400">All submitted bank deposits are processed!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                      <th className="text-left py-3 px-4">Admin Name</th>
                      <th className="text-left py-3 px-4">Bank Details</th>
                      <th className="text-left py-3 px-4">Deposit slip Info</th>
                      <th className="text-left py-3 px-4">Upload Files</th>
                      <th className="text-left py-3 px-4">Deposit Amount</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeposits.map(d => (
                      <tr key={d.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">{d.admin_name} <span className="block text-xs text-gray-400 font-mono">{d.admin_email}</span></td>
                        <td className="py-3 px-4"><b>{d.bank_name}</b> <span className="block text-xs text-gray-500 font-mono">A/C: {d.account_number}</span></td>
                        <td className="py-3 px-4">Ref: {d.deposit_slip_number} <span className="block text-xs text-gray-500">Date: {new Date(d.deposit_date).toLocaleDateString()}</span></td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {d.deposit_slip_image && (
                              <a href={d.deposit_slip_image} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Slip</a>
                            )}
                            {d.screenshot && (
                              <a href={d.screenshot} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Screenshot</a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">₹{d.deposit_amount}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleApproveDeposit(d.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => handleRejectDeposit(d.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MASTER VIEW: COMPANY BANK STATS & CHARTS */}
        {user?.role === 'master' && activeTab === 'company_bank' && companyBankStats && (
          <div className="space-y-8">
            
            {/* Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-emerald-600 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase">Total Company Cash Balance</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">₹{companyBankStats.lifetimeDeposited}</p>
              </div>
              <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-blue-600 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase">Today's Total Deposits</p>
                <p className="text-3xl font-black text-gray-900 mt-1">₹{companyBankStats.today}</p>
              </div>
              <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-indigo-600 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase">Weekly Total Deposits</p>
                <p className="text-3xl font-black text-gray-900 mt-1">₹{companyBankStats.weekly}</p>
              </div>
              <div className="card bg-white p-6 shadow-sm border border-l-4 border-l-amber-600 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase">Monthly Total Deposits</p>
                <p className="text-3xl font-black text-gray-900 mt-1">₹{companyBankStats.monthly}</p>
              </div>
            </div>

            {/* Simple Animated Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Monthly Deposits bar chart */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-1.5"><BarChart2 className="w-5 h-5 text-emerald-600" /> Monthly Deposit Overview</h3>
                <div className="h-64 flex items-end justify-between gap-2 border-b border-l p-4">
                  {companyBankStats.monthlyChart.map((item, idx) => {
                    const max = Math.max(...companyBankStats.monthlyChart.map(i => i.total), 1);
                    const pct = (item.total / max) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow">
                          ₹{item.total}
                        </div>
                        {/* Bar */}
                        <div style={{ height: `${Math.max(10, pct)}%` }} className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-500" />
                        <span className="text-[10px] text-gray-500 mt-2 font-semibold rotate-45 sm:rotate-0">{item.month}</span>
                      </div>
                    );
                  })}
                  {companyBankStats.monthlyChart.length === 0 && <p className="text-gray-400 mx-auto self-center">No deposit chart data available</p>}
                </div>
              </div>

              {/* Daily Collections line chart */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-1.5"><TrendingUp className="w-5 h-5 text-blue-600" /> Daily Collections Timeline</h3>
                <div className="h-64 flex items-end justify-between gap-2 border-b border-l p-4">
                  {companyBankStats.collectionChart.map((item, idx) => {
                    const max = Math.max(...companyBankStats.collectionChart.map(i => i.total), 1);
                    const pct = (item.total / max) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow">
                          ₹{item.total}
                        </div>
                        {/* Bar */}
                        <div style={{ height: `${Math.max(10, pct)}%` }} className="w-3/4 bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-500" />
                        <span className="text-[10px] text-gray-500 mt-2 font-semibold rotate-45 sm:rotate-0">{new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                      </div>
                    );
                  })}
                  {companyBankStats.collectionChart.length === 0 && <p className="text-gray-400 mx-auto self-center">No collections chart data available</p>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ENTERPRISE AUDIT LOGS (Master only) */}
        {user?.role === 'master' && activeTab === 'audit_logs' && (
          <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-1.5"><Database className="w-5 h-5 text-indigo-600" /> Live Audit Log Ledger</h2>
              <button onClick={loadRoleData} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"><RefreshCw className="w-4 h-4" /></button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                    <th className="text-left py-3 px-4">User Name</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Action Trigger</th>
                    <th className="text-left py-3 px-4">Details payload</th>
                    <th className="text-left py-3 px-4">Network Info</th>
                    <th className="text-left py-3 px-4">Logged Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(l => (
                    <tr key={l.id} className="border-b hover:bg-gray-50 text-xs">
                      <td className="py-3 px-4 font-semibold text-gray-900">{l.user_name || 'System'}</td>
                      <td className="py-3 px-4 capitalize font-medium">{l.user_role || 'system'}</td>
                      <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold uppercase tracking-wider font-mono text-[9px]">{l.action}</span></td>
                      <td className="py-3 px-4 max-w-xs truncate text-gray-500" title={l.details}>{l.details}</td>
                      <td className="py-3 px-4 text-gray-500">
                        <span className="block">IP: {l.ip_address}</span>
                        <span className="block text-[10px] truncate max-w-xs">{l.device_info}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTS VIEWS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Filter Card */}
            <div className="card bg-white p-6 shadow-sm border rounded-xl flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input py-1.5 text-sm" />
              </div>
              
              <button onClick={fetchReports} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5 shadow-sm">
                <RefreshCw className="w-4 h-4" /> Filter Reports
              </button>
              <button onClick={printReport} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Print / Export PDF
              </button>
            </div>

            {/* Print Area */}
            {reportData && (
              <div id="print-area" className="grid grid-cols-1 gap-6">
                
                {/* Collections Report Table */}
                <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><FileText className="w-5 h-5 text-emerald-600" /> Payment Collections Log</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                        <th className="text-left py-3 px-4">Staff Member</th>
                        <th className="text-left py-3 px-4">Order Ref</th>
                        <th className="text-left py-3 px-4">Payment info</th>
                        <th className="text-left py-3 px-4">Target Admin</th>
                        <th className="text-left py-3 px-4">Verified Total</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.collections.map(c => (
                        <tr key={c.id} className="border-b">
                          <td className="py-3 px-4 font-semibold">{c.staff_name}</td>
                          <td className="py-3 px-4">{c.order_id} <span className="block text-[10px] text-gray-400 capitalize">{c.order_type.replace('_', ' ')}</span></td>
                          <td className="py-3 px-4 capitalize font-semibold">{c.payment_method}</td>
                          <td className="py-3 px-4">{c.admin_name}</td>
                          <td className="py-3 px-4 font-bold text-emerald-600">₹{c.total_amount}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bank Deposits Report Table */}
                <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><Landmark className="w-5 h-5 text-blue-600" /> Bank Deposits Log</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                        <th className="text-left py-3 px-4">Admin Name</th>
                        <th className="text-left py-3 px-4">Bank Name</th>
                        <th className="text-left py-3 px-4">Slip Number</th>
                        <th className="text-left py-3 px-4">Deposit Date</th>
                        <th className="text-left py-3 px-4">Total Amount</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.deposits.map(d => (
                        <tr key={d.id} className="border-b">
                          <td className="py-3 px-4 font-semibold">{d.admin_name}</td>
                          <td className="py-3 px-4">{d.bank_name}</td>
                          <td className="py-3 px-4 font-mono">{d.deposit_slip_number}</td>
                          <td className="py-3 px-4">{new Date(d.deposit_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-bold text-emerald-600">₹{d.deposit_amount}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${d.status === 'approved' ? 'bg-green-100 text-green-700' : d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{d.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
