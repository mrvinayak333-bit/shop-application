import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wrench, Clock, DollarSign, BookOpen, Briefcase, TrendingUp, Plus, Edit, Trash2, Lock, Unlock, Key, Eye, EyeOff, Search, Shield, UserCheck, Activity, Settings, ChevronRight, X, RefreshCw, Download, CreditCard, Image, Globe, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import RepairingCoursePurchase from '../components/RepairingCoursePurchase';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'technicians', label: 'Technicians', icon: Wrench },
  { id: 'students', label: 'Students', icon: BookOpen },
  { id: 'courses', label: 'Courses', icon: FileText },
  { id: 'repairing-course', label: 'Repairing Course', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'website', label: 'Website Settings', icon: Globe },
  { id: 'activity', label: 'Activity Logs', icon: Activity },
];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
}

function generateStaffId(prefix, num) {
  return `${prefix}-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
}

// Modal Component
function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function MasterDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [customerReport, setCustomerReport] = useState([]);
  const [adminReport, setAdminReport] = useState([]);
  const [incomeReport, setIncomeReport] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState({});
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'master') {
      navigate('/login/master');
      return;
    }
    loadDashboard();
  }, [isAuthenticated, user, navigate]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/dashboard');
      if (res.success) setData(res.stats);
    } catch (e) { showToast('Failed to load dashboard', 'error'); }
    setLoading(false);
  };

  const loadAdmins = async () => {
    const res = await api.get('/master/admins');
    if (res.success) setAdmins(res.admins);
  };

  const loadCustomers = async () => {
    const res = await api.get('/master/customers');
    if (res.success) setCustomers(res.customers);
  };

  const loadTechnicians = async () => {
    const res = await api.get('/master/technicians');
    if (res.success) setTechnicians(res.technicians);
  };

  const loadStudents = async () => {
    const res = await api.get('/master/students');
    if (res.success) setStudents(res.students);
  };

  const loadActivityLogs = async () => {
    const res = await api.get('/master/activity-logs?limit=200');
    if (res.success) setActivityLogs(res.logs);
  };

  const loadCustomerReport = async () => {
    const res = await api.get('/master/reports/customers');
    if (res.success) setCustomerReport(res.report);
  };

  const loadAdminReport = async () => {
    const res = await api.get('/master/reports/admin-performance');
    if (res.success) setAdminReport(res.report);
  };

  const loadIncomeReport = async () => {
    const res = await api.get('/master/reports/monthly-income');
    if (res.success) setIncomeReport(res.report);
  };

  const loadPaymentMethods = async () => {
    const res = await api.get('/master/payment-methods');
    if (res.success) setPaymentMethods(res.methods);
  };

  const loadWebsiteSettings = async () => {
    const res = await api.get('/master/website-settings');
    if (res.success) {
      const settings = {};
      res.settings.forEach(s => { settings[s.setting_key] = s.setting_value; });
      setWebsiteSettings(settings);
    }
  };

  const loadGallery = async () => {
    const res = await api.get('/master/gallery');
    if (res.success) setGalleryPhotos(res.photos);
  };

  const loadSliders = async () => {
    const res = await api.get('/master/sliders');
    if (res.success) setSliders(res.sliders);
  };

  useEffect(() => {
    if (activeTab === 'customers') loadCustomers();
    if (activeTab === 'admins') loadAdmins();
    if (activeTab === 'technicians') loadTechnicians();
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'courses') loadCourses();
    if (activeTab === 'reports') { loadCustomerReport(); loadAdminReport(); loadIncomeReport(); }
    if (activeTab === 'payments') loadPaymentMethods();
    if (activeTab === 'website') { loadWebsiteSettings(); loadGallery(); loadSliders(); }
    if (activeTab === 'activity') loadActivityLogs();
  }, [activeTab]);

  const loadCourses = async () => {
    const res = await api.get('/course/manage');
    if (res && res.success) setCourses(res.courses || []);
    else if (Array.isArray(res)) setCourses(res);
  };

  const handleSaveCourse = async (form) => {
    try {
      // Map form fields to existing master course endpoints at /api/course/manage
      const payload = {
        course_name: form.title,
        course_code: form.slug || '',
        description: form.description || '',
        duration: String(form.duration_days || ''),
        price: parseFloat(form.price || 0) || 0,
        status: form.published ? 'active' : 'inactive'
      };

      let courseId = editItem ? editItem.id : null;
      if (editItem) {
        const res = await api.put(`/course/manage/${courseId}`, payload);
        if (!res.success) { showToast(res.message || 'Failed to update', 'error'); return; }
      } else {
        const res = await api.post('/course/manage', payload);
        if (!res.success) { showToast(res.message || 'Failed to create', 'error'); return; }
        courseId = res.courseId || res.insertId;
      }

      // If videos provided, create them
      if (form.videos && Array.isArray(form.videos) && form.videos.length && courseId) {
        for (const v of form.videos) {
          if (!v.url) continue;
          try { await api.post(`/course/manage/${courseId}/video`, { title: v.title || '', video_url: v.url, duration: v.duration || 0, description: v.description || '' }); } catch (e) { console.error('Video add error', e); }
        }
      }

      // If materials provided (files), upload them
      if (form.materials && Array.isArray(form.materials) && form.materials.length && courseId) {
        for (const m of form.materials) {
          if (!m.file) continue;
          try {
            const fd = new FormData();
            fd.append('file', m.file);
            fd.append('title', m.title || m.file.name);
            fd.append('description', m.description || '');
            await api.upload(`/course/manage/${courseId}/material`, fd);
          } catch (e) { console.error('Material upload error', e); }
        }
      }

      showToast(editItem ? 'Course updated' : 'Course created');
      loadCourses();
      setModalOpen(false);
    } catch (e) { console.error(e); showToast('Server error', 'error'); }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return;
    const res = await api.delete(`/course/manage/${id}`);
    if (res.success) { showToast('Course deleted'); loadCourses(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleTogglePublished = async (c) => {
    const payload = {
      course_name: c.title,
      course_code: c.slug || '',
      description: c.description || '',
      duration: String(c.duration_days || ''),
      price: c.price || 0,
      status: c.published ? 'inactive' : 'active'
    };
    const res = await api.put(`/course/manage/${c.id}`, payload);
    if (res.success) loadCourses(); else showToast(res.message || 'Failed', 'error');
  };

  const openCreateModal = (type) => { setModalType(type); setEditItem(null); setModalOpen(true); };
  const openEditModal = (type, item) => { setModalType(type); setEditItem(item); setModalOpen(true); };

  // CUSTOMER MANAGEMENT
  const handleToggleCustomerStatus = async (customer) => {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/master/customers/${customer.id}`, { status: newStatus });
    if (res.success) { showToast(`Customer ${newStatus === 'active' ? 'unlocked' : 'locked'}`); loadCustomers(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleResetCustomerPassword = async (id) => {
    const newPass = generatePassword();
    if (!confirm(`Reset password to: ${newPass}\n\nShare this password with the customer securely.`)) return;
    const res = await api.put(`/master/customers/${id}`, { password: newPass });
    if (res.success) showToast('Password reset successfully');
    else showToast(res.message || 'Error', 'error');
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Delete this customer? This action cannot be undone.')) return;
    const res = await api.delete(`/master/customers/${id}`);
    if (res.success) { showToast('Customer deleted'); loadCustomers(); }
    else showToast(res.message || 'Error', 'error');
  };

  // ADMIN CRUD
  const handleSaveAdmin = async (formData) => {
    if (editItem) {
      const res = await api.put(`/master/admins/${editItem.id}`, formData);
      if (res.success) { showToast('Admin updated!'); loadAdmins(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    } else {
      const res = await api.post('/master/admins', formData);
      if (res.success) { showToast('Admin created! ID: ' + res.admin?.id); loadAdmins(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!confirm('Delete this admin?')) return;
    const res = await api.delete(`/master/admins/${id}`);
    if (res.success) { showToast('Admin deleted'); loadAdmins(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleToggleAdminStatus = async (admin) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/master/admins/${admin.id}`, { ...admin, status: newStatus });
    if (res.success) { showToast(`Admin ${newStatus === 'active' ? 'unlocked' : 'locked'}`); loadAdmins(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleResetAdminPassword = async (id) => {
    const newPass = generatePassword();
    if (!confirm(`Reset password to: ${newPass}\n\nShare this password with the admin securely.`)) return;
    const res = await api.put(`/master/admins/${id}`, { password: newPass });
    if (res.success) showToast('Password reset successfully');
    else showToast(res.message || 'Error', 'error');
  };

  // TECHNICIAN CRUD
  const handleSaveTechnician = async (formData) => {
    if (editItem) {
      const res = await api.put(`/master/technicians/${editItem.id}`, formData);
      if (res.success) { showToast('Technician updated!'); loadTechnicians(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    } else {
      const res = await api.post('/master/technicians', formData);
      if (res.success) { showToast('Technician created!'); loadTechnicians(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    }
  };

  const handleDeleteTechnician = async (id) => {
    if (!confirm('Delete this technician?')) return;
    const res = await api.delete(`/master/technicians/${id}`);
    if (res.success) { showToast('Technician deleted'); loadTechnicians(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleToggleTechStatus = async (tech) => {
    const newStatus = tech.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/master/technicians/${tech.id}`, { ...tech, status: newStatus });
    if (res.success) { showToast(`Technician ${newStatus === 'active' ? 'unlocked' : 'locked'}`); loadTechnicians(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleResetTechPassword = async (id) => {
    const newPass = generatePassword();
    if (!confirm(`Reset password to: ${newPass}`)) return;
    const res = await api.put(`/master/technicians/${id}`, { password: newPass });
    if (res.success) showToast('Password reset successfully');
    else showToast(res.message || 'Error', 'error');
  };

  // STUDENT CRUD
  const handleSaveStudent = async (formData) => {
    if (editItem) {
      const res = await api.put(`/master/students/${editItem.id}`, formData);
      if (res.success) { showToast('Student updated!'); loadStudents(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    } else {
      const res = await api.post('/master/students', formData);
      if (res.success) { showToast('Student created!'); loadStudents(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Delete this student?')) return;
    const res = await api.delete(`/master/students/${id}`);
    if (res.success) { showToast('Student deleted'); loadStudents(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleToggleStudentStatus = async (student) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/master/students/${student.id}`, { ...student, status: newStatus });
    if (res.success) { showToast(`Student ${newStatus === 'active' ? 'unlocked' : 'locked'}`); loadStudents(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleResetStudentPassword = async (id) => {
    const newPass = generatePassword();
    if (!confirm(`Reset password to: ${newPass}`)) return;
    const res = await api.put(`/master/students/${id}`, { password: newPass });
    if (res.success) showToast('Password reset successfully');
    else showToast(res.message || 'Error', 'error');
  };

  // PAYMENT METHODS CRUD
  const handleSavePaymentMethod = async (formData) => {
    if (editItem) {
      const res = await api.put(`/master/payment-methods/${editItem.id}`, formData);
      if (res.success) { showToast('Payment method updated!'); loadPaymentMethods(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    } else {
      const res = await api.post('/master/payment-methods', formData);
      if (res.success) { showToast('Payment method added!'); loadPaymentMethods(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    }
  };

  const handleDeletePaymentMethod = async (id) => {
    if (!confirm('Delete this payment method?')) return;
    const res = await api.delete(`/master/payment-methods/${id}`);
    if (res.success) { showToast('Payment method deleted'); loadPaymentMethods(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleTogglePaymentMethod = async (method) => {
    const newStatus = method.is_active ? 0 : 1;
    const res = await api.put(`/master/payment-methods/${method.id}`, { ...method, is_active: newStatus });
    if (res.success) { showToast(`Payment method ${newStatus ? 'enabled' : 'disabled'}`); loadPaymentMethods(); }
    else showToast(res.message || 'Error', 'error');
  };

  // WEBSITE SETTINGS
  const handleSaveWebsiteSetting = async (key, value) => {
    const res = await api.put('/master/website-settings', { key, value });
    if (res.success) { showToast('Setting updated!'); loadWebsiteSettings(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleUploadGalleryPhoto = async (formData) => {
    const res = await api.upload('/master/gallery', formData);
    if (res.success) { showToast('Photo uploaded!'); loadGallery(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleDeleteGalleryPhoto = async (id) => {
    if (!confirm('Delete this photo?')) return;
    const res = await api.delete(`/master/gallery/${id}`);
    if (res.success) { showToast('Photo deleted'); loadGallery(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleUploadSlider = async (formData) => {
    const res = await api.upload('/master/sliders', formData);
    if (res.success) { showToast('Slider uploaded!'); loadSliders(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleDeleteSlider = async (id) => {
    if (!confirm('Delete this slider?')) return;
    const res = await api.delete(`/master/sliders/${id}`);
    if (res.success) { showToast('Slider deleted'); loadSliders(); }
    else showToast(res.message || 'Error', 'error');
  };

  // DOWNLOAD REPORTS
  const downloadCSV = (data, filename) => {
    if (!data.length) return showToast('No data to download', 'error');
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded!');
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const stats = data || {};
  const recentRepairs = stats.recentRepairs || [];

  const statCards = [
    { icon: Users, label: 'Customers', value: stats.totalCustomers || 0, color: 'bg-blue-100 text-blue-600' },
    { icon: Briefcase, label: 'Technicians', value: stats.totalTechnicians || 0, color: 'bg-indigo-100 text-indigo-600' },
    { icon: BookOpen, label: 'Students', value: stats.totalStudents || 0, color: 'bg-purple-100 text-purple-600' },
    { icon: Wrench, label: 'Total Repairs', value: stats.totalRepairs || 0, color: 'bg-emerald-100 text-emerald-600' },
    { icon: Clock, label: 'Pending', value: stats.pendingRepairs || 0, color: 'bg-amber-100 text-amber-600' },
    { icon: DollarSign, label: 'Revenue', value: '₹' + (stats.totalRevenue || 0), color: 'bg-green-100 text-green-600' },
    { icon: TrendingUp, label: 'Courses', value: stats.totalCourses || 0, color: 'bg-pink-100 text-pink-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Control Panel</h1>
            <p className="text-gray-500 text-sm">Full system administration — Welcome, {user?.name}</p>
          </div>
          <button onClick={loadDashboard} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"><RefreshCw className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto bg-white rounded-xl shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              {statCards.map((s, i) => (
                <div key={i} className="card flex flex-col items-center text-center">
                  <div className={`p-2 rounded-lg ${s.color} mb-2`}><s.icon className="w-5 h-5" /></div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Recent Repairs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 px-2">Tracking</th>
                    <th className="text-left py-2 px-2">Device</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Date</th>
                  </tr></thead>
                  <tbody>
                    {recentRepairs.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs">{r.tracking_number}</td>
                        <td className="py-2 px-2">{r.brand} {r.device_type}</td>
                        <td className="py-2 px-2">{r.customer_name}</td>
                        <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                        <td className="py-2 px-2 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentRepairs.length === 0 && <p className="text-center text-gray-400 py-8">No repairs yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search customers..." className="input pl-9 py-2 text-sm" />
              </div>
              <div className="text-sm text-gray-600">Total: {customers.length} customers</div>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Mobile</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">City</th>
                  <th className="text-left py-2 px-2">Repairs</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Joined</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {customers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm) || c.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">{c.id}</td>
                      <td className="py-2 px-2 font-medium">{c.name}</td>
                      <td className="py-2 px-2">{c.mobile || 'N/A'}</td>
                      <td className="py-2 px-2 text-gray-600">{c.email || 'N/A'}</td>
                      <td className="py-2 px-2">{c.city || 'N/A'}</td>
                      <td className="py-2 px-2">{c.total_repairs || 0}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleCustomerStatus(c)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={c.status === 'active' ? 'Lock' : 'Unlock'}>
                            {c.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleResetCustomerPassword(c.id)} className="p-1.5 hover:bg-purple-50 rounded text-purple-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCustomer(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && <p className="text-center text-gray-400 py-8">No customers found</p>}
            </div>
          </div>
        )}

        {/* ADMINS TAB */}
        {activeTab === 'admins' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search admins..." className="input pl-9 py-2 text-sm" />
              </div>
              <button onClick={() => openCreateModal('admin')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Admin</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Mobile</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Last Login</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {admins.filter(a => a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">{a.id}</td>
                      <td className="py-2 px-2 font-medium">{a.name}</td>
                      <td className="py-2 px-2 text-gray-600">{a.email}</td>
                      <td className="py-2 px-2">{a.mobile || 'N/A'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-500">{a.last_login ? new Date(a.last_login).toLocaleString() : 'Never'}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('admin', a)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleAdminStatus(a)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={a.status === 'active' ? 'Lock' : 'Unlock'}>
                            {a.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleResetAdminPassword(a.id)} className="p-1.5 hover:bg-purple-50 rounded text-purple-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteAdmin(a.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {admins.length === 0 && <p className="text-center text-gray-400 py-8">No admins found</p>}
            </div>
          </div>
        )}

        {/* TECHNICIANS TAB */}
        {activeTab === 'technicians' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search technicians..." className="input pl-9 py-2 text-sm" />
              </div>
              <button onClick={() => openCreateModal('technician')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Technician</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Mobile</th>
                  <th className="text-left py-2 px-2">Specialization</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Repairs</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {technicians.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">{t.id}</td>
                      <td className="py-2 px-2 font-medium">{t.name}</td>
                      <td className="py-2 px-2 text-gray-600">{t.email}</td>
                      <td className="py-2 px-2">{t.mobile || 'N/A'}</td>
                      <td className="py-2 px-2">{t.specialization || 'General'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
                      </td>
                      <td className="py-2 px-2">{t.total_repairs || 0}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('technician', t)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleTechStatus(t)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={t.status === 'active' ? 'Lock' : 'Unlock'}>
                            {t.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleResetTechPassword(t.id)} className="p-1.5 hover:bg-purple-50 rounded text-purple-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteTechnician(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {technicians.length === 0 && <p className="text-center text-gray-400 py-8">No technicians found</p>}
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search students..." className="input pl-9 py-2 text-sm" />
              </div>
              <button onClick={() => openCreateModal('student')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Student</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">Student ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Mobile</th>
                  <th className="text-left py-2 px-2">Course</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs font-medium">{s.student_id}</td>
                      <td className="py-2 px-2">{s.name}</td>
                      <td className="py-2 px-2 text-gray-600">{s.email || 'N/A'}</td>
                      <td className="py-2 px-2">{s.mobile || 'N/A'}</td>
                      <td className="py-2 px-2">{s.course || 'N/A'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('student', s)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleStudentStatus(s)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={s.status === 'active' ? 'Lock' : 'Unlock'}>
                            {s.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleResetStudentPassword(s.id)} className="p-1.5 hover:bg-purple-50 rounded text-purple-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && <p className="text-center text-gray-400 py-8">No students found</p>}
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search courses..." className="input pl-9 py-2 text-sm" />
              </div>
              <button onClick={() => openCreateModal('course')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Course</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Title</th>
                  <th className="text-left py-2 px-2">Price</th>
                  <th className="text-left py-2 px-2">Free</th>
                  <th className="text-left py-2 px-2">Days</th>
                  <th className="text-left py-2 px-2">Published</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {courses.filter(c => c.title?.toLowerCase().includes(searchTerm.toLowerCase()) || String(c.id) === searchTerm).map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">{c.id}</td>
                      <td className="py-2 px-2 font-medium">{c.title}</td>
                      <td className="py-2 px-2">{c.is_free ? 'Free' : `₹${parseFloat(c.price||0).toFixed(2)}`}</td>
                      <td className="py-2 px-2">{c.is_free ? 'Yes' : 'No'}</td>
                      <td className="py-2 px-2">{c.duration_days || 0}</td>
                      <td className="py-2 px-2">{c.published ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Published</span> : <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Draft</span>}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('course', c)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleTogglePublished(c)} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600" title={c.published ? 'Unpublish' : 'Publish'}>
                            {c.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteCourse(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {courses.length === 0 && <p className="text-center text-gray-400 py-8">No courses found</p>}
            </div>
          </div>
        )}

        {/* REPAIRING COURSE PURCHASE TAB */}
        {activeTab === 'repairing-course' && (
          <RepairingCoursePurchase />
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Customer Report</h2>
                <button onClick={() => downloadCSV(customerReport, 'customer_report.csv')} className="btn-primary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Download CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 px-2">ID</th>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Mobile</th>
                    <th className="text-left py-2 px-2">City</th>
                    <th className="text-left py-2 px-2">Repairs</th>
                    <th className="text-left py-2 px-2">Total Spent</th>
                  </tr></thead>
                  <tbody>
                    {customerReport.map((c, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs">{c.id}</td>
                        <td className="py-2 px-2">{c.name}</td>
                        <td className="py-2 px-2">{c.mobile || 'N/A'}</td>
                        <td className="py-2 px-2">{c.city || 'N/A'}</td>
                        <td className="py-2 px-2">{c.repair_count || 0}</td>
                        <td className="py-2 px-2">₹{c.total_spent || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customerReport.length === 0 && <p className="text-center text-gray-400 py-8">No customer data</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Admin Performance Report</h2>
                <button onClick={() => downloadCSV(adminReport, 'admin_performance.csv')} className="btn-primary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Download CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 px-2">ID</th>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Repairs Managed</th>
                    <th className="text-left py-2 px-2">Revenue Generated</th>
                  </tr></thead>
                  <tbody>
                    {adminReport.map((a, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs">{a.id}</td>
                        <td className="py-2 px-2">{a.name}</td>
                        <td className="py-2 px-2">{a.email}</td>
                        <td className="py-2 px-2"><span className={`text-xs px-2 py-1 rounded-full ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span></td>
                        <td className="py-2 px-2">{a.total_repairs_managed || 0}</td>
                        <td className="py-2 px-2">₹{a.revenue_generated || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminReport.length === 0 && <p className="text-center text-gray-400 py-8">No admin data</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Monthly Income Report - {new Date().getFullYear()}</h2>
                <button onClick={() => downloadCSV(incomeReport, 'monthly_income.csv')} className="btn-primary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Download CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 px-2">Month</th>
                    <th className="text-left py-2 px-2">Invoices</th>
                    <th className="text-left py-2 px-2">Total Income</th>
                    <th className="text-left py-2 px-2">Cash</th>
                    <th className="text-left py-2 px-2">UPI</th>
                    <th className="text-left py-2 px-2">Card</th>
                  </tr></thead>
                  <tbody>
                    {incomeReport.map((m, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{new Date(2000, m.month - 1).toLocaleString('default', { month: 'long' })}</td>
                        <td className="py-2 px-2">{m.total_invoices}</td>
                        <td className="py-2 px-2 font-semibold">₹{m.total_income}</td>
                        <td className="py-2 px-2">₹{m.cash_income}</td>
                        <td className="py-2 px-2">₹{m.upi_income}</td>
                        <td className="py-2 px-2">₹{m.card_income}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {incomeReport.length === 0 && <p className="text-center text-gray-400 py-8">No income data for this year</p>}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT METHODS TAB */}
        {activeTab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Payment Methods</h2>
              <button onClick={() => openCreateModal('payment')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Payment Method</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">UPI ID</th>
                  <th className="text-left py-2 px-2">Bank Account</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {paymentMethods.map((m, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">{m.id}</td>
                      <td className="py-2 px-2 font-medium">{m.name}</td>
                      <td className="py-2 px-2"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{m.type}</span></td>
                      <td className="py-2 px-2">{m.upi_id || 'N/A'}</td>
                      <td className="py-2 px-2">{m.bank_account || 'N/A'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('payment', m)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleTogglePaymentMethod(m)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={m.is_active ? 'Disable' : 'Enable'}>
                            {m.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeletePaymentMethod(m.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paymentMethods.length === 0 && <p className="text-center text-gray-400 py-8">No payment methods configured</p>}
            </div>
          </div>
        )}

        {/* WEBSITE SETTINGS TAB */}
        {activeTab === 'website' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">General Website Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <input value={websiteSettings.company_name || ''} onChange={e => handleSaveWebsiteSetting('company_name', e.target.value)} className="input" placeholder="SHREE RAAM MOBILE" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <input value={websiteSettings.contact_phone || ''} onChange={e => handleSaveWebsiteSetting('contact_phone', e.target.value)} className="input" placeholder="+91 95522 10333" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <input value={websiteSettings.contact_email || ''} onChange={e => handleSaveWebsiteSetting('contact_email', e.target.value)} className="input" placeholder="info@shreeraammobile.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea value={websiteSettings.address || ''} onChange={e => handleSaveWebsiteSetting('address', e.target.value)} className="input" rows="2" placeholder="Solapur, Maharashtra" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input value={websiteSettings.whatsapp || ''} onChange={e => handleSaveWebsiteSetting('whatsapp', e.target.value)} className="input" placeholder="919552210333" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Gallery Photos</h2>
                <label className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                  <Plus className="w-4 h-4" /> Upload Photo
                  <input type="file" accept="image/*" onChange={e => { const fd = new FormData(); fd.append('photo', e.target.files[0]); fd.append('title', 'Gallery Photo'); handleUploadGalleryPhoto(fd); }} className="hidden" />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryPhotos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo.photo_path} alt={photo.title} className="w-full h-32 object-cover rounded-lg" />
                    <button onClick={() => handleDeleteGalleryPhoto(photo.id)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {galleryPhotos.length === 0 && <p className="text-center text-gray-400 py-8">No gallery photos</p>}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Slider Images</h2>
                <label className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                  <Plus className="w-4 h-4" /> Upload Slider
                  <input type="file" accept="image/*" onChange={e => { const fd = new FormData(); fd.append('image', e.target.files[0]); fd.append('title', 'Slider Image'); fd.append('display_order', sliders.length); handleUploadSlider(fd); }} className="hidden" />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sliders.map((slider, i) => (
                  <div key={i} className="relative group">
                    <img src={slider.image_path} alt={slider.title} className="w-full h-48 object-cover rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 rounded-b-lg">
                      <p className="text-sm font-medium">{slider.title}</p>
                      <p className="text-xs">{slider.subtitle}</p>
                    </div>
                    <button onClick={() => handleDeleteSlider(slider.id)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {sliders.length === 0 && <p className="text-center text-gray-400 py-8">No slider images</p>}
            </div>
          </div>
        )}

        {/* ACTIVITY LOGS TAB */}
        {activeTab === 'activity' && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Login History & Staff Activities</h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="border-b">
                  <th className="text-left py-2 px-2">Time</th>
                  <th className="text-left py-2 px-2">User ID</th>
                  <th className="text-left py-2 px-2">Role</th>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-left py-2 px-2">Description</th>
                </tr></thead>
                <tbody>
                  {activityLogs.map((log, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2 px-2 font-mono text-xs">{log.user_id}</td>
                      <td className="py-2 px-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{log.user_role}</span></td>
                      <td className="py-2 px-2 font-medium text-emerald-700">{log.action}</td>
                      <td className="py-2 px-2 text-gray-600 max-w-xs truncate">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activityLogs.length === 0 && <p className="text-center text-gray-400 py-8">No activity logs</p>}
            </div>
          </div>
        )}
      </main>

      {/* CREATE/EDIT MODALS */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'Create'} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`} size="lg">
        {modalType === 'admin' && <AdminForm editItem={editItem} onSave={handleSaveAdmin} onCancel={() => setModalOpen(false)} />}
        {modalType === 'technician' && <TechnicianForm editItem={editItem} onSave={handleSaveTechnician} onCancel={() => setModalOpen(false)} />}
        {modalType === 'student' && <StudentForm editItem={editItem} onSave={handleSaveStudent} onCancel={() => setModalOpen(false)} />}
        {modalType === 'payment' && <PaymentMethodForm editItem={editItem} onSave={handleSavePaymentMethod} onCancel={() => setModalOpen(false)} />}
        {modalType === 'course' && <CourseForm editItem={editItem} onSave={handleSaveCourse} onCancel={() => setModalOpen(false)} />}
      </Modal>
    </div>
  );
}

// COURSE FORM
function CourseForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || { title: '', slug: '', description: '', price: 0, is_free: 0, duration_days: 0, certificate_enabled: 0, published: 0, videos: [], materials: [] });

  useEffect(() => { if (editItem) setForm(f => ({ ...f, ...editItem })); }, [editItem]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  const addVideo = () => setForm(f => ({ ...f, videos: [...(f.videos||[]), { title: '', url: '' }] }));
  const removeVideo = (i) => setForm(f => ({ ...f, videos: f.videos.filter((_, idx) => idx !== i) }));
  const updateVideo = (i, key, value) => setForm(f => { const vs = [...(f.videos||[])]; vs[i] = { ...vs[i], [key]: value }; return { ...f, videos: vs }; });

  const addMaterial = () => setForm(f => ({ ...f, materials: [...(f.materials||[]), { title: '', file: null }] }));
  const removeMaterial = (i) => setForm(f => ({ ...f, materials: f.materials.filter((_, idx) => idx !== i) }));
  const updateMaterialFile = (i, file) => setForm(f => { const ms = [...(f.materials||[])]; ms[i] = { ...ms[i], file }; return { ...f, materials: ms }; });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Title *</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Price</label>
          <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input" /></div>
        <div><label className="block text-sm font-medium mb-1">Duration (days)</label>
          <input type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} className="input" /></div>
      </div>
      <div><label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input h-28" /></div>

      {/* Videos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between"><h4 className="font-semibold">YouTube Videos</h4><button type="button" onClick={addVideo} className="btn-secondary text-sm">Add Video</button></div>
        {(form.videos||[]).map((v, i) => (
          <div key={i} className="p-2 border rounded flex gap-2 items-start">
            <div className="flex-1">
              <input placeholder="Title" value={v.title} onChange={e => updateVideo(i, 'title', e.target.value)} className="input mb-2" />
              <input placeholder="YouTube URL" value={v.url} onChange={e => updateVideo(i, 'url', e.target.value)} className="input" />
            </div>
            <button type="button" onClick={() => removeVideo(i)} className="text-red-600 p-2">Remove</button>
          </div>
        ))}
      </div>

      {/* Materials (PDF) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between"><h4 className="font-semibold">Materials (PDF)</h4><button type="button" onClick={addMaterial} className="btn-secondary text-sm">Add File</button></div>
        {(form.materials||[]).map((m, i) => (
          <div key={i} className="p-2 border rounded flex gap-2 items-center">
            <input placeholder="Title" value={m.title} onChange={e => setForm(f => { const ms = [...(f.materials||[])]; ms[i] = { ...ms[i], title: e.target.value }; return { ...f, materials: ms }; })} className="input flex-1" />
            <input type="file" accept="application/pdf" onChange={e => updateMaterialFile(i, e.target.files[0])} />
            <button type="button" onClick={() => removeMaterial(i)} className="text-red-600 p-2">Remove</button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Course' : 'Create Course'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

// ADMIN FORM
function AdminForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    name: '', email: '', password: generatePassword(), mobile: '', status: 'active'
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Full Name *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required /></div>
      <div><label className="block text-sm font-medium mb-1">Email *</label>
        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" required disabled={!!editItem} /></div>
      <div><label className="block text-sm font-medium mb-1">Password {editItem ? '(leave empty to keep current)' : '*'}</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input pr-10" placeholder={editItem ? 'Enter new password or leave blank' : 'Auto-generated'} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
        {!editItem && <p className="text-xs text-gray-500 mt-1">Auto-generated: {form.password}</p>}
      </div>
      <div><label className="block text-sm font-medium mb-1">Mobile</label>
        <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="input" /></div>
      {editItem && <div><label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select></div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Admin' : 'Create Admin'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

// TECHNICIAN FORM
function TechnicianForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    name: '', email: '', password: generatePassword(), mobile: '', specialization: '', experience: '', commission_percent: 0, status: 'active'
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Full Name *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required /></div>
      <div><label className="block text-sm font-medium mb-1">Email *</label>
        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" required disabled={!!editItem} /></div>
      <div><label className="block text-sm font-medium mb-1">Password {editItem ? '(leave empty to keep current)' : '*'}</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input pr-10" />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
        {!editItem && <p className="text-xs text-gray-500 mt-1">Auto-generated: {form.password}</p>}
      </div>
      <div><label className="block text-sm font-medium mb-1">Mobile</label>
        <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="input" /></div>
      <div><label className="block text-sm font-medium mb-1">Specialization</label>
        <input value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="input" placeholder="e.g. iPhone, Samsung, All brands" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Experience (years)</label>
          <input type="number" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} className="input" /></div>
        <div><label className="block text-sm font-medium mb-1">Commission %</label>
          <input type="number" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="input" /></div>
      </div>
      {editItem && <div><label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select></div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Technician' : 'Create Technician'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

// STUDENT FORM
function StudentForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    student_id: generateStaffId('SRMS', Math.floor(Math.random() * 9000) + 1000),
    name: '', password: generatePassword(), email: '', mobile: '', course: '', batch: '', status: 'active'
  });
  const [showPass, setShowPass] = useState(false);

  const courses = ['Basic Hardware Repairing', 'Advanced Hardware Repairing', 'Software Repairing', 'IC Level Repairing'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Student ID *</label>
        <input value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} className="input font-mono" required disabled={!!editItem} />
        {!editItem && <p className="text-xs text-gray-500 mt-1">Auto-generated: {form.student_id}</p>}
      </div>
      <div><label className="block text-sm font-medium mb-1">Full Name *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required /></div>
      <div><label className="block text-sm font-medium mb-1">Password {editItem ? '(leave empty to keep current)' : '*'}</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input pr-10" />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
        {!editItem && <p className="text-xs text-gray-500 mt-1">Auto-generated: {form.password}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" /></div>
        <div><label className="block text-sm font-medium mb-1">Mobile</label>
          <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="input" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Course</label>
          <select value={form.course} onChange={e => setForm({...form, course: e.target.value})} className="input">
            <option value="">Select Course</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Batch</label>
          <input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} className="input" placeholder="e.g. 2026" /></div>
      </div>
      {editItem && <div><label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select></div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Student' : 'Create Student'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

// PAYMENT METHOD FORM
function PaymentMethodForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    name: '', type: 'upi', is_active: 1, upi_id: '', bank_account: '', ifsc_code: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Payment Method Name *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required placeholder="e.g. Google Pay, PhonePe, Cash" /></div>
      <div><label className="block text-sm font-medium mb-1">Type *</label>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input" required>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Net Banking</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
        </select></div>
      {form.type === 'upi' && <div><label className="block text-sm font-medium mb-1">UPI ID</label>
        <input value={form.upi_id} onChange={e => setForm({...form, upi_id: e.target.value})} className="input" placeholder="example@upi" /></div>}
      {(form.type === 'card' || form.type === 'netbanking') && <>
        <div><label className="block text-sm font-medium mb-1">Bank Account</label>
          <input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} className="input" placeholder="Account number" /></div>
        <div><label className="block text-sm font-medium mb-1">IFSC Code</label>
          <input value={form.ifsc_code} onChange={e => setForm({...form, ifsc_code: e.target.value})} className="input" placeholder="SBIN0001234" /></div>
      </>}
      <div><label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})} className="input">
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select></div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Payment Method' : 'Add Payment Method'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}
