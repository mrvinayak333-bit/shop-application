import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Clock, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function CommissionDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [allCommissions, setAllCommissions] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('my'); // my, all (for admin)

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'technician')) {
      navigate('/');
      return;
    }
    loadData();
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/commission/dashboard');
      if (res?.success) {
        setDashboard(res);
      }
      
      // If admin, load all commissions
      if (user?.role === 'admin') {
        const allRes = await api.get('/transactions/commission/all');
        if (allRes?.success) setAllCommissions(allRes.commissions || []);
        
        const summaryRes = await api.get('/transactions/commission/summary');
        if (summaryRes?.success) setCommissionSummary(summaryRes.summary || []);
      }
    } catch (err) {
      console.error('Error:', err);
      showToast('Failed to load commission data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commissionId) => {
    try {
      const res = await api.put(`/transactions/commission/${commissionId}/approve`, {});
      if (res?.success) {
        showToast('Commission approved', 'success');
        loadData();
      }
    } catch (err) {
      showToast('Failed to approve', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const commissions = dashboard?.commissions || [];
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Commission Dashboard</h1>
          <p className="text-gray-600">Track your earnings and commission payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Commission</p>
                <p className="text-3xl font-bold text-yellow-600">₹{(summary.pending || 0).toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved Commission</p>
                <p className="text-3xl font-bold text-blue-600">₹{(summary.approved || 0).toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Paid Commission</p>
                <p className="text-3xl font-bold text-green-600">₹{(summary.paid || 0).toFixed(2)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Commission</p>
                <p className="text-3xl font-bold text-purple-600">₹{(summary.total || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setTab('my')}
            className={`pb-3 px-4 font-medium border-b-2 transition ${
              tab === 'my' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            My Transactions
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setTab('all')}
              className={`pb-3 px-4 font-medium border-b-2 transition ${
                tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              All Commissions
            </button>
          )}
        </div>

        {/* My Transactions Tab */}
        {tab === 'my' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No commissions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tax Deducted</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Net Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commissions.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{c.transaction_type}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{c.commission_amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">₹{(c.tax_deducted || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">₹{(c.net_amount || c.commission_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-800'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* All Commissions Tab (Admin Only) */}
        {tab === 'all' && user?.role === 'admin' && (
          <div>
            {/* Summary by User */}
            <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Commission Summary by User</h3>
              </div>
              {commissionSummary.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No commission data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Pending</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Paid</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commissionSummary.map(row => (
                        <tr key={`${row.user_id}-${row.user_role}`}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.user_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 capitalize">{row.user_role}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="font-semibold text-yellow-600">₹{row.pending_amount.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="font-semibold text-green-600">₹{row.paid_amount.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="font-bold text-gray-900">₹{row.total_amount.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* All Commissions Detail */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">All Commission Transactions</h3>
              </div>
              {allCommissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No commission transactions</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allCommissions.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{c.user_name}</td>
                          <td className="px-4 py-3 text-gray-600">{c.transaction_type}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">₹{c.commission_amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[c.status]}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
