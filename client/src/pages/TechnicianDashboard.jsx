import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, Clock, DollarSign, Wrench, TrendingUp, Award, Bell, BarChart3, Star, Package, AlertCircle, Users, FileText, Eye } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function TechnicianDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('awaiting');
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Auto-refresh for pending quotations
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        loadRepairs();
        loadData();
      }
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, filter]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login/technician'); return; }
    loadData();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadRepairs();
  }, [isAuthenticated, filter]);

  const loadData = async () => {
    try {
      const res = await api.get('/technician/dashboard');
      if (res.success) setData(res);
      else showToast('Failed to load dashboard', 'error');
      setLoading(false);
    } catch { showToast('Failed to load dashboard', 'error'); setLoading(false); }
  };

  const loadRepairs = async () => {
    try {
      const res = await api.get('/technician/my-repairs?filter=' + filter);
      if (res.success) setRepairs(res.repairs);
    } catch { console.error('Failed to load repairs'); }
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const tech = data?.tech || {};
  const stats = data?.stats || {};
  const recentRepairs = data?.recentRepairs || [];
  const notifications = data?.notifications || [];
  const commissionHistory = data?.commissionHistory || [];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'repairs', label: 'My Repairs' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'performance', label: 'Performance' },
  ];

  const mainStats = [
    { icon: Clock, label: 'Pending', value: stats.pending || 0, color: 'bg-amber-100 text-amber-600', border: 'border-amber-200' },
    { icon: Wrench, label: 'In Progress', value: stats.inProgress || 0, color: 'bg-blue-100 text-blue-600', border: 'border-blue-200' },
    { icon: CheckCircle, label: 'Completed', value: stats.completedJobs || 0, color: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200' },
    { icon: DollarSign, label: 'Commission', value: '₹' + (stats.commissionEarned || 0), color: 'bg-purple-100 text-purple-600', border: 'border-purple-200' },
  ];

  const completionRate = stats.completedJobs + stats.pending > 0 
    ? Math.round((stats.completedJobs / (stats.completedJobs + stats.pending)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Technician Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {tech.name || user?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tech.specialization || 'Technician'}</span>
              {tech.rating && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3" />{tech.rating}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">Today's Jobs</p>
              <p className="text-xl font-bold text-gray-900">{stats.completedToday || 0}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mainStats.map((s, i) => (
                <div key={i} className={`card border-l-4 ${s.border}`}>
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
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRepairs.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono text-xs">{r.tracking_number}</td>
                        <td className="py-3 px-3">{r.brand} {r.device_type}</td>
                        <td className="py-3 px-3">{r.customer_name}</td>
                        <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                        <td className="py-3 px-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3">
                          <Link to={`/technician/repair/${r.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentRepairs.length === 0 && <p className="text-center text-gray-400 py-8">No repairs assigned yet</p>}
              </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" /> Recent Notifications
                </h2>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-3 rounded-lg border-l-4 ${n.type === 'assignment' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'}`}>
                      <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                      <p className="text-gray-600 text-xs mt-1">{n.message}</p>
                      <p className="text-gray-400 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Repairs Tab */}
        {activeTab === 'repairs' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['awaiting', 'in-progress', 'completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {repairs.length === 0 ? (
                <div className="card text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No repairs found</p>
                </div>
              ) : (
                repairs.map(r => (
                  <Link key={r.id} to={`/technician/repair/${r.id}`} className="card hover:shadow-md transition-shadow block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Wrench className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{r.brand} {r.model}</p>
                          <p className="text-sm text-gray-500">{r.device_type} • {r.customer_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{r.tracking_number}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <StatusBadge status={r.status} />
                        {/* Quotation Status Badge */}
                        {['quotation_sent','customer_approved'].includes(r.status) && (
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                            r.status === 'customer_approved' ? 'bg-green-100 text-green-700' :
                            r.status === 'quotation_sent' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {r.status === 'customer_approved' ? '✓ Quotation Approved' : '⏳ Waiting Approval'}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Earnings</p>
                  </div>
                </div>
              </div>
              <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">₹{(stats.thisMonthEarnings || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">This Month</p>
                  </div>
                </div>
              </div>
              <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Award className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{tech.commission_percent || 0}%</p>
                    <p className="text-sm text-gray-500">Commission Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Commission History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Description</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionHistory.map((c, i) => (
                      <tr key={c.id || i} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3">{c.description || 'Commission'}</td>
                        <td className="py-3 px-3 font-semibold text-green-600">₹{c.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {commissionHistory.length === 0 && <p className="text-center text-gray-400 py-8">No commission history yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <div className="p-3 bg-blue-100 rounded-lg inline-block mb-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeJobs || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Active Jobs</p>
              </div>
              <div className="card text-center">
                <div className="p-3 bg-green-100 rounded-lg inline-block mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completedJobs || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Total Completed</p>
              </div>
              <div className="card text-center">
                <div className="p-3 bg-yellow-100 rounded-lg inline-block mb-2">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{tech.rating || 'N/A'}</p>
                <p className="text-sm text-gray-500 mt-1">Rating</p>
              </div>
              <div className="card text-center">
                <div className="p-3 bg-purple-100 rounded-lg inline-block mb-2">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Completion Rate</p>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Performance Overview</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Repair Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-600">Total Repairs:</span><span className="ml-2 font-semibold">{tech.total_repairs || 0}</span></div>
                    <div><span className="text-gray-600">Completed:</span><span className="ml-2 font-semibold text-green-600">{stats.completedJobs || 0}</span></div>
                    <div><span className="text-gray-600">In Progress:</span><span className="ml-2 font-semibold text-blue-600">{stats.inProgress || 0}</span></div>
                    <div><span className="text-gray-600">Pending:</span><span className="ml-2 font-semibold text-amber-600">{stats.pending || 0}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Earnings Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-600">Total Earnings:</span><span className="ml-2 font-semibold">₹{(stats.totalEarnings || 0).toLocaleString()}</span></div>
                    <div><span className="text-gray-600">This Month:</span><span className="ml-2 font-semibold">₹{(stats.thisMonthEarnings || 0).toLocaleString()}</span></div>
                    <div><span className="text-gray-600">Commission Rate:</span><span className="ml-2 font-semibold">{tech.commission_percent || 0}%</span></div>
                    <div><span className="text-gray-600">Today's Jobs:</span><span className="ml-2 font-semibold">{stats.completedToday || 0}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-600">Name:</span><span className="ml-2 font-semibold">{tech.name}</span></div>
                    <div><span className="text-gray-600">Email:</span><span className="ml-2 font-semibold">{tech.email}</span></div>
                    <div><span className="text-gray-600">Mobile:</span><span className="ml-2 font-semibold">{tech.mobile}</span></div>
                    <div><span className="text-gray-600">Specialization:</span><span className="ml-2 font-semibold">{tech.specialization}</span></div>
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
