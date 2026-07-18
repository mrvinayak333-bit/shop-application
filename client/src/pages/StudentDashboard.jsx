import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, CheckCircle, Play, FileText, Download, ExternalLink, 
  Layers, Award, Check, Loader, Upload, AlertCircle, ShoppingCart, 
  Smartphone, ChevronRight, X, User, MapPin, Calendar, Heart, File, 
  MessageSquare, Send, Bell, Volume2, VolumeX, ShieldCheck, Plus
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api, { getApiBase } from '../lib/api';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : '';
};

export default function StudentDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard & Store states
  const [profile, setProfile] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [storeCourses, setStoreCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-courses'); // my-courses, store, profile, certificates, support
  
  // Curriculum Viewer overlay state
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseSubjects, setCourseSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [curriculumLoading, setCurriculumLoading] = useState(false);

  // Buy course / payment modal state
  const [buyCourse, setBuyCourse] = useState(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dbPaymentMethods, setDbPaymentMethods] = useState([]);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchPaymentMethods = async () => {
    try {
      const res = await api.get('/payment/methods');
      if (res?.success) {
        setDbPaymentMethods(res.methods || []);
        if (res.methods?.length > 0) {
          setPaymentMethod(res.methods[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

  // Profile edit states
  const [profileForm, setProfileForm] = useState({
    name: '',
    fathers_name: '',
    address: '',
    age: '',
    dob: '',
    aadhaar_number: '',
    gender: '',
    email: '',
    mobile: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Help & Support states
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    message: '',
    attachment: null
  });
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadDashboardData();
  }, [authLoading, isAuthenticated, user, navigate, activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my-courses') {
        const [dashRes, annRes] = await Promise.all([
          api.get('/student/dashboard'),
          api.get('/student/announcements')
        ]);
        if (dashRes?.success) {
          setProfile(dashRes.student);
          setMyCourses(dashRes.courses || []);
          populateProfileForm(dashRes.student);
        }
        if (annRes?.success) {
          setAnnouncements(annRes.announcements || []);
        }
      } else if (activeTab === 'store') {
        const [res] = await Promise.all([
          api.get('/student/store'),
          fetchPaymentMethods()
        ]);
        if (res?.success) {
          setStoreCourses(res.courses || []);
        }
      } else if (activeTab === 'profile') {
        const res = await api.get('/student/profile');
        if (res?.success) {
          setProfile(res.profile);
          populateProfileForm(res.profile);
        }
      } else if (activeTab === 'certificates') {
        const res = await api.get('/student/certificates');
        if (res?.success) {
          setCertificates(res.certificates || []);
        }
      } else if (activeTab === 'support') {
        const res = await api.get('/student/support/tickets');
        if (res?.success) {
          setTickets(res.tickets || []);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Server error while loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const populateProfileForm = (p) => {
    if (!p) return;
    setProfileForm({
      name: p.name || '',
      fathers_name: p.fathers_name || '',
      address: p.address || '',
      age: p.age || '',
      dob: p.dob ? p.dob.substring(0, 10) : '',
      aadhaar_number: p.aadhaar_number || '',
      gender: p.gender || '',
      email: p.email || '',
      mobile: p.mobile || ''
    });
  };

  // =====================================================
  // CURRICULUM VIEW & CONTENT PLAYER
  // =====================================================
  const handleOpenCourse = async (course) => {
    setCurriculumLoading(true);
    try {
      const res = await api.get(`/student/course/${course.id}`);
      if (res?.success) {
        setActiveCourse(res.course);
        setCourseSubjects(res.subjects || []);
        if (res.subjects?.length > 0) {
          setSelectedSubjectId(res.subjects[0].id);
          if (res.subjects[0].items?.length > 0) {
            setSelectedItem(res.subjects[0].items[0]);
          } else {
            setSelectedItem(null);
          }
        } else {
          setSelectedSubjectId(null);
          setSelectedItem(null);
        }
      } else {
        showToast(res?.message || 'Failed to load course details', 'error');
      }
    } catch (err) {
      showToast('Error loading course materials', 'error');
    } finally {
      setCurriculumLoading(false);
    }
  };

  const handleToggleItemProgress = async (itemId, currentStatus) => {
    try {
      const res = await api.post(`/student/item/${itemId}/progress`, { completed: !currentStatus });
      if (res?.success) {
        // Update item status in UI
        setCourseSubjects(prevSubjects => 
          prevSubjects.map(sub => ({
            ...sub,
            items: sub.items.map(it => it.id === itemId ? { ...it, completed: res.completed ? 1 : 0 } : it)
          }))
        );
        
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem(prev => ({ ...prev, completed: res.completed ? 1 : 0 }));
        }

        setActiveCourse(prev => ({
          ...prev,
          progress_percentage: res.progress_percentage
        }));

        showToast(res.completed ? 'Marked as completed' : 'Marked as incomplete', 'success');
      }
    } catch (err) {
      showToast('Failed to save progress', 'error');
    }
  };

  // =====================================================
  // COURSE PURCHASE / STORE ACTIONS
  // =====================================================
  const openBuyCourseModal = (course) => {
    setBuyCourse(course);
    setPaymentScreenshot(null);
    setScreenshotPreview('');
    setPaymentMethod('upi');
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPaymentScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!paymentScreenshot) return showToast('Please upload payment proof screenshot', 'error');

    setSubmittingPayment(true);
    const formData = new FormData();
    formData.append('courseId', buyCourse.id);
    formData.append('paymentMethod', paymentMethod);
    formData.append('screenshot', paymentScreenshot);

    try {
      const res = await api.upload('/student/purchase', formData);
      if (res?.success) {
        showToast(res.message || 'Purchase request submitted successfully!', 'success');
        setBuyCourse(null);
        setActiveTab('my-courses');
      } else {
        showToast(res?.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast('Error uploading payment proof', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // =====================================================
  // PROFILE UPDATE OPERATIONS
  // =====================================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/student/profile', profileForm);
      if (res?.success) {
        showToast('Profile updated successfully!', 'success');
        loadDashboardData();
      } else {
        showToast(res?.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Server error updating profile', 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await api.upload('/student/profile/photo', formData);
      if (res?.success) {
        setProfile(prev => ({ ...prev, profile_photo: res.filePath }));
        showToast('Profile photo updated successfully!', 'success');
      } else {
        showToast(res?.message || 'Photo upload failed', 'error');
      }
    } catch (err) {
      showToast('Error uploading photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // =====================================================
  // SUPPORT TICKETS OPERATIONS
  // =====================================================
  const handleOpenTicket = async (ticket) => {
    setActiveTicket(ticket);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/student/support/tickets/${ticket.id}/messages`);
      if (res?.success) {
        setTicketMessages(res.messages || []);
      }
    } catch (e) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
      return showToast('Subject and message are required', 'warning');
    }
    setSubmittingTicket(true);
    const formData = new FormData();
    formData.append('subject', newTicketForm.subject);
    formData.append('message', newTicketForm.message);
    if (newTicketForm.attachment) {
      formData.append('attachment', newTicketForm.attachment);
    }
    try {
      const res = await api.upload('/student/support/tickets', formData);
      if (res?.success) {
        showToast('Support ticket created successfully!', 'success');
        setNewTicketForm({ subject: '', message: '', attachment: null });
        setShowCreateTicket(false);
        // Reload ticket list
        const ticketsRes = await api.get('/student/support/tickets');
        if (ticketsRes?.success) setTickets(ticketsRes.tickets || []);
      }
    } catch (e) {
      showToast('Failed to open ticket', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() && !replyAttachment) return;
    try {
      const formData = new FormData();
      formData.append('message', replyMessage);
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      const res = await api.upload(`/student/support/tickets/${activeTicket.id}/messages`, formData);
      if (res?.success) {
        setReplyMessage('');
        setReplyAttachment(null);
        // Reload messages
        const msgRes = await api.get(`/student/support/tickets/${activeTicket.id}/messages`);
        if (msgRes?.success) setTicketMessages(msgRes.messages || []);
      }
    } catch (e) {
      showToast('Failed to send message', 'error');
    }
  };

  if (loading && !activeCourse) return <div className="min-h-screen bg-gray-50"><Navbar /><Loading /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <ToastContainer />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* STUDENT PROFILE SUMMARY */}
        {profile && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/50 overflow-hidden flex items-center justify-center relative group">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-[10px] font-bold">
                  Edit
                  <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                </label>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-white px-2.5 py-1 rounded">Student Member</span>
                <h1 className="text-2xl font-bold mt-2">{profile.name}</h1>
                <p className="text-blue-100 text-xs mt-1">Student ID: {profile.student_code} • {profile.mobile || profile.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs bg-black/10 rounded-xl p-3 border border-white/10 font-mono">
              <Smartphone className="w-4 h-4 text-blue-300" />
              <div>
                <p className="text-white/60">Registered Device ID:</p>
                <p className="text-white truncate max-w-[200px]" title={profile.android_device_id}>
                  {profile.android_device_id || 'Will bind on first phone login'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY TABS */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-8 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('my-courses')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'my-courses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <BookOpen className="w-4 h-4" /> My Courses
          </button>
          <button 
            onClick={() => setActiveTab('store')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'store' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <ShoppingCart className="w-4 h-4" /> Achievements (Store)
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <User className="w-4 h-4" /> Profile Info
          </button>
          <button 
            onClick={() => setActiveTab('certificates')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'certificates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Award className="w-4 h-4" /> Certificates
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'support' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <MessageSquare className="w-4 h-4" /> Support Tickets
          </button>
        </div>

        {/* =====================================================
            TAB: MY COURSES & ANNOUNCEMENTS
            ===================================================== */}
        {activeTab === 'my-courses' && (
          <div className="space-y-8">
            {/* Announcements Broadcast board */}
            {announcements.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5"><Bell className="w-4 h-4 text-amber-700" /> 📢 Institute Announcements</h3>
                <div className="divide-y divide-amber-200 max-h-40 overflow-y-auto space-y-2 pr-2">
                  {announcements.map(ann => (
                    <div key={ann.id} className="pt-2 text-xs text-amber-800">
                      <p className="font-bold">{ann.title}</p>
                      <p className="mt-1 leading-relaxed text-amber-900/80">{ann.content}</p>
                      <span className="text-[10px] text-amber-500 font-mono mt-1 block">{new Date(ann.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
                       {myCourses.length === 0 ? (
              <div className="text-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/85 rounded-3xl py-20 px-6 shadow-sm">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Start Your Learning Journey</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  You haven't enrolled in any courses yet. Browse our professional catalog under the **Achievements (Store)** tab to get started!
                </p>
                <button
                  onClick={() => setActiveTab('store')}
                  className="mt-6 bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-2xl hover:bg-emerald-700 transition"
                >
                  Explore Course Store
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myCourses.map(course => {
                  const progress = course.progress_percentage || 0;
                  let progressStatus = 'Not Started';
                  let statusBg = 'bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-350';
                  if (progress === 100) {
                    progressStatus = 'Completed';
                    statusBg = 'bg-green-55 bg-green-50/50 text-green-600 dark:bg-green-950/20 dark:text-green-400';
                  } else if (progress > 0) {
                    progressStatus = 'In Progress';
                    statusBg = 'bg-blue-50/50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
                  }
                  
                  const formattedDate = course.purchase_date 
                    ? new Date(course.purchase_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Recently';

                  return (
                    <div key={course.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden flex flex-col sm:flex-row hover:shadow-xl hover:-translate-y-0.5 transition duration-300">
                      <div className="w-full sm:w-44 h-40 sm:h-auto bg-slate-100 dark:bg-slate-750 flex-shrink-0 relative overflow-hidden flex items-center justify-center border-b sm:border-b-0 sm:border-r dark:border-slate-750">
                        {course.banner_image ? (
                          <img src={course.banner_image} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-slate-400" />
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-black text-slate-800 dark:text-white text-base leading-snug line-clamp-1">{course.title}</h3>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${statusBg}`}>
                              {progressStatus}
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{course.description || 'Includes repair videos and PDF resources.'}</p>
                          
                          <div className="mt-4 flex items-center justify-between text-xs text-slate-450 dark:text-slate-400">
                            <span className="font-semibold">Purchased: {formattedDate}</span>
                            <span className="font-bold">{progress}% Completed</span>
                          </div>
                          
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-slate-350 dark:bg-slate-500'
                              }`} 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleOpenCourse(course)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-1.5 transition"
                        >
                          {progress === 0 ? 'Start Learning' : 'Continue Learning'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TAB: COURSE STORE
            ===================================================== */}
        {activeTab === 'store' && (
          <div>
            {storeCourses.length === 0 ? (
              <div className="text-center bg-white border border-gray-100 rounded-2xl py-16 px-4 shadow-sm">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No New Courses</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Wow! You have unlocked or purchased all courses available in the system catalog! Stay tuned for upcoming new modules.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center border-b">
                        {course.banner_image ? (
                          <img src={course.banner_image} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-10 h-10 text-gray-300" />
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{course.title}</h3>
                        <p className="text-gray-500 text-xs mt-2 line-clamp-3 leading-relaxed">{course.description}</p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 mt-2">
                      <div className="flex items-center justify-between border-t pt-3 mb-4 bg-gray-50 p-2.5 rounded-lg border">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Premium Access</span>
                        <span className="text-lg font-black text-blue-600">₹{course.price}</span>
                      </div>
                      <button 
                        onClick={() => openBuyCourseModal(course)}
                        className="w-full btn-primary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
                      >
                        <ShoppingCart className="w-4 h-4" /> Buy Course
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TAB: PROFILE MANAGEMENT
            ===================================================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Personal Student Profile
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Full Student Name *</label>
                  <input 
                    type="text" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Father's Name (Optional)</label>
                  <input 
                    type="text" 
                    value={profileForm.fathers_name} 
                    onChange={e => setProfileForm({ ...profileForm, fathers_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Aadhaar Card Number</label>
                  <input 
                    type="text" 
                    value={profileForm.aadhaar_number} 
                    onChange={e => setProfileForm({ ...profileForm, aadhaar_number: e.target.value })}
                    placeholder="12-digit Aadhaar Number"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Gender</label>
                  <select 
                    value={profileForm.gender} 
                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Age</label>
                  <input 
                    type="number" 
                    value={profileForm.age} 
                    onChange={e => setProfileForm({ ...profileForm, age: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={profileForm.dob} 
                    onChange={e => {
                      const dobVal = e.target.value;
                      const calculatedAge = calculateAge(dobVal);
                      setProfileForm({ ...profileForm, dob: dobVal, age: calculatedAge });
                    }}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Mobile Number *</label>
                  <input 
                    type="text" 
                    value={profileForm.mobile} 
                    onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={profileForm.email} 
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Full Address</label>
                  <textarea 
                    value={profileForm.address} 
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end">
                <button type="submit" className="btn-primary py-2.5 px-6 rounded-xl font-bold">
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================
            TAB: CERTIFICATES
            ===================================================== */}
        {activeTab === 'certificates' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> Academic Certificates & Completed Modules
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-600 font-semibold">
                    <th className="px-4 py-3">Course Module</th>
                    <th className="px-4 py-3">Certificate Code</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {certificates.map(cert => (
                    <tr key={cert.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{cert.course_title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{cert.certificate_number}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(cert.issue_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cert.status === 'approved' ? 'bg-green-100 text-green-800' : cert.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {cert.status === 'approved' ? 'Active' : cert.status === 'pending_approval' ? 'Pending Approval' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cert.status === 'approved' ? (
                          <a 
                            href={`${getApiBase()}/student/certificates/${cert.id}/html?print=true`}
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Print / PDF
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Awaiting Approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {certificates.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-gray-500">
                        No certificates generated yet. Complete 100% of an assigned course modules to request a certificate automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================
            TAB: HELP & SUPPORT TICKETS
            ===================================================== */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
            {/* Tickets Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Tickets</h3>
                <button 
                  onClick={() => { setShowCreateTicket(true); setActiveTicket(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Open Ticket
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {tickets.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => { handleOpenTicket(t); setShowCreateTicket(false); }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${activeTicket?.id === t.id ? 'border-blue-600 bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-amber-100 text-amber-800' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-bold text-xs text-gray-900 truncate">{t.subject}</p>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-12">No support tickets.</p>
                )}
              </div>
            </div>

            {/* Ticket Messages Pane */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[400px]">
              {showCreateTicket ? (
                /* Create Ticket form */
                <form onSubmit={handleCreateTicket} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-sm">Create Support Ticket</h3>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Subject Topic *</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Query about Display Testing video"
                        value={newTicketForm.subject}
                        onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Explain your issue *</label>
                      <textarea 
                        placeholder="Please details your query..."
                        value={newTicketForm.message}
                        onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                        rows="4"
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Attachment (Optional screenshot)</label>
                      <input 
                        type="file" 
                        onChange={e => setNewTicketForm({ ...newTicketForm, attachment: e.target.files[0] })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 flex gap-3">
                    <button type="submit" disabled={submittingTicket} className="flex-1 btn-primary py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {submittingTicket ? <Loader className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
                    </button>
                    <button type="button" onClick={() => setShowCreateTicket(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl font-bold transition">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : activeTicket ? (
                /* Ticket Messages list & reply */
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="border-b pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{activeTicket.subject}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Ticket ID: #{activeTicket.id}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${activeTicket.status === 'open' ? 'bg-amber-100 text-amber-800' : activeTicket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {activeTicket.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Messages Scroll Box */}
                  <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2 mb-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div>
                    ) : (
                      ticketMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'student' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded-2xl max-w-xs ${msg.sender_role === 'student' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                            <p className="text-xs whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachment_path && (
                              <div className="mt-2 pt-2 border-t border-white/20">
                                <a 
                                  href={msg.attachment_path} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="inline-flex items-center gap-1 text-[10px] text-blue-200 hover:text-white underline font-semibold"
                                >
                                  <File className="w-3 h-3" /> View Attachment
                                </a>
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] text-gray-400 font-mono mt-1">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Reply box */}
                  {activeTicket.status !== 'resolved' ? (
                    <form onSubmit={handleSendReply} className="border-t pt-3 flex gap-2">
                      <div className="flex-1 flex gap-2 border rounded-xl px-3 py-1.5 items-center bg-gray-50">
                        <input 
                          type="text" 
                          placeholder="Type your message reply..."
                          value={replyMessage}
                          onChange={e => setReplyMessage(e.target.value)}
                          className="flex-1 text-xs bg-transparent focus:outline-none"
                        />
                        <label className="cursor-pointer text-gray-400 hover:text-gray-600">
                          <Upload className="w-4 h-4" />
                          <input type="file" onChange={e => setReplyAttachment(e.target.files[0])} className="hidden" />
                        </label>
                      </div>
                      <button type="submit" className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-green-50 text-green-700 text-xs font-bold text-center rounded-xl border border-green-200">
                      ✓ This ticket is resolved. Open a new support ticket if you have more questions.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex-1 flex items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-dashed">
                  <div>
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-medium">Select a ticket from the sidebar or click "Open Ticket" to query the admin.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* =====================================================
          FULL OVERLAY: CURRICULUM & MATERIAL PLAYER
          ===================================================== */}
      {activeCourse && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row h-screen overflow-hidden">
          
          {/* LEFT CURRICULUM SIDEBAR */}
          <div className="w-full md:w-80 bg-gray-900 text-white flex flex-col justify-between border-r border-gray-800 flex-shrink-0 h-1/2 md:h-full">
            <div className="flex flex-col min-h-0 flex-1">
              {/* Header */}
              <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate leading-snug">{activeCourse.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${activeCourse.progress_percentage}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">{activeCourse.progress_percentage}%</span>
                  </div>
                </div>
                <button 
                  onClick={() => { setActiveCourse(null); setSelectedItem(null); loadDashboardData(); }}
                  className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subject & Items Tree */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {courseSubjects.map((sub, idx) => (
                  <div key={sub.id} className="space-y-1">
                    <button 
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`w-full text-left font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-between border transition ${selectedSubjectId === sub.id ? 'bg-blue-600/10 border-blue-600/30 text-blue-400' : 'border-transparent text-gray-300 hover:bg-gray-800'}`}
                    >
                      <span className="truncate">{idx + 1}. {sub.title}</span>
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">{sub.items?.length || 0}</span>
                    </button>

                    {selectedSubjectId === sub.id && (
                      <div className="pl-4 space-y-1 mt-1 border-l border-gray-800 ml-3">
                        {sub.items?.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition min-w-0 ${selectedItem?.id === item.id ? 'bg-gray-800 text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {item.type === 'video' && <Play className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                              {item.type === 'youtube' && <ExternalLink className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                              {item.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                              {item.type === 'downloadable_file' && <Download className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                              <span className="truncate">{item.title}</span>
                            </div>
                            
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleItemProgress(item.id, item.completed === 1); }}
                              className={`p-1 rounded flex-shrink-0 transition border ${item.completed === 1 ? 'bg-green-600 border-green-600 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-white'}`}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-950/50 text-[10px] text-gray-500 text-center">
              SHREE RAAM MOBILE • LMS v2.0
            </div>
          </div>

          {/* RIGHT PLAY CONTENT PANEL */}
          <div className="flex-1 bg-gray-100 flex flex-col h-1/2 md:h-full overflow-hidden">
            {selectedItem ? (
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                
                {/* Player Header */}
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-gray-50">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {selectedItem.type.replace('_', ' ')}
                    </span>
                    <h2 className="text-base font-bold text-gray-900 mt-1">{selectedItem.title}</h2>
                  </div>
                  <button 
                    onClick={() => handleToggleItemProgress(selectedItem.id, selectedItem.completed === 1)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${selectedItem.completed === 1 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                  >
                    <CheckCircle className={`w-4 h-4 ${selectedItem.completed === 1 ? 'text-green-600' : 'text-gray-400'}`} />
                    {selectedItem.completed === 1 ? 'Completed' : 'Mark Completed'}
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col items-center justify-center bg-gray-900/5">
                  {selectedItem.type === 'video' && selectedItem.file_path && (
                    <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                      <video src={selectedItem.file_path} controls className="w-full h-full object-contain" />
                    </div>
                  )}

                  {selectedItem.type === 'youtube' && selectedItem.youtube_url && (
                    <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                      {(() => {
                        let videoId = '';
                        const url = selectedItem.youtube_url;
                        if (url.includes('v=')) {
                          videoId = url.split('v=')[1].split('&')[0];
                        } else if (url.includes('youtu.be/')) {
                          videoId = url.split('youtu.be/')[1].split('?')[0];
                        } else if (url.includes('embed/')) {
                          videoId = url.split('embed/')[1].split('?')[0];
                        }
                        
                        return videoId ? (
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}`} 
                            title={selectedItem.title}
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm">
                            Invalid Link: <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 ml-1 underline">{url}</a>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedItem.type === 'pdf' && selectedItem.file_path && (
                    <div className="w-full max-w-4xl h-full flex flex-col items-center justify-between bg-white rounded-xl shadow border p-4">
                      <iframe src={selectedItem.file_path} title={selectedItem.title} className="w-full flex-1 border rounded" />
                      <div className="w-full flex items-center justify-between mt-4">
                        <p className="text-xs text-gray-500">Study PDF Notes</p>
                        <a href={selectedItem.file_path} download className="btn-primary py-2 px-4 text-xs font-bold rounded-xl flex items-center gap-1 shadow">
                          <Download className="w-4 h-4" /> Download PDF
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'downloadable_file' && selectedItem.file_path && (
                    <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center shadow-lg">
                      <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="font-bold text-gray-900 text-lg">{selectedItem.title}</h3>
                      <a href={selectedItem.file_path} download className="btn-primary mt-6 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md">
                        <Download className="w-4.5 h-4.5" /> Download Materials Package
                      </a>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 text-center h-full">
                <div>
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-base">Select Lesson Content</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">Select a subject chapter on the left sidebar to access materials.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =====================================================
          MODAL: BUY COURSE / PAYMENT SCREENSHOT SUBMISSION
          ===================================================== */}
      {buyCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Unlock: {buyCourse.title}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Please pay ₹{buyCourse.price} and upload proof below.</p>
              </div>
              <button onClick={() => setBuyCourse(null)} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg">✕</button>
            </div>
            
            <form onSubmit={handleSubmitPurchase} className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-gray-700">
              {(() => {
                const selectedPaymentMethodObj = dbPaymentMethods.find(m => m.name === paymentMethod) || dbPaymentMethods[0];
                return (
                  <>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-blue-900 text-xs">Merchant Payment Details:</h4>
                      {selectedPaymentMethodObj ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-blue-900">
                            <span>Method:</span>
                            <span>{selectedPaymentMethodObj.name} ({selectedPaymentMethodObj.type.toUpperCase()})</span>
                          </div>
                          {selectedPaymentMethodObj.type === 'upi' && selectedPaymentMethodObj.upi_id && (
                            <div className="flex justify-between items-center pt-1 border-t border-blue-200">
                              <span className="text-blue-700">UPI ID:</span>
                              <span className="font-mono font-bold text-blue-800">{selectedPaymentMethodObj.upi_id}</span>
                            </div>
                          )}
                          {(selectedPaymentMethodObj.type === 'card' || selectedPaymentMethodObj.type === 'netbanking') && (
                            <>
                              <div className="flex justify-between pt-1 border-t border-blue-200">
                                <span className="text-blue-700">Account No:</span>
                                <span className="font-mono font-semibold text-gray-800">{selectedPaymentMethodObj.bank_account || 'N/A'}</span>
                              </div>
                              {selectedPaymentMethodObj.ifsc_code && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">IFSC Code:</span>
                                  <span className="font-mono font-semibold text-gray-800">{selectedPaymentMethodObj.ifsc_code}</span>
                                </div>
                              )}
                            </>
                          )}
                          {selectedPaymentMethodObj.type === 'cash' && (
                            <div className="pt-1 border-t border-blue-200 text-center text-[11px] text-blue-800 font-semibold">
                              Please pay in cash at our local shop location to get enrollment approved.
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-blue-700">Loading merchant details...</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Select Payment Method</label>
                      <select 
                        value={paymentMethod} 
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      >
                        {dbPaymentMethods.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                        {dbPaymentMethods.length === 0 && (
                          <option value="">No payment methods configured</option>
                        )}
                      </select>
                    </div>
                  </>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Upload Receipt Screenshot *</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative">
                  {screenshotPreview ? (
                    <div className="w-full flex flex-col items-center gap-2">
                      <img src={screenshotPreview} alt="Receipt preview" className="max-h-36 object-contain rounded border" />
                      <button 
                        type="button" 
                        onClick={() => { setPaymentScreenshot(null); setScreenshotPreview(''); }}
                        className="text-xs text-red-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="w-full flex flex-col items-center justify-center cursor-pointer py-4">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs font-semibold text-gray-600">Select payment screenshot image</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleScreenshotChange} 
                        className="hidden" 
                        required
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button 
                  type="submit" 
                  disabled={submittingPayment || !paymentScreenshot}
                  className="flex-1 btn-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {submittingPayment ? <Loader className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setBuyCourse(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
