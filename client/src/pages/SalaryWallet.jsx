import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { 
  Wallet, DollarSign, ArrowUpRight, Send, CheckCircle, XCircle, 
  Settings2, ShieldAlert, Users, Award, Lock, Unlock, Shield,
  CreditCard, Info, PlusCircle, MinusCircle, RefreshCw, Key
} from 'lucide-react';

export default function SalaryWallet() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('wallet'); // wallet, withdrawal_requests, commission_matrix, wallet_control
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login/staff');
    } else if (isAuthenticated === true && user && !['master', 'admin', 'staff', 'technician'].includes(user.role)) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Employee Wallet States
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [aggregates, setAggregates] = useState({});
  
  // Withdrawal Form States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

  // Master: Pending Withdrawals & Employees
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Control Panel States
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [controlAction, setControlAction] = useState('bonus'); // bonus, incentive, fine, advance, lock, unlock, freeze, resume
  const [controlAmount, setControlAmount] = useState('');
  const [controlReason, setControlReason] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Commission Setting States
  const [editCommissionEmp, setEditCommissionEmp] = useState(null);
  const [commRepair, setCommRepair] = useState('');
  const [commAccessory, setCommAccessory] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    loadWalletData();
  }, [isAuthenticated, activeTab]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      if (user?.role !== 'master') {
        // Load personal employee wallet details
        const res = await api.get('/collection/salary-wallet');
        if (res.success) {
          setWallet(res.wallet);
          setWithdrawals(res.withdrawals || []);
          setLedger(res.ledger || []);
          setAggregates(res.aggregates || {});
        }
      }

      if (user?.role === 'master') {
        if (activeTab === 'wallet' || activeTab === 'withdrawal_requests') {
          // Load all withdrawals for approval
          const resWr = await api.get('/collection/master/withdrawals');
          if (resWr.success) setPendingWithdrawals(resWr.withdrawals);
        }
        if (activeTab === 'commission_matrix' || activeTab === 'wallet_control') {
          // Load all employees with their commission/wallet info
          const resEmp = await api.get('/collection/master/commissions');
          if (resEmp.success) setEmployees(resEmp.employees);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Withdrawal Request (Employee)
  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      return showToast('Please enter a valid amount', 'error');
    }
    if (wallet && Number(withdrawAmount) > wallet.balance) {
      return showToast('Insufficient wallet balance', 'error');
    }

    try {
      const res = await api.post('/collection/withdraw', {
        amount: Number(withdrawAmount),
        bank_account: withdrawBank,
        upi_id: withdrawUpi,
        reason: withdrawReason
      });
      if (res.success) {
        showToast('Withdrawal request submitted! Waiting for Master approval.');
        setWithdrawAmount('');
        setWithdrawBank('');
        setWithdrawUpi('');
        setWithdrawReason('');
        loadWalletData();
      } else {
        showToast(res.message || 'Withdrawal failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Master: Approve / Reject Withdrawal Request
  const handleProcessWithdrawal = async (id, action) => {
    let reason = '';
    if (action === 'reject') {
      reason = prompt('Enter withdrawal rejection reason:');
      if (reason === null) return;
      if (!reason.trim()) return showToast('Rejection reason is required', 'error');
    } else {
      if (!confirm('Approve this withdrawal? Amount will enter 2-days processing period.')) return;
    }

    try {
      const res = await api.post(`/collection/master/withdraw/${id}/approve`, { action, reason });
      if (res.success) {
        showToast(action === 'approve' ? 'Withdrawal approved (2-days processing)' : 'Withdrawal request rejected');
        loadWalletData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Master: Confirm payment made (Shift status to Paid)
  const handleConfirmPaid = async (id) => {
    if (!confirm('Confirm you have physically sent the money and want to mark this as Paid?')) return;
    try {
      const res = await api.post(`/collection/master/withdraw/${id}/pay`);
      if (res.success) {
        showToast('Withdrawal request marked as Paid successfully!');
        loadWalletData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  // Master: Save Commission Settings
  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!editCommissionEmp) return;
    try {
      const res = await api.post('/collection/master/commissions', {
        user_id: editCommissionEmp.id,
        user_role: editCommissionEmp.role,
        repair_commission: Number(commRepair),
        accessories_commission: Number(commAccessory)
      });
      if (res.success) {
        showToast('Commission settings updated!');
        setEditCommissionEmp(null);
        loadWalletData();
      } else {
        showToast(res.message || 'Failed to update commission', 'error');
      }
    } catch (err) {
      showToast('Error updating commission settings', 'error');
    }
  };

  // Master: Wallet adjustment controls (Bonus, Fine, Lock, Freeze)
  const handleWalletControl = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return showToast('Please select an employee', 'error');
    
    if (['bonus', 'incentive', 'fine', 'advance'].includes(controlAction) && !controlAmount) {
      return showToast('Amount is required', 'error');
    }

    try {
      const res = await api.post('/collection/master/wallet-control', {
        user_id: selectedEmp.id,
        user_role: selectedEmp.role,
        action: controlAction,
        amount: Number(controlAmount || 0),
        reason: controlReason
      });

      if (res.success) {
        showToast('Wallet action processed successfully!');
        setControlAmount('');
        setControlReason('');
        setSelectedEmp(null);
        loadWalletData();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Navbar />
      <ToastContainer />

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Title and stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-8 h-8 text-emerald-600" /> Salary Wallet & Commission
            </h1>
            <p className="text-gray-500 mt-1">Manage employee earnings, withdrawals, and auto commission configurations</p>
          </div>
          
          {user?.role === 'master' && (
            <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl shadow border">
              <button onClick={() => setActiveTab('wallet')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'wallet' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Withdrawals Panel
              </button>
              <button onClick={() => setActiveTab('commission_matrix')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'commission_matrix' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Commissions Matrix
              </button>
              <button onClick={() => setActiveTab('wallet_control')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'wallet_control' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Wallet Adjustments
              </button>
            </div>
          )}
        </div>

        {/* EMPLOYEE VIEW: WALLET CARD AND WITHDRAWAL FORM */}
        {user?.role !== 'master' && wallet && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Wallet Overview & Ledger */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Wallet Card */}
              <div className="card bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 shadow-xl rounded-3xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                  <Wallet className="w-64 h-64" />
                </div>
                
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-100 font-semibold">Salary Wallet Balance</p>
                    <p className="text-4xl font-black mt-1">₹{wallet.balance}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${wallet.status === 'active' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}`}>
                    {wallet.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
                  <div>
                    <span className="block text-emerald-100 text-xs">Pending Processing</span>
                    <span className="font-bold text-lg">₹{wallet.pending_salary}</span>
                  </div>
                  <div>
                    <span className="block text-emerald-100 text-xs">Lifetime Paid Salary</span>
                    <span className="font-bold text-lg">₹{wallet.paid_salary}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Grid */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 text-sm mb-4 border-b pb-2">Earnings & Deductions Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="block text-emerald-800 font-semibold uppercase">Repair Commission</span>
                    <span className="font-bold text-emerald-955 text-sm mt-1 block">₹{aggregates.total_repair_commission || '0.00'}</span>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="block text-blue-800 font-semibold uppercase">Accessories Commission</span>
                    <span className="font-bold text-blue-955 text-sm mt-1 block">₹{aggregates.total_accessories_commission || '0.00'}</span>
                  </div>
                  <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                    <span className="block text-teal-800 font-semibold uppercase">Bonus Added</span>
                    <span className="font-bold text-teal-955 text-sm mt-1 block">₹{aggregates.total_bonus || '0.00'}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="block text-indigo-800 font-semibold uppercase">Incentives Added</span>
                    <span className="font-bold text-indigo-955 text-sm mt-1 block">₹{aggregates.total_incentive || '0.00'}</span>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="block text-red-800 font-semibold uppercase">Fine Deductions</span>
                    <span className="font-bold text-red-955 text-sm mt-1 block">₹{aggregates.total_fine || '0.00'}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <span className="block text-amber-800 font-semibold uppercase">Advance Deductions</span>
                    <span className="font-bold text-amber-955 text-sm mt-1 block">₹{aggregates.total_advance || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Ledger */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-1.5"><CreditCard className="w-5 h-5 text-emerald-600" /> Wallet Ledger & History</h3>
                
                {ledger.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No transaction logs available.</p>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {ledger.map(log => (
                      <div key={log.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 transition">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{log.description}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right ml-4">
                          <span className={`font-black text-sm ${log.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {log.type === 'credit' ? '+' : '-'} ₹{log.amount}
                          </span>
                          <span className="block text-[9px] bg-gray-100 text-gray-600 rounded px-1 w-max ml-auto mt-1 capitalize font-bold">{log.reference_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Withdrawal Form & Statuses */}
            <div className="space-y-6">
              
              {/* Withdrawal Request Form */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-1.5"><Send className="w-5 h-5 text-emerald-600" /> Request Withdrawal</h3>
                
                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Withdraw Amount (₹) *</label>
                    <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" className="input text-lg font-bold" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Bank Account Details</label>
                    <textarea value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)} placeholder="Bank Name, A/C No, IFSC" className="input py-2 text-sm min-h-[60px]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">UPI Address (e.g. PhonePe/GPay)</label>
                    <input value={withdrawUpi} onChange={e => setWithdrawUpi(e.target.value)} placeholder="name@upi" className="input py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Reason / Notes</label>
                    <input value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} placeholder="Emergency, Monthly Salary, etc." className="input py-2 text-sm" />
                  </div>

                  <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5 shadow-sm text-sm" disabled={wallet.status !== 'active'}>
                    <ArrowUpRight className="w-4 h-4" /> Submit Withdrawal Request
                  </button>
                </form>
              </div>

              {/* Personal Withdrawal Requests Status */}
              <div className="card bg-white p-6 shadow-md border rounded-2xl">
                <h3 className="font-bold text-gray-800 text-sm mb-4 border-b pb-2">Active Requests</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {withdrawals.slice(0, 10).map(w => (
                    <div key={w.id} className="flex justify-between items-center text-xs p-2 border-b last:border-b-0">
                      <div>
                        <p className="font-semibold text-gray-800">₹{w.amount}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                          w.status === 'paid' ? 'bg-green-100 text-green-700' :
                          w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {w.status === 'processing' ? '2-Days Wait' : w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {withdrawals.length === 0 && <p className="text-gray-400 text-center py-4 text-xs">No withdrawal history.</p>}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* MASTER: PENDING WITHDRAWALS SECTION */}
        {user?.role === 'master' && activeTab === 'wallet' && (
          <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg">Employee Salary Withdrawals Panel</h2>
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">Pending Approval: {pendingWithdrawals.filter(w => w.status === 'pending').length}</span>
            </div>

            {pendingWithdrawals.length === 0 ? (
              <div className="p-8 text-center text-gray-400">All withdrawal requests are complete!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                      <th className="text-left py-3 px-4">Employee Details</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Payment Method</th>
                      <th className="text-left py-3 px-4">Withdraw Amount</th>
                      <th className="text-left py-3 px-4">Submission Date</th>
                      <th className="text-left py-3 px-4">Request Status</th>
                      <th className="text-center py-3 px-4">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.map(w => (
                      <tr key={w.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">{w.employee_name} <span className="block text-xs text-gray-400 font-mono">{w.employee_email}</span></td>
                        <td className="py-3 px-4 capitalize font-semibold">{w.user_role}</td>
                        <td className="py-3 px-4">
                          {w.upi_id && <span className="block font-medium">UPI: {w.upi_id}</span>}
                          {w.bank_account && <span className="block text-xs text-gray-500 font-mono">Bank: {w.bank_account}</span>}
                          <span className="block text-xs text-gray-400 italic">Reason: {w.reason || 'None'}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">₹{w.amount}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{new Date(w.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            w.status === 'paid' ? 'bg-green-100 text-green-700' :
                            w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {w.status === 'processing' ? '2-Days Wait' : w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            {w.status === 'pending' && (
                              <>
                                <button onClick={() => handleProcessWithdrawal(w.id, 'approve')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button onClick={() => handleProcessWithdrawal(w.id, 'reject')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}
                            {w.status === 'processing' && (
                              <button onClick={() => handleConfirmPaid(w.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                                <CreditCard className="w-3.5 h-3.5" /> Confirm Payment Paid
                              </button>
                            )}
                            {w.status === 'paid' && <span className="text-xs text-green-600 font-bold">Successfully Disbursed</span>}
                            {w.status === 'rejected' && <span className="text-xs text-red-600 font-bold">Rejected</span>}
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

        {/* MASTER: COMMISSIONS SETTINGS MATRIX */}
        {user?.role === 'master' && activeTab === 'commission_matrix' && (
          <div className="card bg-white shadow-md border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-1.5"><Award className="w-5 h-5 text-emerald-600" /> Employee Commission & Wallets</h2>
              
              {/* Search & Filter Controls */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Search by Name or ID..." 
                  className="input py-1.5 px-3 text-xs w-full sm:w-48"
                />
                <select 
                  value={filterRole} 
                  onChange={e => setFilterRole(e.target.value)} 
                  className="input py-1.5 px-3 text-xs"
                >
                  <option value="all">All Roles</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                    <th className="text-left py-3 px-4">Employee Name</th>
                    <th className="text-left py-3 px-4">Code ID</th>
                    <th className="text-left py-3 px-4">User Role</th>
                    <th className="text-left py-3 px-4">Repair Comm (₹)</th>
                    <th className="text-left py-3 px-4">Accessory Comm (₹)</th>
                    <th className="text-left py-3 px-4">Wallet Balance</th>
                    <th className="text-left py-3 px-4">Wallet status</th>
                    <th className="text-center py-3 px-4">Edit Configuration</th>
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(emp => {
                      const matchesSearch = 
                        (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (emp.code && emp.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
                      const matchesRole = filterRole === 'all' || emp.role === filterRole;
                      return matchesSearch && matchesRole;
                    })
                    .map(emp => (
                      <tr key={`${emp.role}-${emp.id}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">{emp.name} <span className="block text-xs text-gray-400 font-mono">{emp.email}</span></td>
                        <td className="py-3 px-4 font-mono text-xs">{emp.code}</td>
                        <td className="py-3 px-4 capitalize font-semibold">{emp.role}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">₹{emp.repair_commission || 0}</td>
                        <td className="py-3 px-4 font-bold text-blue-600">₹{emp.accessories_commission || 0}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">₹{emp.wallet_balance || '0.00'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            emp.wallet_status === 'frozen' ? 'bg-blue-100 text-blue-700' :
                            emp.wallet_status === 'locked' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {emp.wallet_status || 'active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => {
                            setEditCommissionEmp(emp);
                            setCommRepair(emp.repair_commission || '0');
                            setCommAccessory(emp.accessories_commission || '0');
                          }} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto">
                            <Settings2 className="w-3.5 h-3.5" /> Adjust Commission
                          </button>
                        </td>
                      </tr>
                    ))}
                  {employees.filter(emp => {
                    const matchesSearch = 
                      (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (emp.code && emp.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
                    const matchesRole = filterRole === 'all' || emp.role === filterRole;
                    return matchesSearch && matchesRole;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-400">No employees found matching filter</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MASTER: UPDATE COMMISSION DIALOG */}
        {editCommissionEmp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-1.5"><Settings2 className="w-5 h-5 text-indigo-600" /> Update Commission</h3>
              <p className="text-xs text-gray-400 mb-4 uppercase">Target: {editCommissionEmp.name} ({editCommissionEmp.role})</p>
              
              <form onSubmit={handleSaveCommission} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Repair Commission (₹) *</label>
                  <input type="number" value={commRepair} onChange={e => setCommRepair(e.target.value)} className="input font-bold" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessories Order Commission (₹) *</label>
                  <input type="number" value={commAccessory} onChange={e => setCommAccessory(e.target.value)} className="input font-bold" required />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary py-2 flex-1">Save Configuration</button>
                  <button type="button" onClick={() => setEditCommissionEmp(null)} className="btn-secondary py-2 flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MASTER: WALLET ADJUSTMENTS PANEL */}
        {user?.role === 'master' && activeTab === 'wallet_control' && (
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Left selector */}
            <div className="card bg-white p-6 shadow-md border rounded-2xl md:col-span-2">
              <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-1.5"><Settings2 className="w-5 h-5 text-emerald-600" /> Wallet Adjustments Panel</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                      <th className="text-left py-2 px-3">Employee</th>
                      <th className="text-left py-2 px-3">Role</th>
                      <th className="text-center py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={`${emp.role}-${emp.id}`} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedEmp?.id === emp.id && selectedEmp?.role === emp.role ? 'bg-emerald-50' : ''}`} onClick={() => setSelectedEmp(emp)}>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{emp.name} <span className="block text-[10px] text-gray-400">{emp.email}</span></td>
                        <td className="py-2.5 px-3 capitalize font-semibold">{emp.role}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button className={`px-2 py-1 rounded text-[10px] font-bold ${selectedEmp?.id === emp.id && selectedEmp?.role === emp.role ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {selectedEmp?.id === emp.id && selectedEmp?.role === emp.role ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Form Control */}
            <div className="card bg-white p-6 shadow-md border rounded-2xl space-y-4">
              <h3 className="font-bold text-gray-800 text-lg border-b pb-2 flex items-center gap-1.5"><ShieldAlert className="w-5 h-5 text-amber-600" /> Apply Adjustments</h3>
              
              {selectedEmp ? (
                <form onSubmit={handleWalletControl} className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-xl text-xs border">
                    <p className="font-semibold text-gray-700">Target Employee: {selectedEmp.name}</p>
                    <p className="text-gray-400 capitalize mt-0.5">Role: {selectedEmp.role}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Action *</label>
                    <select value={controlAction} onChange={e => setControlAction(e.target.value)} className="input text-sm">
                      <option value="bonus">💵 Credit Bonus</option>
                      <option value="incentive">🎖️ Credit Incentive</option>
                      <option value="manual_credit">➕ Manual Credit</option>
                      <option value="fine">🛑 Debit Fine</option>
                      <option value="advance">💸 Debit Advance</option>
                      <option value="lock">🔒 Lock Wallet</option>
                      <option value="unlock">🔓 Unlock Wallet</option>
                      <option value="freeze">❄️ Freeze Employee</option>
                      <option value="resume">☀️ Resume Employee</option>
                    </select>
                  </div>

                  {['bonus', 'incentive', 'fine', 'advance', 'manual_credit'].includes(controlAction) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                      <input type="number" min="0" value={controlAmount} onChange={e => setControlAmount(e.target.value)} placeholder="Enter amount" className="input font-bold" required />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes *</label>
                    <input value={controlReason} onChange={e => setControlReason(e.target.value)} placeholder="Specify reason" className="input text-sm" required />
                  </div>

                  <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5 shadow-sm">
                    {['lock', 'freeze'].includes(controlAction) ? <Lock className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    Apply Action
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center text-xs">
                  <Info className="w-8 h-8 opacity-40 mb-2" />
                  Select an employee from the table to apply adjustments (Incentive, Bonus, Lock, etc.).
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
