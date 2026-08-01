import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, User, Award, MessageSquare, ShoppingBag } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function StudentDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    setLoading(true);
    api.get('/student/dashboard').then(res => {
      if (res && res.success) {
        const payload = (res.courses || []).map(c => ({
          id: c.course_id,
          title: c.course_name,
          description: c.description,
          instructor: c.instructor_name || 'Instructor',
          thumbnail: c.thumbnail || null,
          totalVideos: c.total_videos || 0,
          totalPDFs: c.total_pdfs || 0,
          progress: c.progress_percentage ?? 0,
          enrollmentId: c.enrollment_id,
        }));
        setData({ student: res.student, courses: payload, certificates: res.certificates || [] });
      } else {
        showToast(res?.message || 'Failed to load dashboard', 'error');
        setData({ student: null, courses: [], certificates: [] });
      }
      setLoading(false);
    }).catch(() => { showToast('Failed to load dashboard', 'error'); setData({ student: null, courses: [], certificates: [] }); setLoading(false); });
  }, [authLoading, isAuthenticated, user, navigate]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const student = data?.student || {};
  const courses = data?.courses || [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-20 h-20 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center flex-shrink-0">
              {student.profile_photo ? (
                <img src={student.profile_photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800 capitalize leading-tight">{student.name || user?.name}</h1>
              <p className="text-xs text-gray-400 mt-1">Student ID: <strong>{student.student_id}</strong></p>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                <span>{student.email || 'No email provided'}</span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span>{student.mobile || 'No mobile provided'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/student/profile')}
              className="px-4 py-2 border border-gray-200 hover:border-emerald-600 hover:text-emerald-700 text-gray-600 rounded-lg text-xs font-bold transition"
            >
              Edit Profile
            </button>
            <button 
              onClick={() => navigate('/student/store')}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Course Store
            </button>
            <button 
              onClick={() => navigate('/student/support')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Help & Support
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <BookOpen className="w-6 h-6 text-blue-600 mb-2 mx-auto" />
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-xs text-gray-500">Enrolled Courses</p>
          </div>
          <div className="card text-center">
            <Clock className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
            <p className="text-2xl font-bold">{courses.filter(c => (c.progress ?? 0) < 100).length}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="card text-center">
            <CheckCircle className="w-6 h-6 text-emerald-600 mb-2 mx-auto" />
            <p className="text-2xl font-bold">{courses.filter(c => (c.progress ?? 0) >= 100).length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{student.student_id || 'N/A'}</p>
            <p className="text-xs text-gray-500">Student ID</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">My Courses</h2>
          {courses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-700 font-bold text-sm">No Courses Available</p>
              <p className="text-gray-400 text-xs mt-1">Check back later or visit the Course Store to explore available repairing courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => {
                const name = course.title || 'Course';
                const subtitle = course.description || '';
                const progress = Number(course.progress) || 0;
                return (
                  <div key={course.id} className="border rounded-lg p-4 hover:shadow-md transition flex gap-4 bg-white">
                    <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate max-w-[180px]">{name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{subtitle}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Instructor: {course.instructor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{progress}%</p>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 gap-2">
                        <div className="text-[10px] text-gray-500">Videos: {course.totalVideos} • PDFs: {course.totalPDFs}</div>
                        <div className="flex items-center gap-1.5">
                          {progress === 100 && (() => {
                            const cert = (data?.certificates || []).find(c => c.course_id === course.id);
                            if (cert) {
                              if (cert.status === 'approved') {
                                return (
                                  <Link 
                                    to={`/print-certificate/${cert.id}`} 
                                    target="_blank" 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                                  >
                                    <Award className="w-3 h-3" /> Certificate
                                  </Link>
                                );
                              } else {
                                return (
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 border border-gray-200 py-1.5 px-2 rounded-lg">
                                    Pending Approval
                                  </span>
                                );
                              }
                            }
                            return (
                              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 border border-gray-200 py-1.5 px-2 rounded-lg">
                                Certificate Requested
                              </span>
                            );
                          })()}
                          <button onClick={() => navigate(`/courses/${course.id}`)} className="btn-primary py-1 px-3 text-xs">Study</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
