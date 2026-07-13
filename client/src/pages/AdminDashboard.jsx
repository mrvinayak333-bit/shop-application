import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wrench, Clock, CheckCircle, DollarSign, TrendingUp, Briefcase, Package, Percent, Award, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login/admin');
      return;
    }
    api.get('/admin/dashboard').then(res => {
      if (res.success) setData(res.stats);
      else showToast('Failed to load dashboard', 'error');
      setLoading(false);
    }).catch(() => { showToast('Failed to load dashboard', 'error'); setLoading(false); });
  }, [isAuthenticated, user, navigate]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const stats = data || {};
  const recentRepairs = stats.recentRepairs || [];

  const mainStats = [
    { icon: Wrench, label: 'Total Repairs', value: stats.totalRepairs || 0, color: 'bg-emerald-100 text-emerald-600', borderColor: 'border-emerald-200' },
    { icon: Clock, label: 'Pending Repairs', value: stats.pendingRepairs || 0, color: 'bg-amber-100 text-amber-600', borderColor: 'border-amber-200' },
    { icon: CheckCircle, label: 'Completed Repairs', value: stats.completedRepairs || 0, color: 'bg-green-100 text-green-600', borderColor: 'border-green-200' },
    { icon: Package, label: 'Pickup Requests', value: stats.pickupRequests || 0, color: 'bg-blue-100 text-blue-600', borderColor: 'border-blue-200' },
  ];

  const financialStats = [
    { icon: DollarSign, label: 'Total Revenue', value: '₹' + (stats.totalRevenue || 0).toLocaleString(), color: 'bg-purple-100 text-purple-600' },
    { icon: TrendingUp, label: 'Today Collection', value: '₹' + (stats.todayCollection || 0).toLocaleString(), color: 'bg-pink-100 text-pink-600' },
    { icon: BarChart3, label: 'Monthly Income', value: '₹' + (stats.monthlyIncome || 0).toLocaleString(), color: 'bg-indigo-100 text-indigo-600' },
  ];

  const commissionStats = [
    { icon: Percent, label: 'Cashback Report', value: '₹' + (stats.cashback || 0).toLocaleString(), color: 'bg-orange-100 text-orange-600' },
    { icon: Award, label: 'Commission Amount', value: '₹' + (stats.commission || 0).toLocaleString(), color: 'bg-teal-100 text-teal-600' },
    { icon: Users, label: 'Active Technicians', value: stats.activeTechs || 0, color: 'bg-cyan-100 text-cyan-600' },
    { icon: Users, label: 'Total Customers', value: stats.totalCustomers || 0, color: 'bg-violet-100 text-violet-600' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'financial', label: 'Financial' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={() => navigate('/admin/repair-control')}
            className="btn-primary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Repair Control
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Main Stats */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Repair Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mainStats.map((s, i) => (
                  <div key={i} className={`card border-l-4 ${s.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${s.color}`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Stats */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Financial Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financialStats.map((s, i) => (
                  <div key={i} className="card flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.color}`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-sm text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Repairs */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Recent Repairs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Tracking</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Device</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Technician</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRepairs.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono text-xs">{r.tracking_number}</td>
                        <td className="py-3 px-3">{r.brand} {r.device_type}</td>
                        <td className="py-3 px-3">{r.customer}</td>
                        <td className="py-3 px-3">{r.tech || 'Unassigned'}</td>
                        <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                        <td className="py-3 px-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentRepairs.length === 0 && <p className="text-center text-gray-400 py-8">No repairs yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Repair Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mainStats.map((s, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${s.borderColor} bg-gradient-to-br from-white to-gray-50`}>
                    <div className={`p-2 rounded-lg ${s.color} inline-block mb-3`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Completion Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.totalRepairs > 0 ? Math.round((stats.completedRepairs / stats.totalRepairs) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Pending Rate</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {stats.totalRepairs > 0 ? Math.round((stats.pendingRepairs / stats.totalRepairs) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Average Revenue per Repair</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{stats.totalRepairs > 0 ? Math.round(stats.totalRevenue / stats.totalRepairs) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Revenue Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financialStats.map((s, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-lg ${s.color}`}>
                        <s.icon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-sm text-gray-500">{s.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Commission & Cashback</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commissionStats.slice(0, 2).map((s, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-lg ${s.color}`}>
                        <s.icon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-sm text-gray-500">{s.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Financial Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-semibold text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Today's Collection</span>
                  <span className="font-semibold text-gray-900">₹{(stats.todayCollection || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Monthly Income</span>
                  <span className="font-semibold text-gray-900">₹{(stats.monthlyIncome || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Cashback</span>
                  <span className="font-semibold text-gray-900">₹{(stats.cashback || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Commission</span>
                  <span className="font-semibold text-gray-900">₹{(stats.commission || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Admin Performance Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {commissionStats.map((s, i) => (
                  <div key={i} className="card text-center">
                    <div className={`p-3 rounded-lg ${s.color} inline-block mb-2`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Performance Overview</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Repair Management</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Handled:</span>
                      <span className="ml-2 font-semibold">{stats.totalRepairs || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="ml-2 font-semibold text-green-600">{stats.completedRepairs || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">In Progress:</span>
                      <span className="ml-2 font-semibold text-amber-600">{stats.pendingRepairs || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Pickups:</span>
                      <span className="ml-2 font-semibold text-blue-600">{stats.pickupRequests || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Financial Performance</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Revenue:</span>
                      <span className="ml-2 font-semibold">₹{(stats.totalRevenue || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Today:</span>
                      <span className="ml-2 font-semibold">₹{(stats.todayCollection || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">This Month:</span>
                      <span className="ml-2 font-semibold">₹{(stats.monthlyIncome || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Commission:</span>
                      <span className="ml-2 font-semibold">₹{(stats.commission || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Team Management</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Active Technicians:</span>
                      <span className="ml-2 font-semibold">{stats.activeTechs || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Customers:</span>
                      <span className="ml-2 font-semibold">{stats.totalCustomers || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg. Revenue/Repair:</span>
                      <span className="ml-2 font-semibold">
                        ₹{stats.totalRepairs > 0 ? Math.round(stats.totalRevenue / stats.totalRepairs) : 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Completion Rate:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {stats.totalRepairs > 0 ? Math.round((stats.completedRepairs / stats.totalRepairs) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
