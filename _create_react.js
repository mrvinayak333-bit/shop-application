const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'client', 'src');

// Create directories
['components', 'pages'].forEach(dir => {
  const p = path.join(src, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {};

// ============ index.css ============
files['src/index.css'] = `@import 'tailwindcss';

@layer base {
  body { @apply bg-gray-50 text-gray-900; }
}

@layer components {
  .btn-primary { @apply bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition; }
  .btn-secondary { @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition; }
  .card { @apply bg-white rounded-xl shadow-md p-6; }
  .input { @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent; }
}

@keyframes timeline-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
}
.timeline-active { animation: timeline-glow 2s ease-in-out infinite; }

@keyframes slide-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-slide-in { animation: slide-in 0.4s ease-out; }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 0.3s ease-out; }
`;

// ============ App.jsx ============
files['src/App.jsx'] = `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import HomePage from './pages/HomePage';
import TrackingPage from './pages/TrackingPage';
import TechnicianDashboard from './pages/TechnicianDashboard';
import RepairDetail from './pages/RepairDetail';
import PickupVerification from './pages/PickupVerification';
import PaymentPage from './pages/PaymentPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/track/:trackingNumber" element={<TrackingPage />} />
          <Route path="/technician" element={<TechnicianDashboard />} />
          <Route path="/technician/repair/:id" element={<RepairDetail />} />
          <Route path="/technician/repair/:id/pickup" element={<PickupVerification />} />
          <Route path="/technician/repair/:id/payment" element={<PaymentPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
`;

// ============ main.jsx ============
files['src/main.jsx'] = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

// ============ COMPONENTS ============

files['src/components/StatusBadge.jsx'] = `const statusMap = {
  registered: { label: 'Registered', cls: 'bg-blue-100 text-blue-800' },
  pickup_done: { label: 'Pickup Done', cls: 'bg-indigo-100 text-indigo-800' },
  admin_verified: { label: 'Verified', cls: 'bg-purple-100 text-purple-800' },
  received_center: { label: 'Received', cls: 'bg-cyan-100 text-cyan-800' },
  accepted: { label: 'Accepted', cls: 'bg-teal-100 text-teal-800' },
  under_diagnosis: { label: 'Diagnosing', cls: 'bg-amber-100 text-amber-800' },
  under_repair: { label: 'Repairing', cls: 'bg-orange-100 text-orange-800' },
  waiting_parts: { label: 'Waiting Parts', cls: 'bg-yellow-100 text-yellow-800' },
  repair_done: { label: 'Repair Done', cls: 'bg-lime-100 text-lime-800' },
  quality_test: { label: 'QC Testing', cls: 'bg-emerald-100 text-emerald-800' },
  ready_delivery: { label: 'Ready', cls: 'bg-green-100 text-green-800' },
  out_delivery: { label: 'Out for Delivery', cls: 'bg-sky-100 text-sky-800' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-200 text-emerald-900' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

export default function StatusBadge({ status }) {
  const s = statusMap[status] || { label: status, cls: 'bg-gray-100 text-gray-800' };
  return <span className={\`inline-block px-3 py-1 rounded-full text-xs font-semibold \${s.cls}\`}>{s.label}</span>;
}
`;

files['src/components/Timeline.jsx'] = `import { CheckCircle, Circle, Clock } from 'lucide-react';

const stages = [
  'registered','pickup_done','admin_verified','received_center','accepted',
  'under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','delivered'
];
const labels = {
  registered:'Registered', pickup_done:'Pickup Verified', admin_verified:'Admin Verified',
  received_center:'Received at Center', accepted:'Accepted', under_diagnosis:'Under Diagnosis',
  under_repair:'Under Repair', waiting_parts:'Waiting for Parts', repair_done:'Repair Done',
  quality_test:'Quality Test', ready_delivery:'Ready for Delivery', out_delivery:'Out for Delivery', delivered:'Delivered'
};

export default function Timeline({ currentStatus, statusLog = [] }) {
  const currentIdx = stages.indexOf(currentStatus);
  const logMap = {};
  statusLog.forEach(s => { logMap[s.status] = s.created_at; });

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
      {stages.map((stage, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage} className={\`relative mb-4 \${active ? 'timeline-active' : ''}\`}>
            <div className="absolute -left-5 top-1">
              {done ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : active ? <Clock className="w-5 h-5 text-amber-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
            </div>
            <p className={\`text-sm font-medium \${done ? 'text-emerald-700' : 'text-gray-400'}\`}>{labels[stage] || stage}</p>
            {logMap[stage] && <p className="text-xs text-gray-400">{new Date(logMap[stage]).toLocaleString()}</p>}
          </div>
        );
      })}
    </div>
  );
}
`;

files['src/components/Navbar.jsx'] = `import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Smartphone, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Smartphone className="w-7 h-7 text-emerald-600" />
          <span className="text-xl font-bold text-gray-900">SHREE RAAM MOBILE</span>
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user?.name}</span>
              </div>
              <button onClick={logout} className="text-red-500 hover:text-red-700"><LogOut className="w-5 h-5" /></button>
            </>
          ) : (
            <Link to="/" className="btn-primary text-sm">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
`;

files['src/components/BottomActions.jsx'] = `import { Link } from 'react-router-dom';

export default function BottomActions({ actions }) {
  if (!actions || !actions.length) return null;
  return (
    <div className="flex gap-3 mt-4">
      {actions.map((a, i) => (
        <Link key={i} to={a.to} className={a.variant === 'primary' ? 'btn-primary flex-1 text-center' : 'btn-secondary flex-1 text-center'}>
          {a.label}
        </Link>
      ))}
    </div>
  );
}
`;

files['src/components/DeviceCard.jsx'] = `import { Smartphone } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function DeviceCard({ repair, link }) {
  return (
    <div className="card hover:shadow-lg transition animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg"><Smartphone className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="font-semibold text-gray-900">{repair.brand} {repair.model}</p>
            <p className="text-xs text-gray-500">{repair.tracking_number}</p>
          </div>
        </div>
        <StatusBadge status={repair.status} />
      </div>
      <div className="mt-3 text-sm text-gray-600">
        <p>Issue: {repair.issue_description}</p>
        {repair.customer_name && <p>Customer: {repair.customer_name}</p>}
      </div>
      {link && <a href={link} className="text-emerald-600 text-sm font-medium mt-2 block hover:underline">View Details &rarr;</a>}
    </div>
  );
}
`;

files['src/components/PhotoUpload.jsx'] = `import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';

export default function PhotoUpload({ label, name, photos, setPhotos }) {
  const inputRef = useRef(null);

  const handleAdd = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotos(prev => ({ ...prev, [name]: file }));
  };

  const handleRemove = () => {
    setPhotos(prev => ({ ...prev, [name]: null }));
    if (inputRef.current) inputRef.current.value = '';
  };

  const preview = photos[name] ? URL.createObjectURL(photos[name]) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
          <button type="button" onClick={handleRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition">
          <Camera className="w-6 h-6" />
          <span className="text-xs mt-1">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAdd} />
    </div>
  );
}
`;

files['src/components/PaymentCard.jsx'] = `import { CreditCard } from 'lucide-react';

export default function PaymentCard({ quotation, onApprove, onReject }) {
  if (!quotation) return null;
  return (
    <div className="card border border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Quotation</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Parts Cost</span><span>₹{quotation.parts_cost}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Labor Cost</span><span>₹{quotation.labor_cost}</span></div>
        <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-emerald-600">₹{quotation.total_cost}</span></div>
        {quotation.spare_parts && <p className="text-gray-500">Spare Parts: {quotation.spare_parts}</p>}
        {quotation.diagnosis && <p className="text-gray-500">Diagnosis: {quotation.diagnosis}</p>}
      </div>
      {(onApprove || onReject) && (
        <div className="flex gap-3 mt-4">
          {onApprove && <button onClick={() => onApprove(true)} className="btn-primary flex-1">Approve</button>}
          {onReject && <button onClick={() => onReject(false)} className="btn-secondary flex-1">Reject</button>}
        </div>
      )}
    </div>
  );
}
`;

files['src/components/PhotoGallery.jsx'] = `export default function PhotoGallery({ photos = [] }) {
  if (!photos.length) return <p className="text-sm text-gray-400">No photos</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p, i) => (
        <a key={i} href={p.file_path || p} target="_blank" rel="noopener noreferrer">
          <img src={p.file_path || p} alt={\`Photo \${i + 1}\`} className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition" />
        </a>
      ))}
    </div>
  );
}
`;

files['src/components/Toast.jsx'] = `import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={\`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in \${t.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}\`}>
          {t.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}
`;

files['src/components/Loading.jsx'] = `export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 text-sm">{text}</p>
    </div>
  );
}
`;

// ============ PAGES ============

files['src/pages/HomePage.jsx'] = `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Smartphone, Shield, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function HomePage() {
  const [trackingId, setTrackingId] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return showToast('Enter tracking number', 'error');
    navigate('/track/' + trackingId.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Track Your Repair</h1>
          <p className="text-gray-500 text-lg">Enter your tracking number to get real-time updates</p>
        </div>
        <form onSubmit={handleTrack} className="max-w-md mx-auto mb-16">
          <div className="flex gap-2">
            <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="SRM-2026-000001" className="input flex-1" />
            <button type="submit" className="btn-primary flex items-center gap-2"><Search className="w-4 h-4" /> Track</button>
          </div>
        </form>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Shield className="w-6 h-6 text-emerald-600" /></div>
            <h3 className="font-semibold text-gray-900">Secure Repair</h3>
            <p className="text-sm text-gray-500 mt-1">Your device is safe with us</p>
          </div>
          <div className="card text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Clock className="w-6 h-6 text-blue-600" /></div>
            <h3 className="font-semibold text-gray-900">Real-time Tracking</h3>
            <p className="text-sm text-gray-500 mt-1">Track every step of repair</p>
          </div>
          <div className="card text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Smartphone className="w-6 h-6 text-purple-600" /></div>
            <h3 className="font-semibold text-gray-900">Expert Technicians</h3>
            <p className="text-sm text-gray-500 mt-1">Certified repair professionals</p>
          </div>
        </div>
      </main>
    </div>
  );
}
`;

files['src/pages/TrackingPage.jsx'] = `import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Timeline from '../components/Timeline';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';

export default function TrackingPage() {
  const { trackingNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/repair/track/' + trackingNumber).then(res => {
      if (res.success) setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [trackingNumber]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading text="Tracking repair..." /></div>;
  if (!data) return <div className="min-h-screen"><Navbar /><p className="text-center py-20 text-gray-500">Repair not found</p></div>;

  const { repair, statusLog } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{repair.brand} {repair.model}</h1>
              <p className="text-sm text-gray-500">{repair.tracking_number}</p>
            </div>
            <StatusBadge status={repair.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Device:</span> <span className="font-medium">{repair.device_type}</span></div>
            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{repair.customer}</span></div>
            <div><span className="text-gray-500">Registered:</span> <span className="font-medium">{new Date(repair.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Timeline</h2>
          <Timeline currentStatus={repair.status} statusLog={statusLog} />
        </div>
      </main>
    </div>
  );
}
`;

files['src/pages/TechnicianDashboard.jsx'] = `import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, Clock, DollarSign, Wrench } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import DeviceCard from '../components/DeviceCard';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function TechnicianDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('awaiting');
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    Promise.all([
      api.get('/technician/dashboard'),
      api.get('/technician/my-repairs?filter=' + filter)
    ]).then(([dash, reps]) => {
      if (dash.success) setData(dash);
      if (reps.success) setRepairs(reps.repairs);
      setLoading(false);
    }).catch(() => { showToast('Failed to load', 'error'); setLoading(false); });
  }, [isAuthenticated, filter, navigate]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const stats = data?.stats || {};
  const statCards = [
    { icon: Clock, label: 'Pending', value: stats.pending || 0, color: 'bg-amber-100 text-amber-600' },
    { icon: Wrench, label: 'Active', value: stats.activeJobs || 0, color: 'bg-blue-100 text-blue-600' },
    { icon: CheckCircle, label: 'Today', value: stats.completedToday || 0, color: 'bg-emerald-100 text-emerald-600' },
    { icon: DollarSign, label: 'Commission', value: '₹' + (stats.commissionEarned || 0), color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {data?.tech?.name || user?.name}</h1>
        <p className="text-gray-500 text-sm mb-6">{data?.tech?.specialization || 'Technician'}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className={\`p-2 rounded-lg \${s.color}\`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          {['awaiting', 'in-progress', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={\`px-4 py-2 rounded-lg text-sm font-medium transition \${filter === f ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}\`}>
              {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {repairs.length === 0 ? <p className="text-center text-gray-400 py-8">No repairs found</p> :
            repairs.map(r => <DeviceCard key={r.id} repair={r} link={\`/technician/repair/\${r.id}\`} />)}
        </div>
      </main>
    </div>
  );
}
`;

files['src/pages/RepairDetail.jsx'] = `import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import PaymentCard from '../components/PaymentCard';
import PhotoGallery from '../components/PhotoGallery';
import BottomActions from '../components/BottomActions';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

const statuses = ['registered','pickup_done','admin_verified','received_center','accepted','under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','out_delivery','delivered'];

export default function RepairDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    api.get('/technician/repair/' + id).then(res => {
      if (res.success) { setData(res); setNewStatus(res.repair.status); }
      setLoading(false);
    }).catch(() => { showToast('Failed to load', 'error'); setLoading(false); });
  }, [id, isAuthenticated, navigate]);

  const updateStatus = async () => {
    const res = await api.put('/technician/repair/' + id + '/status', { status: newStatus, notes });
    if (res.success) { showToast('Status updated'); const r = await api.get('/technician/repair/' + id); if (r.success) setData(r); }
    else showToast(res.message || 'Error', 'error');
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;
  if (!data) return <div className="min-h-screen"><Navbar /><p className="text-center py-20">Repair not found</p></div>;

  const { repair, statusLog, quotation } = data;
  const actions = [];
  if (repair.status !== 'delivered') {
    actions.push({ to: '/technician/repair/' + id + '/pickup', label: 'Pickup Verification', variant: 'primary' });
    actions.push({ to: '/technician/repair/' + id + '/payment', label: 'Payment', variant: 'secondary' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/technician" className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
        <div className="card mb-4">
          <div className="flex justify-between items-start mb-3">
            <div><h1 className="text-xl font-bold">{repair.brand} {repair.model}</h1><p className="text-sm text-gray-500">{repair.tracking_number}</p></div>
            <StatusBadge status={repair.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Customer:</span> {repair.customer}</div>
            <div><span className="text-gray-500">Mobile:</span> {repair.mobile}</div>
            <div><span className="text-gray-500">Device:</span> {repair.device_type}</div>
            <div><span className="text-gray-500">IMEI:</span> {repair.imei || 'N/A'}</div>
          </div>
          <p className="mt-3 text-sm"><span className="text-gray-500">Issue:</span> {repair.issue_description}</p>
        </div>

        {quotation && <div className="mb-4"><PaymentCard quotation={quotation} /></div>}

        <div className="card mb-4">
          <h2 className="text-lg font-semibold mb-3">Update Status</h2>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input mb-2">
            {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input mb-2" />
          <button onClick={updateStatus} className="btn-primary w-full">Update Status</button>
        </div>

        <div className="card mb-4">
          <h2 className="text-lg font-semibold mb-3">Timeline</h2>
          <Timeline currentStatus={repair.status} statusLog={statusLog} />
        </div>

        <BottomActions actions={actions} />
      </main>
    </div>
  );
}
`;

files['src/pages/PickupVerification.jsx'] = `import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import PhotoUpload from '../components/PhotoUpload';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function PickupVerification() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({});
  const [gps, setGps] = useState({ lat: '', lng: '' });
  const [condition, setCondition] = useState('');
  const [otp, setOtp] = useState('');
  const [problemNotes, setProblemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    api.get('/technician/repair/' + id).then(res => {
      if (res.success) setRepair(res.repair);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isAuthenticated, navigate]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
        () => showToast('Location access denied', 'error')
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    if (photos.device_photo) formData.append('device_photo', photos.device_photo);
    if (photos.customer_selfie) formData.append('customer_selfie', photos.customer_selfie);
    formData.append('gps_lat', gps.lat);
    formData.append('gps_lng', gps.lng);
    formData.append('device_condition', condition);
    formData.append('problem_notes', problemNotes);
    formData.append('otp_code', otp);

    const res = await api.upload('/repair/' + id + '/pickup', formData);
    setSubmitting(false);
    if (res.success) { showToast('Pickup verified!'); navigate('/technician/repair/' + id); }
    else showToast(res.message || 'Error', 'error');
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="card mb-4">
          <h1 className="text-xl font-bold mb-1">Pickup Verification</h1>
          {repair && <p className="text-sm text-gray-500">{repair.brand} {repair.model} - {repair.tracking_number}</p>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Photos</h2>
            <div className="flex gap-4">
              <PhotoUpload label="Device Photo" name="device_photo" photos={photos} setPhotos={setPhotos} />
              <PhotoUpload label="Customer Selfie" name="customer_selfie" photos={photos} setPhotos={setPhotos} />
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Location</h2>
            <div className="flex gap-2">
              <input value={gps.lat} readOnly placeholder="Latitude" className="input flex-1" />
              <input value={gps.lng} readOnly placeholder="Longitude" className="input flex-1" />
              <button type="button" onClick={getLocation} className="btn-secondary flex items-center gap-1"><MapPin className="w-4 h-4" /> GPS</button>
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Device Condition</h2>
            <textarea value={condition} onChange={e => setCondition(e.target.value)} placeholder="Describe device condition..." className="input mb-2" rows={3} />
            <textarea value={problemNotes} onChange={e => setProblemNotes(e.target.value)} placeholder="Problem notes..." className="input" rows={2} />
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">OTP Verification</h2>
            <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" className="input" maxLength={6} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Verify Pickup'}</button>
        </form>
      </main>
    </div>
  );
}
`;

files['src/pages/PaymentPage.jsx'] = `import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import PaymentCard from '../components/PaymentCard';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function PaymentPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [repair, setRepair] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    api.get('/technician/repair/' + id).then(res => {
      if (res.success) { setRepair(res.repair); setQuotation(res.quotation); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isAuthenticated, navigate]);

  const createQuotation = async (e) => {
    e.preventDefault();
    const res = await api.post('/technician/repair/' + id + '/quotation', { parts_cost: partsCost, labor_cost: laborCost, spare_parts: spareParts, diagnosis });
    if (res.success) { showToast('Quotation created'); navigate('/technician/repair/' + id); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleApprove = async (approved) => {
    const res = await api.put('/technician/repair/' + id + '/quotation/approve', { approved });
    if (res.success) { showToast(approved ? 'Approved!' : 'Rejected'); navigate('/technician/repair/' + id); }
    else showToast(res.message || 'Error', 'error');
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="card mb-4">
          <h1 className="text-xl font-bold mb-1">Payment</h1>
          {repair && <p className="text-sm text-gray-500">{repair.brand} {repair.model} - {repair.tracking_number}</p>}
        </div>
        {quotation ? (
          <PaymentCard quotation={quotation} onApprove={handleApprove} onReject={handleApprove} />
        ) : (
          <form onSubmit={createQuotation} className="card">
            <h2 className="font-semibold mb-3">Create Quotation</h2>
            <div className="space-y-3">
              <input value={partsCost} onChange={e => setPartsCost(e.target.value)} type="number" placeholder="Parts Cost (₹)" className="input" />
              <input value={laborCost} onChange={e => setLaborCost(e.target.value)} type="number" placeholder="Labor Cost (₹)" className="input" />
              <input value={spareParts} onChange={e => setSpareParts(e.target.value)} placeholder="Spare Parts" className="input" />
              <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnosis details" className="input" rows={3} />
            </div>
            <button type="submit" className="btn-primary w-full mt-4">Submit Quotation</button>
          </form>
        )}
      </main>
    </div>
  );
}
`;

// ============ vite.config.js ============
files['vite.config.js'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SHREE RAAM MOBILE',
        short_name: 'SRM',
        description: 'Mobile Repair Tracking System',
        theme_color: '#166534',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
      },
      workbox: { runtimeCaching: [{ urlPattern: /^https:\\/\\/fonts\\.googleapis\\.com\\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-stylesheets' } }] }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000'
    }
  }
});
`;

// Write all files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(root, 'client', filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('  Written: ' + filePath);
});

// Delete App.css if exists
const appCss = path.join(src, 'App.css');
if (fs.existsSync(appCss)) { fs.unlinkSync(appCss); console.log('  Deleted: App.css'); }

console.log('\\nAll ' + Object.keys(files).length + ' files written successfully!');

