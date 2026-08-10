import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play, FileText, FileCode, Link as LinkIcon, Archive,
  CheckCircle, ArrowLeft, Award, Loader, CheckSquare, Square, FileArchive,
  Search, Settings, ChevronRight, ChevronLeft, Eye, ExternalLink, Copy,
  Sun, Moon, BookOpen, Filter, Maximize2, Minimize2, Sparkles, X, RefreshCw, Layers, Video
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api, { getApiBase } from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';
import PDFReaderModal from '../components/PDFReaderModal';

// Custom SVG Icons for robust rendering
const YoutubeIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const ImageIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// Helper to build clean URL for uploaded files
function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return cleanPath;
}

// Extract valid YouTube embed URL
function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?v=([^&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]?.length === 11) {
      return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1&controls=1`;
    }
  }
  return url;
}

export default function CourseStudyPage() {
  const { courseId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Core data states
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [certificate, setCertificate] = useState(null);

  // Active view states
  const [activeSubject, setActiveSubject] = useState(null); // null means showing active item or first topic
  const [activeItem, setActiveItem] = useState(null); // null means showing topic overview screen
  const [activePdfModal, setActivePdfModal] = useState(null); // null or pdf item object
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [isScreenProtected, setIsScreenProtected] = useState(false);

  // UI / Settings states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'video' | 'pdf' | 'notes' | 'completed'
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMobileSyllabus, setShowMobileSyllabus] = useState(false);

  const [settings, setSettings] = useState({
    autoplayNext: true,
    theaterMode: false,
    notesTheme: 'dark', // 'dark' | 'light' | 'sepia'
    fontSize: 'normal', // 'small' | 'normal' | 'large'
  });

  // Anti-Screenshot & Content Security
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p') ||
        (e.metaKey && e.shiftKey && ['3', '4', '5', 'S', 's'].includes(e.key))
      ) {
        e.preventDefault();
        setIsScreenProtected(true);
        showToast('Screenshots & Printing are strictly restricted on course materials.', 'error');
        setTimeout(() => setIsScreenProtected(false), 3000);
      }
    };
    const handleBlur = () => setIsScreenProtected(true);
    const handleFocus = () => setIsScreenProtected(false);
    const handleContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadCourseDetails();
  }, [authLoading, isAuthenticated, user, courseId]);

  const loadCourseDetails = async () => {
    if (!courseId || courseId === 'undefined' || isNaN(parseInt(courseId))) {
      setErrorState('Invalid Course ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorState('');
    try {
      const res = await api.get(`/student/course/${courseId}`);
      if (res && res.success && res.course) {
        setCourse(res.course);
        const subList = res.subjects || [];
        const itemList = res.items || [];

        setSubjects(subList);
        setItems(itemList);
        setEnrollment(res.enrollment || {});
        setCertificate(res.certificate || null);

        // Default to first subject and its first item if available
        if (subList.length > 0) {
          setActiveSubject(subList[0]);
        }
        if (itemList.length > 0) {
          setActiveItem(itemList[0]);
        }
      } else {
        setErrorState(res?.message || 'Course unavailable or not enrolled');
      }
    } catch (err) {
      console.error('Course load error:', err);
      setErrorState('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItemComplete = async (itemId, currentCompleted) => {
    if (savingProgress) return;
    setSavingProgress(true);
    const nextCompleted = !currentCompleted;

    try {
      const res = await api.post(`/student/course-item/${itemId}/complete`, { completed: nextCompleted });
      if (res && res.success) {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: nextCompleted ? 1 : 0 } : item));
        showToast(nextCompleted ? 'Topic item completed! 🎉' : 'Marked incomplete', nextCompleted ? 'success' : 'info');

        if (res.status === 'completed') {
          showToast('🏆 Congratulations! Course completed 100%!', 'success');
          loadCourseDetails();
        } else if (nextCompleted && settings.autoplayNext) {
          // Autoplay next item after 1 sec
          const currentIndex = items.findIndex(i => i.id === itemId);
          if (currentIndex !== -1 && currentIndex < items.length - 1) {
            setTimeout(() => {
              setActiveItem(items[currentIndex + 1]);
            }, 1000);
          }
        }
      }
    } catch (err) {
      showToast('Error saving progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  // Filtered Items for Syllabus Sidebar
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const itemType = (item.material_type || item.type || '').toLowerCase();

      if (!titleMatch) return false;
      if (filterType === 'all') return true;
      if (filterType === 'video') return ['youtube', 'video'].includes(itemType);
      if (filterType === 'pdf') return itemType === 'pdf';
      if (filterType === 'notes') return itemType === 'notes';
      if (filterType === 'completed') return item.completed === 1;
      return true;
    });
  }, [items, searchQuery, filterType]);

  // Navigate between previous/next lesson
  const currentItemIndex = items.findIndex(i => i.id === activeItem?.id);
  const prevItem = currentItemIndex > 0 ? items[currentItemIndex - 1] : null;
  const nextItem = currentItemIndex !== -1 && currentItemIndex < items.length - 1 ? items[currentItemIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-zinc-400 text-sm font-medium">Loading Course Workspace...</p>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">{errorState}</h2>
            <p className="text-xs text-zinc-400">You may not be enrolled in this course or it might have been updated.</p>
            <button onClick={() => navigate('/dashboard/student')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition">
              ← Back to Student Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed === 1).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Content Protection Screen Blackout */}
      {isScreenProtected && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl max-w-md shadow-2xl space-y-3">
            <h2 className="text-xl font-bold text-red-500">🚫 Content Protected</h2>
            <p className="text-zinc-300 text-xs">Screenshots, printing, and screen recording are disabled for course materials.</p>
            <p className="text-[10px] text-zinc-500">Focus on the application window to resume.</p>
          </div>
        </div>
      )}

      <Navbar />
      <ToastContainer />

      {/* Course Top Header Bar with Navigation & Back Buttons */}
      <div className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 md:px-6 py-3 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Back Button & Course Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/student')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition shadow-sm"
            title="Back to Student Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

          <div>
            <h1 className="text-sm md:text-base font-black text-white truncate max-w-xs md:max-w-md">{course?.title}</h1>
            <p className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>{subjects.length} Topics</span> • <span>{items.length} Lessons</span>
            </p>
          </div>
        </div>

        {/* Right Side: Progress Bar, Settings & Actions */}
        <div className="flex items-center gap-3">
          {/* Progress gauge */}
          <div className="hidden md:flex items-center gap-3 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block leading-tight">Course Progress</span>
              <span className="text-xs font-black text-emerald-400">{progressPct}%</span>
            </div>
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Certificate Download Button */}
          {progressPct === 100 && certificate && (
            <Link to={`/print-certificate/${certificate.id}`} target="_blank"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg transition transform hover:scale-105">
              <Award className="w-4 h-4" /> <span className="hidden sm:inline">Certificate</span>
            </Link>
          )}

          {/* Player Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            title="Course Settings"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Mobile Syllabus Toggle Button */}
          <button
            onClick={() => setShowMobileSyllabus(!showMobileSyllabus)}
            className="lg:hidden p-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
          >
            <Layers className="w-4 h-4" /> Syllabus
          </button>
        </div>
      </div>

      {/* Main Learning Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* ── LEFT PANE: CONTENT VIEWER OR TOPIC OVERVIEW ────────────────────── */}
        <div className={`flex-1 p-4 md:p-6 flex flex-col justify-between overflow-y-auto ${settings.theaterMode ? 'max-w-full' : ''}`}>
          <div>
            {/* Action Sub-Bar (Back to Topics / Navigation) */}
            <div className="flex items-center justify-between mb-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                {activeItem ? (
                  <button
                    onClick={() => setActiveItem(null)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Topic Overview
                  </button>
                ) : (
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-400" /> Topic Contents Grid
                  </span>
                )}
              </div>

              {/* Prev / Next Lesson Quick Jump */}
              {activeItem && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => prevItem && setActiveItem(prevItem)}
                    disabled={!prevItem}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:hover:bg-zinc-800 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    onClick={() => nextItem && setActiveItem(nextItem)}
                    disabled={!nextItem}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-30 transition"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* ── ITEM CONTENT VIEWER ────────────────────────────────────────── */}
            {activeItem ? (
              <ItemViewer
                item={activeItem}
                settings={settings}
                savingProgress={savingProgress}
                onToggleComplete={() => handleToggleItemComplete(activeItem.id, activeItem.completed === 1)}
                onOpenPdfModal={(pdfItem) => setActivePdfModal(pdfItem)}
              />
            ) : (
              /* ── TOPIC OVERVIEW SCREEN (SHOWS ALL ADDED CONTENTS) ──────────── */
              <TopicOverviewScreen
                subject={activeSubject || subjects[0]}
                items={items.filter(i => !activeSubject || i.subject_id === activeSubject.id)}
                onSelectItem={(item) => setActiveItem(item)}
                onToggleComplete={handleToggleItemComplete}
              />
            )}
          </div>

          {/* Certificate Completion Notice */}
          {progressPct === 100 && (
            <div className="mt-8 bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-400">🎉 Course Completed 100%!</h3>
                  <p className="text-xs text-zinc-300">You have completed all materials in this course curriculum.</p>
                </div>
              </div>
              {certificate && certificate.status === 'approved' ? (
                <Link to={`/print-certificate/${certificate.id}`} target="_blank"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2">
                  <Award className="w-4 h-4" /> Download Certificate
                </Link>
              ) : (
                <span className="text-xs font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl">
                  Certificate Pending Approval
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: SYLLABUS & TOPICS SIDEBAR ──────────────────────────── */}
        <div className={`w-full lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col ${showMobileSyllabus ? 'fixed inset-0 z-30 bg-zinc-900' : 'hidden lg:flex'}`}>

          {/* Sidebar Header with Filter & Search */}
          <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-900/90">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" /> Course Syllabus
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {completedItems}/{totalItems} Done
              </span>
              {showMobileSyllabus && (
                <button onClick={() => setShowMobileSyllabus(false)} className="lg:hidden p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search topics & materials..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Type Filters */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'video', label: 'Videos' },
                { id: 'pdf', label: 'PDFs' },
                { id: 'notes', label: 'Notes' },
                { id: 'completed', label: 'Done' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${filterType === f.id ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics & Subject Accordion List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {subjects.length === 0 ? (
              <div className="text-center text-zinc-500 py-12 text-xs">No topics created in this course yet.</div>
            ) : (
              subjects.map((sub, sIdx) => {
                const subItems = filteredItems.filter(i => i.subject_id === sub.id);
                const subCompleted = subItems.filter(i => i.completed === 1).length;
                const isSubActive = activeSubject?.id === sub.id;

                return (
                  <div key={sub.id} className="bg-zinc-950/60 rounded-xl border border-zinc-850 overflow-hidden">
                    {/* Subject Header */}
                    <button
                      onClick={() => {
                        setActiveSubject(sub);
                        if (subItems.length > 0 && !activeItem) {
                          setActiveItem(subItems[0]);
                        }
                      }}
                      className={`w-full p-3 flex items-center justify-between text-left transition ${isSubActive ? 'bg-zinc-850 border-l-4 border-l-emerald-500' : 'hover:bg-zinc-900'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-200 truncate">{sub.title}</h4>
                          <span className="text-[10px] text-zinc-500">{subItems.length} materials • {subCompleted} completed</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isSubActive ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Subject Items List */}
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                      {subItems.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 p-3 italic">No matching items in this topic</p>
                      ) : (
                        subItems.map(item => {
                          const isActive = activeItem?.id === item.id;
                          const isDone = item.completed === 1;
                          const mType = (item.material_type || item.type || 'youtube').toLowerCase();

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setActiveSubject(sub);
                                setActiveItem(item);
                                if (showMobileSyllabus) setShowMobileSyllabus(false);
                              }}
                              className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition ${isActive ? 'bg-emerald-950/40 border-l-2 border-emerald-400 text-white font-bold' : 'hover:bg-zinc-900/60 text-zinc-300'}`}
                            >
                              {/* Complete Toggle Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleItemComplete(item.id, isDone);
                                }}
                                className="text-zinc-500 hover:text-emerald-400 shrink-0"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <MaterialTypeIcon type={mType} />

                              <div className="flex-1 min-w-0">
                                <div className={`text-xs truncate ${isActive ? 'text-emerald-400 font-bold' : 'text-zinc-300'}`}>
                                  {item.title}
                                </div>
                                {item.duration_minutes > 0 && (
                                  <div className="text-[9px] text-zinc-500">{item.duration_minutes} min</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" /> Course Player Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Autoplay Next */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="font-bold text-zinc-200">Autoplay Next Lesson</div>
                  <div className="text-zinc-400 text-[10px]">Automatically load next item after completion</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoplayNext}
                  onChange={e => setSettings(p => ({ ...p, autoplayNext: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Theater Mode */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="font-bold text-zinc-200">Theater / Full Width Mode</div>
                  <div className="text-zinc-400 text-[10px]">Expand video player to full container width</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.theaterMode}
                  onChange={e => setSettings(p => ({ ...p, theaterMode: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Notes Theme */}
              <div>
                <label className="font-bold text-zinc-200 block mb-1.5">Notes Reader Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dark', label: 'Dark Zinc', bg: 'bg-zinc-950 text-white' },
                    { id: 'light', label: 'Light Paper', bg: 'bg-slate-100 text-slate-800' },
                    { id: 'sepia', label: 'Sepia Warm', bg: 'bg-amber-100 text-amber-900' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSettings(p => ({ ...p, notesTheme: t.id }))}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${t.bg} ${settings.notesTheme === t.id ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-zinc-700'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition"
            >
              Done & Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Interactive PDF Reader Modal */}
      {activePdfModal && (
        <PDFReaderModal
          pdfItem={activePdfModal}
          onClose={() => setActivePdfModal(null)}
          onMarkComplete={handleToggleItemComplete}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL TYPE ICON HELPER
// ─────────────────────────────────────────────────────────────────────────────
function MaterialTypeIcon({ type }) {
  switch (type) {
    case 'youtube': return <YoutubeIcon className="w-4 h-4 text-red-500 shrink-0" />;
    case 'video': return <Play className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'pdf': return <FileText className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'image': return <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" />;
    case 'notes': return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'zip': return <Archive className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'link': return <LinkIcon className="w-4 h-4 text-teal-400 shrink-0" />;
    default: return <FileArchive className="w-4 h-4 text-zinc-400 shrink-0" />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC OVERVIEW SCREEN (DISPLAYED WHEN SUBJECT IS CLICKED)
// ─────────────────────────────────────────────────────────────────────────────
function TopicOverviewScreen({ subject, items, onSelectItem, onToggleComplete }) {
  if (!subject) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
        <BookOpen className="w-10 h-10 text-zinc-700 mx-auto" />
        <h3 className="text-base font-bold text-zinc-400">No topic selected</h3>
        <p className="text-xs text-zinc-500">Select a topic from the syllabus list on the right side to view contents.</p>
      </div>
    );
  }

  const completedCount = items.filter(i => i.completed === 1).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Subject Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-emerald-500/30 p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Topic Module
            </span>
            <h2 className="text-xl font-black text-white mt-2">{subject.title}</h2>
            <p className="text-xs text-zinc-400 mt-1">{items.length} Added Lessons & Materials</p>
          </div>

          <div className="bg-zinc-950/80 px-4 py-3 rounded-xl border border-zinc-800 flex items-center gap-4">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Topic Progress</div>
              <div className="text-sm font-black text-emerald-400">{progress}%</div>
            </div>
            <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Added Contents Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center justify-between">
          <span>Added Contents ({items.length})</span>
          <span className="text-xs text-zinc-500 font-normal">Click any lesson to start learning</span>
        </h3>

        {items.length === 0 ? (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-xs text-zinc-500">No contents uploaded for this topic yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item, idx) => {
              const mType = (item.material_type || item.type || 'youtube').toLowerCase();
              const isDone = item.completed === 1;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition group hover:shadow-lg flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <MaterialTypeIcon type={mType} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">{item.title}</h4>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleComplete(item.id, isDone); }}
                        className="text-zinc-500 hover:text-emerald-400 shrink-0"
                      >
                        {isDone ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{item.description || 'No extra description'}</p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                      <span className="uppercase font-bold text-emerald-400/80">{mType}</span>
                      {item.duration_minutes > 0 && <span>⏱️ {item.duration_minutes} min</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE ITEM VIEWER (HANDLES ALL 7 MATERIAL TYPES)
// ─────────────────────────────────────────────────────────────────────────────
function ItemViewer({ item, settings, savingProgress, onToggleComplete, onOpenPdfModal }) {
  const mType = (item.material_type || item.type || 'youtube').toLowerCase();
  const fileUrl = getFileUrl(item.file_path);
  const [copied, setCopied] = useState(false);

  const handleCopyNotes = () => {
    if (item.notes_content) {
      navigator.clipboard.writeText(item.notes_content);
      setCopied(true);
      showToast('Notes copied to clipboard! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. YOUTUBE VIDEO ──────────────────────────────────────────────── */}
      {mType === 'youtube' && (
        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
          <iframe
            src={getYoutubeEmbedUrl(item.youtube_url)}
            title={item.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* ── 2. HTML5 VIDEO ────────────────────────────────────────────────── */}
      {mType === 'video' && (
        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
          {fileUrl ? (
            <video src={fileUrl} controls className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Video file missing</div>
          )}
        </div>
      )}

      {/* ── 3. PDF DOCUMENT ───────────────────────────────────────────────── */}
      {mType === 'pdf' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> PDF Document Reader Mode
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/student/pdf-reader/${item.id}`)}
                className="text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Launch In-App PDF Reader
              </button>
            </div>
          </div>
          {fileUrl ? (
            <iframe
              key={fileUrl}
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title={item.title}
              className="w-full h-[65vh] bg-zinc-950"
            />
          ) : (
            <div className="py-16 text-center text-zinc-500 text-xs">No PDF file linked.</div>
          )}
        </div>
      )}

      {/* ── 4. IMAGE VIEWER ───────────────────────────────────────────────── */}
      {mType === 'image' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl text-center space-y-4">
          {fileUrl ? (
            <img src={fileUrl} alt={item.title} className="max-h-[65vh] w-auto mx-auto rounded-xl object-contain shadow-md" />
          ) : (
            <div className="py-16 text-zinc-500 text-xs">No image file linked.</div>
          )}
        </div>
      )}

      {/* ── 5. FORMATTED NOTES ────────────────────────────────────────────── */}
      {mType === 'notes' && (() => {
        const themeStyles = {
          dark: 'bg-zinc-950 text-zinc-100 border-zinc-800',
          light: 'bg-slate-50 text-slate-900 border-slate-200',
          sepia: 'bg-amber-50 text-amber-950 border-amber-200',
        }[settings.notesTheme || 'dark'];

        return (
          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${themeStyles}`}>
            <div className="flex items-center justify-between border-b pb-3 border-current/10">
              <span className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                <FileCode className="w-4 h-4" /> Formatted Study Notes
              </span>
              <button
                onClick={handleCopyNotes}
                className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy Notes'}
              </button>
            </div>
            <div className="whitespace-pre-wrap font-mono text-xs md:text-sm leading-relaxed p-2 max-h-[60vh] overflow-y-auto">
              {item.notes_content || 'No text notes content written for this lesson.'}
            </div>
          </div>
        );
      })()}

      {/* ── 6. ZIP ARCHIVE FILE ───────────────────────────────────────────── */}
      {mType === 'zip' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <Archive className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{item.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">Downloadable ZIP / Archive Package</p>
          </div>
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg">
              <Archive className="w-4 h-4" /> Access Archive File
            </a>
          ) : (
            <p className="text-xs text-zinc-500">No zip file attached.</p>
          )}
        </div>
      )}

      {/* ── 7. EXTERNAL LINK ──────────────────────────────────────────────── */}
      {mType === 'link' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto">
            <LinkIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{item.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">External Resource & Reference Link</p>
          </div>
          {item.external_url ? (
            <a href={item.external_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg">
              <ExternalLink className="w-4 h-4" /> Open External Link
            </a>
          ) : (
            <p className="text-xs text-zinc-500">No URL provided.</p>
          )}
        </div>
      )}

      {/* ── LESSON DETAILS & COMPLETION CARD ───────────────────────────────── */}
      <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-black text-white">{item.title}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{item.description || 'No detailed lesson description.'}</p>
          </div>

          <button
            onClick={onToggleComplete}
            disabled={savingProgress}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${item.completed === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
          >
            {item.completed === 1 ? (
              <><CheckCircle className="w-4 h-4 text-emerald-400" /> Completed</>
            ) : (
              'Mark as Completed'
            )}
          </button>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-zinc-400">
          <span>Type: <strong className="uppercase text-emerald-400">{mType}</strong></span>
          {item.duration_minutes > 0 && <span>Duration: <strong>{item.duration_minutes} min</strong></span>}
        </div>
      </div>
    </div>
  );
}
