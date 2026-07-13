import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Student Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">Welcome, {student.name || user?.name}</p>

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
            <p className="text-center text-gray-400 py-8">No courses have been assigned to your account yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => {
                const name = course.title || 'Course';
                const subtitle = course.description || '';
                const progress = Number(course.progress) || 0;
                return (
                  <div key={course.id} className="border rounded-lg p-4 hover:shadow-md transition flex gap-4">
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
                          <h3 className="font-semibold text-gray-900">{name}</h3>
                          <p className="text-sm text-gray-500">{subtitle}</p>
                          <p className="text-xs text-gray-500 mt-2">Instructor: {course.instructor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{progress}%</p>
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                            <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 gap-4">
                        <div className="text-sm text-gray-600">Videos: {course.totalVideos} • PDFs: {course.totalPDFs}</div>
                        <div>
                          <button onClick={() => navigate(`/courses/${course.id}`)} className="btn-primary text-sm">Continue Learning</button>
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
