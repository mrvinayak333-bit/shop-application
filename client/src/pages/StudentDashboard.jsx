import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, CheckCircle, Clock, Award, User, ShoppingBag, LogOut, ArrowRight, Eye, Download, Search, Check, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import PDFReaderModal from '../components/PDFReaderModal';
import ToastContainer, { showToast } from '../components/Toast';
import DynamicCertificate from '../components/DynamicCertificate';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [pdfMaterials, setPdfMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'pdf-library' | 'certificates'
  const [requestLoading, setRequestLoading] = useState(false);

  // PDF Reader Modal state
  const [selectedPdfBook, setSelectedPdfBook] = useState(null);

  // Certificate Modal Preview state
  const [previewCert, setPreviewCert] = useState(null);
  const certRef = useRef();

  // Search & Filter state for PDF Library
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfFilterStatus, setPdfFilterStatus] = useState('all');

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res && res.success) {
        setStudent(res.student || null);
        setCourses(res.courses || []);
        setCertificates(res.certificates || []);
        setPdfMaterials(res.pdfMaterials || []);
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRequestCertificate = async (courseId) => {
    setRequestLoading(true);
    try {
      const res = await api.post('/student/request-certificate', { course_id: courseId || 1 });
      if (res.success) {
        showToast(res.message, 'success');
        fetchDashboardData();
        setActiveTab('certificates');
      } else {
        showToast(res.message || 'Request failed', 'error');
      }
    } catch (err) {
      showToast('Error requesting certificate', 'error');
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) return <Loading />;

  // Filter PDFs
  const filteredPdfs = pdfMaterials.filter(pdf => {
    const matchesSearch = (pdf.title || '').toLowerCase().includes(pdfSearchQuery.toLowerCase()) ||
                          (pdf.course_name || '').toLowerCase().includes(pdfSearchQuery.toLowerCase()) ||
                          (pdf.topic_name || '').toLowerCase().includes(pdfSearchQuery.toLowerCase());
    
    if (pdfFilterStatus === 'completed') return matchesSearch && Number(pdf.completed) === 1;
    if (pdfFilterStatus === 'unread') return matchesSearch && Number(pdf.completed) === 0;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar />
      <ToastContainer />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Welcome Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-500/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-xl border border-emerald-400/50 shrink-0">
              {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Welcome, {student?.name || user?.name || 'Student'}</h1>
                <span className="text-[10px] font-black uppercase bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  VERIFIED TRAINEE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span className="font-mono text-emerald-400">ID: {student?.student_id || 'SRM-STU-2026'}</span> • {student?.phone || 'Solapur, Maharashtra'}
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Links */}
          <div className="flex flex-wrap items-center gap-2 relative z-10 w-full md:w-auto">
            <button
              onClick={() => navigate('/student/store')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" /> Course Store
            </button>
            <button
              onClick={() => navigate('/student/profile')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <User className="w-4 h-4" /> Profile
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
            <BookOpen className="w-6 h-6 text-emerald-600 mb-2 mx-auto" />
            <p className="text-2xl font-black text-gray-800">{courses.length}</p>
            <p className="text-xs text-gray-500 font-medium">Enrolled Courses</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
            <CheckCircle className="w-6 h-6 text-emerald-600 mb-2 mx-auto" />
            <p className="text-2xl font-black text-gray-800">{courses.filter(c => (c.progress ?? 0) >= 100).length}</p>
            <p className="text-xs text-gray-500 font-medium">Completed</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center cursor-pointer" onClick={() => setActiveTab('pdf-library')}>
            <FileText className="w-6 h-6 text-sky-600 mb-2 mx-auto" />
            <p className="text-2xl font-black text-gray-800">{pdfMaterials.length}</p>
            <p className="text-xs text-sky-600 font-bold">PDF Library Books</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center cursor-pointer" onClick={() => setActiveTab('certificates')}>
            <Award className="w-6 h-6 text-purple-600 mb-2 mx-auto" />
            <p className="text-2xl font-black text-gray-800">{certificates.length}</p>
            <p className="text-xs text-purple-600 font-bold">My Certificates</p>
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <BookOpen className="w-4 h-4" /> My Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('pdf-library')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'pdf-library' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <FileText className="w-4 h-4" /> 📄 PDF Study Library ({pdfMaterials.length})
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'certificates' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <Award className="w-4 h-4" /> 🎓 My Certificates ({certificates.length})
          </button>
        </div>

        {/* ── TAB 1: MY COURSES VIEW ────────────────────────────────────────── */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-800 mb-4">My Enrolled Courses</h2>
            {courses.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-700 font-bold text-sm">No Courses Available</p>
                <p className="text-gray-400 text-xs mt-1">Visit the Course Store to explore mobile & laptop repair courses.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => {
                  const name = course.title || 'Course';
                  const subtitle = course.description || '';
                  const progress = Number(course.progress) || 0;
                  return (
                    <div key={course.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-md transition flex gap-4 bg-white">
                      <div className="w-28 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-8 h-8 text-white/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate text-sm">{name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-600 block">{progress}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-xs">
                          <span className="text-[10px] text-gray-400 font-medium">Lessons: {course.totalVideos || 12}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigate(`/courses/${course.id}`)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                            >
                              Study Course →
                            </button>
                            <button
                              onClick={() => handleRequestCertificate(course.id)}
                              disabled={requestLoading}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                              title="Request Certificate"
                            >
                              <Award className="w-3.5 h-3.5 text-emerald-400" /> Cert
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: PDF STUDY LIBRARY ────────────────────────────────────────── */}
        {activeTab === 'pdf-library' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-600" /> PDF Study Library & Book Reader
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Read study manuals, circuit schematics, and notes with interactive PDF viewer controls.</p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PDF books & notes..."
                  value={pdfSearchQuery}
                  onChange={e => setPdfSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-bold">Status:</span>
              {[
                { id: 'all', label: `All PDFs (${pdfMaterials.length})` },
                { id: 'unread', label: 'Unread' },
                { id: 'completed', label: 'Completed' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPdfFilterStatus(f.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition ${pdfFilterStatus === f.id ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredPdfs.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-gray-700 font-bold text-sm">No PDF study materials match your search filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredPdfs.map(pdf => {
                  const isDone = Number(pdf.completed) === 1;
                  return (
                    <div key={pdf.id} className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:shadow-xl transition space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                            {pdf.course_name || 'Study Book'}
                          </span>
                          {isDone && (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-sm text-white line-clamp-2 mt-2">{pdf.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{pdf.description || pdf.topic_name || 'Circuit schematic & repair manual'}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">PDF Document</span>
                        <button
                          onClick={() => setSelectedPdfBook(pdf)}
                          className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> Read PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: MY CERTIFICATES VIEW (ISSUED & PENDING REQUESTS) ───────── */}
        {activeTab === 'certificates' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" /> My Official Certificates
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">View, print, and verify your official SRM MOBAILE FIXIT completion credentials.</p>
              </div>
              <button
                onClick={() => handleRequestCertificate(courses.length > 0 ? courses[0].id : 1)}
                disabled={requestLoading}
                className="btn-primary py-2.5 px-5 text-xs font-black flex items-center gap-2 shadow-md shrink-0"
              >
                <Award className="w-4 h-4 text-emerald-300" /> Request Completion Certificate
              </button>
            </div>

            {certificates.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                <Award className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-extrabold text-gray-800 text-base">No Certificates Issued Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Complete your course practicals or click the button below to send a certificate request to Master Vinayak Sanjay Kumbhar.
                </p>
                <button
                  onClick={() => handleRequestCertificate(courses.length > 0 ? courses[0].id : 1)}
                  disabled={requestLoading}
                  className="btn-primary py-2.5 px-6 text-xs font-black inline-flex items-center gap-2 shadow-md mt-2"
                >
                  <Award className="w-4 h-4 text-emerald-300" /> Submit Certificate Request
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.map((c) => {
                  const isIssued = c.status === 'Issued' || c.status === 'approved' || c.status === 'Generated';
                  const isPending = c.status === 'pending_approval' || c.status === 'pending';
                  const certId = c.certificate_id || c.certificate_number || 'SRM-CERT-2026';

                  return (
                    <div key={c.id} className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
                      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                            SRM MOBAILE FIXIT
                          </span>
                          <h3 className="font-extrabold text-base text-white mt-1">{c.course_name}</h3>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isIssued ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                          isPending ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' :
                          'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                          {isIssued ? 'OFFICIAL ISSUED' : isPending ? 'PENDING APPROVAL' : c.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-slate-400">
                          Certificate ID: <span className="font-mono font-bold text-emerald-400">{certId}</span>
                        </p>
                        <p className="text-slate-400">
                          Issued On: <span className="font-bold text-white">{new Date(c.issue_date || Date.now()).toLocaleDateString('en-IN')}</span>
                        </p>
                        {c.grade && (
                          <p className="text-slate-400">
                            Grade Secured: <span className="font-black text-emerald-400">{c.grade}</span>
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        {isIssued ? (
                          <>
                            <button
                              onClick={() => setPreviewCert(c)}
                              className="btn-primary py-2 px-4 text-xs font-black flex items-center gap-1.5 shadow-md"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Print Certificate
                            </button>
                            <a
                              href={`/verify-certificate/${certId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-extrabold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition"
                            >
                              Verify QR <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        ) : (
                          <p className="text-[11px] text-amber-400 italic">
                            ⏳ Certificate request is pending Master Vinayak Sanjay Kumbhar approval.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* PDF READER MODAL */}
      {selectedPdfBook && (
        <PDFReaderModal
          pdfBook={selectedPdfBook}
          onClose={() => {
            setSelectedPdfBook(null);
            fetchDashboardData();
          }}
        />
      )}

      {/* CERTIFICATE PREVIEW MODAL */}
      {previewCert && (
        <div className="fixed inset-0 bg-slate-950/90 z-[99999] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-6xl space-y-4 text-white shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">
                  Certificate Preview & Print ({previewCert.certificate_id || previewCert.certificate_number})
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
                certData={{
                  certificate_id: previewCert.certificate_id || previewCert.certificate_number,
                  student_name: student?.name || 'STUDENT NAME',
                  student_code: student?.student_id || 'SRM-STU-2026-0001',
                  course_name: previewCert.course_name || 'Mobile Repairing Course',
                  course_duration: previewCert.course_duration || '25 Days',
                  grade: previewCert.grade || 'A++',
                  issue_date: previewCert.issue_date,
                  trainer_name: 'VINAYAK SANJAY KUMBHAR',
                  authorized_signatory_name: 'VINAYAK SANJAY KUMBHAR',
                  institute_name: 'SRM MOBAILE FIXIT',
                  institute_address: 'Solapur, Maharashtra – 413002'
                }}
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
