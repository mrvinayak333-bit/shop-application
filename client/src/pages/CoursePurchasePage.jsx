import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Check, ShoppingBag, ArrowRight, PlayCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function CoursePurchasePage() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState(null);
  
  // Ref map for autoscrolling
  const cardRefs = useRef({});

  const loadCourses = async () => {
    setLoading(true);
    try {
      // Fetch available courses
      const res = await api.get('/transactions/student/available');
      if (res.success) {
        setCourses(res.courses || []);
      } else {
        showToast(res.message || 'Failed to load courses', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection to server failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  // Handle auto-scroll and highlight from location state
  useEffect(() => {
    if (!loading && courses.length > 0 && location.state?.highlightCourseId) {
      const courseId = location.state.highlightCourseId;
      const element = cardRefs.current[courseId];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-emerald-500', 'shadow-[0_0_24px_rgba(16,185,129,0.35)]');
          showToast('Course highlighted for enrollment!', 'success');
          
          // Remove highlight class after 3s
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-emerald-500', 'shadow-[0_0_24px_rgba(16,185,129,0.35)]');
          }, 3000);
        }, 300);
      }
    }
  }, [loading, courses, location.state]);

  const handleAction = async (courseId, price) => {
    if (!isAuthenticated) {
      showToast('Please login as a student to register or purchase courses', 'warning');
      setTimeout(() => navigate('/login/customer'), 2000);
      return;
    }

    if (user?.role !== 'student') {
      showToast('Only student accounts can purchase courses.', 'error');
      return;
    }

    setPurchasingId(courseId);
    try {
      const res = await api.post('/transactions/purchase', { courseId });
      if (res.success) {
        showToast('Success! You are now enrolled in this course.', 'success');
        // Reload course lists
        loadCourses();
        setTimeout(() => navigate('/dashboard/student'), 1500);
      } else {
        showToast(res.message || 'Enrollment transaction failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error processing payment simulator', 'error');
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-slate-500 text-sm">Discovering course directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16 transition">
      <Navbar />
      <ToastContainer />

      {/* Hero section */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="bg-emerald-500/30 text-emerald-100 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            Premium LMS Training
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Shree Raam Mobile Academy</h1>
          <p className="text-emerald-100 max-w-xl mx-auto text-sm md:text-base">
            Master smartphone hardware repair, software programming, and micro-soldering with direct guidance from experts.
          </p>
        </div>
      </section>

      {/* Courses Directory Grid */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8 border-b pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-slate-850 dark:text-white">Active Courses</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a course to register and start learning immediately.</p>
          </div>
          <span className="text-xs text-slate-400 font-bold">{courses.length} Courses Available</span>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-350 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No courses are currently available for purchase.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(c => {
              const isFree = parseFloat(c.price || 0) === 0;
              return (
                <div
                  key={c.id}
                  ref={el => cardRefs.current[c.id] = el}
                  className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between overflow-hidden hover:shadow-xl hover:-translate-y-1 transition duration-300"
                >
                  {/* Thumbnail / Header */}
                  <div className="h-44 bg-slate-100 dark:bg-slate-750 relative overflow-hidden flex items-center justify-center">
                    {c.banner_image ? (
                      <img src={c.banner_image} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <BookOpen className="w-12 h-12 mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider">SRM Academy</span>
                      </div>
                    )}
                    {c.already_purchased === 1 && (
                      <div className="absolute top-4 right-4 bg-emerald-600 text-white p-2 rounded-full shadow-lg">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-3 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-slate-750 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Course Fee</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                          {isFree ? 'FREE' : `₹${parseFloat(c.price || 0).toLocaleString('en-IN')}`}
                        </p>
                      </div>

                      {c.already_purchased === 1 ? (
                        <button
                          onClick={() => navigate('/dashboard/student')}
                          className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide transition flex items-center gap-1.5"
                        >
                          <PlayCircle className="w-4 h-4" /> Continue Learning
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(c.id, c.price)}
                          disabled={purchasingId === c.id}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide transition flex items-center gap-1.5"
                        >
                          {purchasingId === c.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                            </>
                          ) : isFree ? (
                            <>
                              Enroll Free <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" /> Enroll Now
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
