import { useState, useEffect, useRef } from 'react';
import { 
  Award, Search, Plus, RefreshCw, FileText, CheckCircle2, 
  XCircle, Upload, Trash2, Eye, Printer, Download, UserCheck, ShieldCheck, 
  Edit3, FileCheck, Check, Sparkles, Building, Phone, MapPin, User, ChevronRight,
  ExternalLink, Copy, CheckSquare, Layers, FileBadge, ArrowUpRight, Clock, ToggleLeft, ToggleRight
} from 'lucide-react';
import api from '../lib/api';
import ToastContainer, { showToast } from './Toast';
import DynamicCertificate from './DynamicCertificate';

export default function MasterCertificationDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'pending' | 'certificates' | 'generate' | 'templates' | 'signatures' | 'founder' | 'signatory' | 'settings'

  // Data States
  const [certificates, setCertificates] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [settings, setSettings] = useState({
    founder_name: 'VINAYAK SANJAY KUMBHAR',
    founder_designation: 'FOUNDER & TRAINER',
    founder_signature: '/uploads/certificates/founder_signature.png',
    authorized_signatory_name: 'VINAYAK SANJAY KUMBHAR',
    authorized_signatory_designation: 'AUTHORIZED SIGNATORY',
    authorized_signature: '/uploads/certificates/authorized_signature.png',
    institute_name: 'SRM MOBAILE FIXIT',
    institute_address: 'Solapur, Maharashtra – 413002',
    auto_approve: false
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Selected Certificate Preview
  const [previewCert, setPreviewCert] = useState(null);

  // Certificate Generation Wizard State
  const [genForm, setGenForm] = useState({
    student_id: '',
    student_name: '',
    student_code: '',
    course_id: '',
    course_name: 'Android & iPhone IC-Level Repairing Course',
    course_duration: '25 Days',
    grade: 'A++',
    completion_date: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    template_id: ''
  });
  const [genStudentLoading, setGenStudentLoading] = useState(false);

  // Signature Upload Forms
  const [founderSigFile, setFounderSigFile] = useState(null);
  const [founderSigPreview, setFounderSigPreview] = useState(null);

  const [authSigFile, setAuthSigFile] = useState(null);
  const [authSigPreview, setAuthSigPreview] = useState(null);

  // Template Upload Form
  const [templateFile, setTemplateFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);

  const certRef = useRef();

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const setRes = await api.get('/certificate/settings');
      if (setRes.success && setRes.settings) {
        setSettings(setRes.settings);
      }

      const certRes = await api.get('/certificate/list');
      if (certRes.success) {
        setCertificates(certRes.certificates || []);
      }

      const pendingRes = await api.get('/certificate/pending');
      if (pendingRes.success) {
        setPendingRequests(pendingRes.pendingRequests || []);
      }

      const tmplRes = await api.get('/certificate/templates');
      if (tmplRes.success) {
        setTemplates(tmplRes.templates || []);
      }

      const stuRes = await api.get('/master/students');
      if (stuRes.success && stuRes.students) {
        setStudents(stuRes.students);
      }
    } catch (err) {
      console.error('Error fetching certification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Copy Certificate ID to Clipboard
  const handleCopy = (certId) => {
    navigator.clipboard.writeText(certId);
    setCopiedId(certId);
    showToast(`Copied ${certId} to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Approve Pending Request
  const handleApprovePending = async (pendingId) => {
    setLoading(true);
    try {
      const res = await api.post(`/certificate/approve/${pendingId}`);
      if (res.success) {
        showToast(res.message, 'success');
        if (res.certificate) {
          setPreviewCert(res.certificate);
        }
        fetchData();
      } else {
        showToast(res.message || 'Approval failed', 'error');
      }
    } catch (err) {
      console.error('Approval error:', err);
      showToast('Failed to approve request', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reject Pending Request
  const handleRejectPending = async (pendingId) => {
    const reason = window.prompt('Reason for rejecting certificate request:', 'Practical exam incomplete');
    if (reason === null) return;
    setLoading(true);
    try {
      const res = await api.post(`/certificate/reject/${pendingId}`, { reason });
      if (res.success) {
        showToast(res.message, 'info');
        fetchData();
      }
    } catch (err) {
      showToast('Failed to reject request', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill student data when selected in Generate Wizard
  const handleSelectStudentForCert = async (studentId) => {
    if (!studentId) return;
    setGenStudentLoading(true);
    try {
      const res = await api.get(`/certificate/auto-fill/${studentId}`);
      if (res.success && res.student) {
        const s = res.student;
        const defaultCourse = (s.enrolled_courses && s.enrolled_courses.length > 0) ? s.enrolled_courses[0] : null;
        setGenForm(prev => ({
          ...prev,
          student_id: s.id,
          student_name: s.name,
          student_code: s.student_id,
          course_id: defaultCourse ? defaultCourse.id : (prev.course_id || 1),
          course_name: defaultCourse ? defaultCourse.title : (s.default_course || prev.course_name),
          course_duration: defaultCourse ? defaultCourse.duration : (s.default_duration || prev.course_duration)
        }));
        showToast(`Auto-filled details for student ${s.name}`, 'success');
      }
    } catch (err) {
      console.error('Auto fill error:', err);
      showToast('Failed to auto-fill student info', 'error');
    } finally {
      setGenStudentLoading(false);
    }
  };

  // Generate Certificate Submit
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!genForm.student_id || !genForm.student_name) {
      return showToast('Please select a student first', 'error');
    }
    setLoading(true);
    try {
      const payload = {
        ...genForm,
        student_id: parseInt(genForm.student_id),
        course_id: genForm.course_id ? parseInt(genForm.course_id) : 1
      };
      const res = await api.post('/certificate/generate', payload);
      if (res && res.success && res.certificate) {
        showToast(res.message, 'success');
        setPreviewCert(res.certificate);
        fetchData();
        setActiveTab('certificates');
        setGenForm({
          student_id: '',
          student_name: '',
          student_code: '',
          course_id: '',
          course_name: 'Android & iPhone IC-Level Repairing Course',
          course_duration: '25 Days',
          grade: 'A++',
          completion_date: new Date().toISOString().split('T')[0],
          issue_date: new Date().toISOString().split('T')[0],
          template_id: ''
        });
      } else {
        showToast(res?.message || 'Generation failed', 'error');
      }
    } catch (err) {
      console.error('Generate error:', err);
      showToast('Error generating certificate', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Revoke / Update Certificate Status
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await api.put(`/certificate/${id}/status`, { status });
      if (res.success) {
        showToast(res.message, 'success');
        fetchData();
        if (previewCert && previewCert.id === id) {
          setPreviewCert(prev => ({ ...prev, certificate_status: status }));
        }
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  // Explicitly Regenerate Issued Certificate
  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerate this certificate with current global signatures and trainer details?')) return;
    try {
      const res = await api.post(`/certificate/${id}/regenerate`);
      if (res.success) {
        showToast(res.message, 'success');
        fetchData();
        if (previewCert && previewCert.id === id) {
          setPreviewCert(res.certificate);
        }
      }
    } catch (err) {
      showToast('Failed to regenerate certificate', 'error');
    }
  };

  // Save Settings & Upload Signatures
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('founder_name', settings.founder_name);
      fd.append('founder_designation', settings.founder_designation);
      fd.append('authorized_signatory_name', settings.authorized_signatory_name);
      fd.append('authorized_signatory_designation', settings.authorized_signatory_designation);
      fd.append('institute_name', settings.institute_name);
      fd.append('institute_address', settings.institute_address);
      fd.append('auto_approve_certificates', settings.auto_approve ? 'true' : 'false');

      if (founderSigFile) fd.append('founder_signature', founderSigFile);
      if (authSigFile) fd.append('authorized_signature', authSigFile);

      const res = await api.request('/certificate/settings', {
        method: 'POST',
        body: fd
      });

      if (res.success && res.settings) {
        setSettings(res.settings);
        setFounderSigFile(null);
        setFounderSigPreview(null);
        setAuthSigFile(null);
        setAuthSigPreview(null);
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload Template
  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile) return showToast('Please select a template file to upload', 'error');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('template_name', templateName || 'Uploaded Template');
      fd.append('template_file', templateFile);

      const res = await api.request('/certificate/templates', {
        method: 'POST',
        body: fd
      });

      if (res.success) {
        showToast(res.message, 'success');
        setTemplateFile(null);
        setTemplateName('');
        fetchData();
      }
    } catch (err) {
      showToast('Failed to upload template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Certificates
  const filteredCertificates = certificates.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || (c.student_name || '').toLowerCase().includes(q) || (c.certificate_id || '').toLowerCase().includes(q) || (c.student_code || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.certificate_status === statusFilter;
    const matchGrade = !gradeFilter || c.grade === gradeFilter;
    return matchQ && matchStatus && matchGrade;
  });

  const pendingActiveCount = pendingRequests.filter(r => r.status === 'pending_approval' || r.status === 'pending').length;

  return (
    <div className="space-y-6 selection:bg-emerald-500 selection:text-white font-sans">
      <ToastContainer />

      {/* DASHBOARD HEADER HERO CARD */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 p-3.5 rounded-2xl border border-emerald-400/50 shadow-xl shadow-emerald-950/50 shrink-0">
              <Award className="w-9 h-9" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-serif">
                  SRM Certification Dashboard
                </h2>
                <span className="text-[10px] font-black uppercase bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full tracking-wider shadow-xs whitespace-nowrap">
                  100% AUTOMATED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Mobile Repairing & Technical Training Institute • Student Certification Requests & Approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch md:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('generate')}
              className="btn-primary py-2.5 px-5 text-xs font-extrabold flex items-center gap-2 shadow-xl shadow-emerald-950/60"
            >
              <Plus className="w-4 h-4" /> Generate New Certificate
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/80"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="flex overflow-x-auto gap-1.5 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs font-extrabold no-scrollbar shadow-lg">
        {[
          { id: 'dashboard', label: '📊 Overview & Requests', icon: Award },
          { id: 'pending', label: `⏳ Pending Requests (${pendingActiveCount})`, icon: Clock, badge: pendingActiveCount },
          { id: 'certificates', label: `🎓 Issued Certificates (${certificates.length})`, icon: FileText },
          { id: 'generate', label: '⚡ + Generate Certificate', icon: Plus },
          { id: 'templates', label: '🎨 Templates', icon: FileCheck },
          { id: 'signatures', label: '✍️ Signatures', icon: Edit3 },
          { id: 'founder', label: '👨‍🏫 Trainer', icon: User },
          { id: 'signatory', label: '📜 Signatory', icon: ShieldCheck },
          { id: 'settings', label: '⚙️ Settings', icon: Building }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap flex items-center gap-2 relative ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-2" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD & ALL STUDENT CERTIFICATION REQUESTS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Issued Certificates</span>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{certificates.length}</h3>
              <span className="text-[10px] text-emerald-600 font-extrabold mt-1 block">Active Credentials</span>
            </div>

            <div
              onClick={() => setActiveTab('pending')}
              className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs hover:border-amber-500 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-amber-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Pending Requests</span>
                <Clock className="w-5 h-5 text-amber-600 group-hover:animate-bounce" />
              </div>
              <h3 className="text-3xl font-black text-amber-600">{pendingActiveCount}</h3>
              <span className="text-[10px] text-amber-600 font-extrabold mt-1 block">Awaiting Master Action →</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-red-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Revoked</span>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-3xl font-black text-red-600">
                {certificates.filter(c => c.certificate_status === 'Revoked').length}
              </h3>
              <span className="text-[10px] text-red-500 font-extrabold mt-1 block">Cancelled Records</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Enrolled Students</span>
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{students.length}</h3>
              <span className="text-[10px] text-blue-600 font-extrabold mt-1 block">Active Trainees</span>
            </div>
          </div>

          {/* ALL STUDENT CERTIFICATION REQUESTS TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Student Certification Requests & Approvals
                </h3>
                <p className="text-xs text-slate-400">
                  Manage all incoming student course completion certificate requests directly from the dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  {pendingActiveCount} Pending Approvals
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200/80">
                    <th className="py-3.5 px-4">Student Name & Code</th>
                    <th className="py-3.5 px-4">Course Name</th>
                    <th className="py-3.5 px-4">Request Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Instant Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pendingRequests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 block">{r.student_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{r.student_code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{r.course_name || 'Mobile Repairing Course'}</span>
                        <span className="text-[10px] text-slate-400 block">{r.course_duration || '25 Days'}</span>
                      </td>
                      <td className="py-3.5 px-4">{new Date(r.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                          r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {r.status || 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {r.status === 'approved' ? (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                            ✅ Approved & Issued
                          </span>
                        ) : r.status === 'rejected' ? (
                          <span className="text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-xl">
                            ❌ Rejected
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprovePending(r.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs transition"
                            >
                              ✅ Approve & Issue
                            </button>
                            <button
                              onClick={() => handleRejectPending(r.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold border border-red-200 transition"
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-bold">
                        No pending student certificate requests at this moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT ISSUED CERTIFICATES REGISTER */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Issued Certificates Registry
              </h3>
              <button
                onClick={() => setActiveTab('certificates')}
                className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
              >
                View Full Registry <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200/80">
                    <th className="py-3.5 px-4">Certificate ID</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {certificates.slice(0, 5).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 flex items-center gap-1.5">
                        {c.certificate_id}
                        <button
                          onClick={() => handleCopy(c.certificate_id)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy ID"
                        >
                          {copiedId === c.certificate_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{c.student_name}</td>
                      <td className="py-3.5 px-4">{c.course_name}</td>
                      <td className="py-3.5 px-4 font-black">{c.grade}</td>
                      <td className="py-3.5 px-4">{new Date(c.issue_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${c.certificate_status === 'Revoked' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {c.certificate_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setPreviewCert(c)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 transition shadow-2xs"
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                  {certificates.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-400 font-bold">
                        No certificates generated yet. Click "+ Generate Certificate" to issue one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING STUDENT REQUESTS & APPROVAL WORKFLOW */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-amber-400 uppercase">Student Certificate Approvals</h3>
                <p className="text-xs text-slate-300">
                  Review and approve pending student certificate requests. Approving automatically generates the official Certificate ID & QR code.
                </p>
              </div>
            </div>
            <div className="text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 whitespace-nowrap">
              {pendingActiveCount} Pending
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200/80">
                    <th className="py-4 px-4">Student Name & ID</th>
                    <th className="py-4 px-4">Course Name</th>
                    <th className="py-4 px-4">Request Date</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pendingRequests.map(r => (
                    <tr key={r.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-900 block text-sm">{r.student_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{r.student_code}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800">{r.course_name || 'Mobile Repairing Course'}</span>
                        <span className="text-[10px] text-slate-400 block">{r.course_duration || '25 Days'}</span>
                      </td>
                      <td className="py-4 px-4">{new Date(r.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
                          r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {r.status || 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                        {r.status === 'approved' ? (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                            ✅ Approved
                          </span>
                        ) : r.status === 'rejected' ? (
                          <span className="text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-xl">
                            ❌ Rejected
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprovePending(r.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition"
                            >
                              ✅ Approve & Issue Certificate
                            </button>
                            <button
                              onClick={() => handleRejectPending(r.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold border border-red-200 transition"
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 font-bold">
                        No pending student certificate requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CERTIFICATES LIST & SEARCH */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Student Name, ID, Certificate ID, Mobile..."
                className="w-full pl-10 pr-4 py-2.5 text-xs border rounded-2xl focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-xs border rounded-2xl font-bold bg-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Issued">Issued</option>
                <option value="Revoked">Revoked</option>
                <option value="Draft">Draft</option>
              </select>
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="px-3 py-2.5 text-xs border rounded-2xl font-bold bg-white focus:outline-none"
              >
                <option value="">All Grades</option>
                <option value="A++">A++</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200/80">
                    <th className="py-4 px-4">Certificate ID</th>
                    <th className="py-4 px-4">Student Name & Code</th>
                    <th className="py-4 px-4">Course</th>
                    <th className="py-4 px-4">Grade</th>
                    <th className="py-4 px-4">Issue Date</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCertificates.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4 font-mono font-bold text-emerald-700">
                        <div className="flex items-center gap-1.5">
                          <span>{c.certificate_id}</span>
                          <button
                            onClick={() => handleCopy(c.certificate_id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy ID"
                          >
                            {copiedId === c.certificate_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-900 block">{c.student_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{c.student_code}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800">{c.course_name}</span>
                        <span className="text-[10px] text-slate-400 block">{c.course_duration}</span>
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900">{c.grade}</td>
                      <td className="py-4 px-4">{new Date(c.issue_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${c.certificate_status === 'Revoked' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {c.certificate_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setPreviewCert(c)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 transition shadow-2xs"
                        >
                          👁️ Preview / Print
                        </button>
                        <a
                          href={`/verify-certificate/${c.certificate_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition inline-flex items-center gap-1"
                          title="Open Digital Verification URL"
                        >
                          Verify <ExternalLink className="w-3 h-3" />
                        </a>
                        {c.certificate_status !== 'Revoked' ? (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'Revoked')}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold hover:bg-red-100 transition border border-red-200"
                            title="Revoke Certificate"
                          >
                            🚫 Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'Issued')}
                            className="px-2.5 py-1.5 rounded-xl bg-green-50 text-green-700 font-bold hover:bg-green-100 transition border border-green-200"
                            title="Re-activate Certificate"
                          >
                            ✅ Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerate(c.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                          title="Regenerate with current signatures"
                        >
                          🔄 Regenerate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCertificates.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                        No certificates match your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GENERATE CERTIFICATE WIZARD (AUTO-FILL) */}
      {activeTab === 'generate' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900 text-base">Generate New Certificate</h3>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={genForm.student_id}
                  onChange={e => {
                    setGenForm({ ...genForm, student_id: e.target.value });
                    handleSelectStudentForCert(e.target.value);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Enrolled Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_id || 'ID N/A'})
                    </option>
                  ))}
                </select>
                {genStudentLoading && <p className="text-[10px] text-emerald-600 font-bold mt-1">Auto-loading student records...</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={genForm.student_name}
                  onChange={e => setGenForm({ ...genForm, student_name: e.target.value })}
                  placeholder="Auto-filled student name"
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold bg-slate-50 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student ID / Code</label>
                <input
                  type="text"
                  value={genForm.student_code}
                  onChange={e => setGenForm({ ...genForm, student_code: e.target.value })}
                  placeholder="e.g. SRM-STU-2026-0001"
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  value={genForm.course_name}
                  onChange={e => setGenForm({ ...genForm, course_name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={genForm.course_duration}
                    onChange={e => setGenForm({ ...genForm, course_duration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grade</label>
                  <select
                    value={genForm.grade}
                    onChange={e => setGenForm({ ...genForm, grade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-white"
                  >
                    <option value="A++">A++ (Master Level)</option>
                    <option value="A+">A+ (Expert)</option>
                    <option value="A">A (Proficient)</option>
                    <option value="B">B (Pass)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={genForm.completion_date}
                    onChange={e => setGenForm({ ...genForm, completion_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={genForm.issue_date}
                    onChange={e => setGenForm({ ...genForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-xs font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/30"
              >
                <Award className="w-4 h-4" /> Issue & Save Certificate
              </button>
            </form>
          </div>

          {/* LIVE PREVIEW COLUMN */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-2xl space-y-3">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Live Interactive Certificate Preview
              </h4>
              <div className="overflow-x-auto p-2 bg-slate-950 rounded-2xl flex justify-center border border-slate-800">
                <DynamicCertificate
                  certData={{
                    certificate_id: 'SRM-CERT-2026-AUTO',
                    student_name: genForm.student_name || 'STUDENT NAME',
                    student_code: genForm.student_code || 'SRM-STU-2026-0001',
                    course_name: genForm.course_name,
                    course_duration: genForm.course_duration,
                    grade: genForm.grade,
                    completion_date: genForm.completion_date,
                    issue_date: genForm.issue_date,
                    trainer_name: settings.founder_name,
                    trainer_signature: settings.founder_signature,
                    authorized_signatory_name: settings.authorized_signatory_name,
                    authorized_signatory_signature: settings.authorized_signature,
                    institute_name: settings.institute_name,
                    institute_address: settings.institute_address
                  }}
                  scale={0.52}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TEMPLATE MANAGEMENT */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Upload Custom Certificate Background</h3>
            <form onSubmit={handleUploadTemplate} className="flex flex-col sm:flex-row gap-3 items-end text-xs">
              <div className="flex-1">
                <label className="block font-bold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. SRM Official Gold Border Template"
                  className="w-full px-3.5 py-2.5 border rounded-2xl"
                />
              </div>
              <div className="flex-1">
                <label className="block font-bold text-slate-700 mb-1">Template Background File (PNG, JPG, SVG, PDF)</label>
                <input
                  type="file"
                  onChange={e => setTemplateFile(e.target.files[0])}
                  accept="image/*,.pdf"
                  className="w-full px-3.5 py-2 border rounded-2xl"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-2.5 px-6 font-black flex items-center gap-2 shrink-0 shadow-md"
              >
                <Upload className="w-4 h-4" /> Upload Template
              </button>
            </form>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <div className="h-40 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
                  {tmpl.template_file ? (
                    <img src={tmpl.template_file} alt="Template" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-extrabold text-slate-400">Standard SRM Green Certificate</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>{tmpl.template_name || 'Standard Template'}</span>
                  {tmpl.is_default ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-black">DEFAULT</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SIGNATURE MANAGEMENT */}
      {activeTab === 'signatures' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* FOUNDER & TRAINER SIGNATURE CARD */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-slate-900 text-sm">Founder & Trainer Signature</h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trainer Name</label>
                  <input
                    type="text"
                    value={settings.founder_name}
                    onChange={e => setSettings({ ...settings, founder_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-2xl font-extrabold"
                  />
                </div>
                <div className="h-28 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-center p-3">
                  {founderSigPreview ? (
                    <img src={founderSigPreview} alt="Preview" className="max-h-24 object-contain" />
                  ) : settings.founder_signature ? (
                    <img src={settings.founder_signature} alt="Founder Signature" className="max-h-24 object-contain" />
                  ) : (
                    <span className="text-slate-400 font-bold text-xs">No Signature Image Uploaded</span>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Upload Signature Image (Transparent PNG preferred)</label>
                  <input
                    type="file"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setFounderSigFile(file);
                        setFounderSigPreview(URL.createObjectURL(file));
                      }
                    }}
                    accept="image/*"
                    className="w-full px-3 py-1.5 border rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* AUTHORIZED SIGNATORY CARD */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-slate-900 text-sm">Authorized Signatory Signature</h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authorized Signatory Name</label>
                  <input
                    type="text"
                    value={settings.authorized_signatory_name}
                    onChange={e => setSettings({ ...settings, authorized_signatory_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-2xl font-extrabold"
                  />
                </div>
                <div className="h-28 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-center p-3">
                  {authSigPreview ? (
                    <img src={authSigPreview} alt="Preview" className="max-h-24 object-contain" />
                  ) : settings.authorized_signature ? (
                    <img src={settings.authorized_signature} alt="Authorized Signature" className="max-h-24 object-contain" />
                  ) : (
                    <span className="text-slate-400 font-bold text-xs">No Signature Image Uploaded</span>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Upload Signature Image (Transparent PNG preferred)</label>
                  <input
                    type="file"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setAuthSigFile(file);
                        setAuthSigPreview(URL.createObjectURL(file));
                      }
                    }}
                    accept="image/*"
                    className="w-full px-3 py-1.5 border rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3.5 px-8 text-xs font-black shadow-xl shadow-emerald-950/40"
            >
              Save Signature Changes
            </button>
          </div>
        </form>
      )}

      {/* TAB 7 & 8: FOUNDER / SIGNATORY DETAILS */}
      {(activeTab === 'founder' || activeTab === 'signatory') && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 max-w-xl mx-auto text-xs">
          <h3 className="font-black text-slate-900 text-base border-b pb-3">
            {activeTab === 'founder' ? 'Founder & Master Trainer Details' : 'Authorized Signatory Details'}
          </h3>
          {activeTab === 'founder' ? (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Founder Name</label>
                <input
                  type="text"
                  value={settings.founder_name}
                  onChange={e => setSettings({ ...settings, founder_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={settings.founder_designation}
                  onChange={e => setSettings({ ...settings, founder_designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={settings.authorized_signatory_name}
                  onChange={e => setSettings({ ...settings, authorized_signatory_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={settings.authorized_signatory_designation}
                  onChange={e => setSettings({ ...settings, authorized_signatory_designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
                />
              </div>
            </div>
          )}
          <button type="submit" className="btn-primary w-full py-3.5 font-black text-xs shadow-md">
            Save Details
          </button>
        </form>
      )}

      {/* TAB 9: SETTINGS & AUTO-APPROVE TOGGLE */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5 max-w-xl mx-auto text-xs">
          <h3 className="font-black text-slate-900 text-base border-b pb-3">Institute & Auto-Approval Settings</h3>
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">Institute Name</label>
            <input
              type="text"
              value={settings.institute_name}
              onChange={e => setSettings({ ...settings, institute_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Official Address</label>
            <input
              type="text"
              value={settings.institute_address}
              onChange={e => setSettings({ ...settings, institute_address: e.target.value })}
              className="w-full px-3.5 py-2.5 border rounded-2xl font-bold"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs">Auto-Approve Certificate Requests</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically generate & issue certificates when a student completes course practicals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, auto_approve: !prev.auto_approve }))}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 font-extrabold ${
                settings.auto_approve ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {settings.auto_approve ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              <span>{settings.auto_approve ? 'ENABLED' : 'MANUAL'}</span>
            </button>
          </div>

          <button type="submit" className="btn-primary w-full py-3.5 font-black text-xs shadow-md">
            Update Certification Settings
          </button>
        </form>
      )}

      {/* PREVIEW & PRINT MODAL OVERLAY */}
      {previewCert && (
        <div className="fixed inset-0 bg-slate-950/90 z-[99999] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-6xl space-y-4 text-white shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">
                  Certificate Preview & Print ({previewCert.certificate_id})
                </h3>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition font-black"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-x-auto p-4 bg-slate-950 rounded-2xl flex justify-center border border-slate-800">
              <DynamicCertificate
                ref={certRef}
                certData={previewCert}
                scale={0.85}
                showActions={true}
                onPrint={() => window.print()}
                onDownloadPDF={() => window.print()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
