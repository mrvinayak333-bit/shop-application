import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, FileText, Download, CheckCircle, ArrowLeft, Award, Loader, CheckSquare, Square, FileArchive } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function CourseStudyPage() {
  const { courseId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [certificate, setCertificate] = useState(null);
  
  const [activeItem, setActiveItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [isScreenProtected, setIsScreenProtected] = useState(false);

  // Anti-Screenshot & Content DRM Security Hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      // PrintScreen key or Ctrl+P / Cmd+P or Cmd+Shift+3/4/5
      if (
        e.key === 'PrintScreen' || 
        (e.ctrlKey && e.key === 'p') || 
        (e.metaKey && e.key === 'p') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5' || e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        setIsScreenProtected(true);
        showToast('Screenshots & Printing are strictly restricted on protected course materials.', 'error');
        setTimeout(() => setIsScreenProtected(false), 3000);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        setIsScreenProtected(true);
        setTimeout(() => setIsScreenProtected(false), 3000);
      }
    };

    const handleBlur = () => {
      // Blackout when focus is lost (e.g. Snipping Tool or screenshot overlay opened)
      setIsScreenProtected(true);
    };

    const handleFocus = () => {
      setIsScreenProtected(false);
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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

  const [errorState, setErrorState] = useState('');

  const loadCourseDetails = async () => {
    // Validate courseId before making API call
    if (!courseId || courseId === 'undefined' || courseId === 'null' || isNaN(parseInt(courseId))) {
      console.error('Invalid Course ID provided:', courseId);
      setErrorState('No Courses Available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorState('');
    try {
      const res = await api.get(`/student/course/${courseId}`);
      if (res && res.success && res.course) {
        setCourse(res.course);
        setSubjects(res.subjects || []);
        setItems(res.items || []);
        setEnrollment(res.enrollment || {});
        setCertificate(res.certificate || null);

        // Find first item to activate (preferably a video or youtube link)
        if (res.items && res.items.length > 0) {
          const firstVideo = res.items.find(i => i.type === 'video' || i.type === 'youtube') || res.items[0];
          setActiveItem(firstVideo);
        }
      } else {
        const msg = res?.message || 'No Courses Available';
        console.error('API Error Response:', res);
        setErrorState(msg === 'Course not found' ? 'No Courses Available' : msg);
      }
    } catch (err) {
      console.error('Backend course fetch error:', err);
      setErrorState('No Courses Available');
    } finally {
      setLoading(false);
    }
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
  };

  const handleToggleItemComplete = async (itemId, currentCompleted) => {
    if (savingProgress) return;
    setSavingProgress(true);

    const nextCompleted = !currentCompleted;

    try {
      const res = await api.post(`/student/course-item/${itemId}/complete`, {
        completed: nextCompleted
      });

      if (res && res.success) {
        // Update item in local list state
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: nextCompleted ? 1 : 0 } : item));
        
        // Update enrollment progress details if completion is triggered
        if (res.status === 'completed') {
          showToast('Congratulations! Course completed 100%!', 'success');
          loadCourseDetails();
        }
      } else {
        showToast('Failed to save progress', 'error');
      }
    } catch (err) {
      showToast('Error updating progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
          <Loader className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-zinc-400 text-sm">Loading course environment...</p>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar />
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-amber-500/10 text-amber-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{errorState}</h2>
            <p className="text-zinc-400 text-xs mb-6">
              The course you are trying to access is unavailable or you may not be enrolled.
            </p>
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition w-full"
            >
              Back to Student Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic progress based on local items status
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed === 1).length;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isCourseCompleted = progressPercentage === 100 || enrollment?.status === 'completed';

  const getItemIcon = (type) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4 text-emerald-400" />;
      case 'youtube': return <Play className="w-4 h-4 text-red-500" />;
      case 'pdf': return <FileText className="w-4 h-4 text-sky-400" />;
      default: return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <style>{`
        @media print {
          body {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
      
      {/* Blackout overlay when screen capture or blur is detected */}
      {isScreenProtected && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">🚫 Content Protected</h2>
            <p className="text-zinc-300 text-sm mb-4">
              Screenshots, screen recording, and window switching are restricted while viewing premium course materials.
            </p>
            <p className="text-xs text-zinc-500">Focus the window to resume study mode.</p>
          </div>
        </div>
      )}

      <Navbar />
      <ToastContainer />

      {/* Course Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/student" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-300">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-wide capitalize text-zinc-100">{course?.title}</h1>
            <p className="text-xs text-zinc-400">Curriculum: {subjects.length} Subjects • {items.length} Materials</p>
          </div>
        </div>

        {/* Progress Display */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 block">{progressPercentage}% Completed</span>
            <div className="w-36 h-2 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
          
          {isCourseCompleted && certificate && (
            <div>
              {certificate.status === 'approved' ? (
                <Link to={`/print-certificate/${certificate.id}`} target="_blank" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition transform hover:scale-105">
                  <Award className="w-4 h-4" /> Download Certificate
                </Link>
              ) : (
                <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 uppercase tracking-wider">
                  Certificate Pending Approval
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Viewer Pane */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-140px)]">
          <div>
            {activeItem ? (
              <div className="space-y-6">
                {/* Embedded players for Video elements */}
                {(activeItem.type === 'video' || activeItem.type === 'youtube') && (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative">
                    {activeItem.type === 'youtube' ? (
                      <iframe
                        src={getYoutubeEmbedUrl(activeItem.youtube_url)}
                        title={activeItem.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video 
                        src={activeItem.file_path} 
                        controls 
                        className="w-full h-full"
                      />
                    )}
                  </div>
                )}

                {/* PDF and File Document viewer card */}
                {(activeItem.type === 'pdf' || activeItem.type === 'downloadable_file') && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="p-4 bg-zinc-800/80 rounded-full text-emerald-400 mb-4">
                      {activeItem.type === 'pdf' ? <FileText className="w-10 h-10" /> : <Download className="w-10 h-10" />}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100">{activeItem.title}</h3>
                    <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest">{activeItem.type}</p>
                    
                    {activeItem.file_path ? (
                      <a 
                        href={activeItem.file_path} 
                        target="_blank" 
                        rel="noreferrer" 
                        download
                        className="btn-primary mt-6 px-6 py-2.5 flex items-center gap-2 text-xs"
                      >
                        <Download className="w-4 h-4" /> Download File / Notes
                      </a>
                    ) : (
                      <p className="text-zinc-500 text-xs mt-6">No downloadable attachment linked to this document.</p>
                    )}
                  </div>
                )}

                {/* Description details card */}
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                    <h2 className="text-xl font-bold text-zinc-100">{activeItem.title}</h2>
                    <button
                      onClick={() => handleToggleItemComplete(activeItem.id, activeItem.completed === 1)}
                      disabled={savingProgress}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeItem.completed === 1
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {activeItem.completed === 1 ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Completed
                        </>
                      ) : (
                        'Mark Completed'
                      )}
                    </button>
                  </div>
                  <p className="text-zinc-400 text-xs">Subject Material Type: <strong className="uppercase text-zinc-300">{activeItem.type}</strong></p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-zinc-900 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-8">
                <Play className="w-12 h-12 text-zinc-700 mb-3" />
                <h3 className="font-bold text-zinc-400">Select an item</h3>
                <p className="text-zinc-500 text-xs mt-1">Pick a video lesson or study document from the syllabus list on the right side.</p>
              </div>
            )}
          </div>

          {/* Congratulations certificate prompt */}
          {isCourseCompleted && (
            <div className="mt-8 bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-400">Congratulations! Course Completed</h3>
                  <p className="text-xs text-zinc-300">You have completed all materials. Download your Certificate after Master approval.</p>
                </div>
              </div>
              <div>
                {certificate && certificate.status === 'approved' ? (
                  <Link to={`/print-certificate/${certificate.id}`} target="_blank" className="btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-black font-extrabold text-sm py-2.5 px-6 rounded-lg flex items-center gap-2">
                    <Award className="w-5 h-5" /> Print Certificate
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-400 font-bold block bg-zinc-800 border border-zinc-700 py-2.5 px-5 rounded-lg text-center">
                    Certificate Pending Approval
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Subjects & Hierarchical Items Sidebar */}
        <div className="w-full lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col h-auto lg:h-[calc(100vh-140px)]">
          <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Course Syllabus</span>
            <span className="bg-zinc-800 text-[10px] text-zinc-300 font-bold px-2 py-0.5 rounded-full">{items.length} Items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {subjects.length === 0 ? (
              <div className="text-center text-zinc-500 py-12 text-xs">No subjects created for this course.</div>
            ) : (
              subjects.map((sub, sIdx) => {
                const subItems = items.filter(i => i.subject_id === sub.id);
                return (
                  <div key={sub.id} className="space-y-1.5">
                    {/* Subject Header */}
                    <div className="bg-zinc-950/60 rounded-lg p-2.5 border border-zinc-800">
                      <h4 className="text-xs font-bold text-zinc-300 capitalize">
                        {sIdx + 1}. {sub.title}
                      </h4>
                    </div>

                    {/* Subject Items List */}
                    <div className="pl-2 space-y-1.5">
                      {subItems.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 pl-4 py-1 italic">No materials in this subject</p>
                      ) : (
                        subItems.map(item => {
                          const isActive = activeItem?.id === item.id;
                          const isCompleted = item.completed === 1;
                          return (
                            <div 
                              key={item.id}
                              className={`flex gap-2 items-center p-2 rounded-lg border cursor-pointer transition select-none ${
                                isActive 
                                  ? 'bg-zinc-800 border-emerald-500/50' 
                                  : 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-800/40'
                              }`}
                              onClick={() => setActiveItem(item)}
                            >
                              {/* Completion toggle checkbox button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleItemComplete(item.id, isCompleted);
                                }}
                                className="text-zinc-500 hover:text-emerald-400 transition"
                              >
                                {isCompleted ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-500/15" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                {getItemIcon(item.type)}
                                <span className={`text-xs font-medium truncate ${isActive ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                  {item.title}
                                </span>
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
    </div>
  );
}
