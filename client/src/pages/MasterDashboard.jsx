import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wrench, Clock, DollarSign, BookOpen, Briefcase, TrendingUp, Plus, Edit, Trash2, Lock, Unlock, Key, Eye, EyeOff, Search, Shield, UserCheck, Activity, Settings, ChevronRight, X, RefreshCw, Download, CreditCard, Image, Globe, FileText, Calendar, Landmark, Wallet, Award, MessageSquare, Megaphone, Send, Check, Smartphone, Printer } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import RepairingCoursePurchase from '../components/RepairingCoursePurchase';
import CustomerTrackingList from '../components/CustomerTrackingList';
import MasterSettingsCenter from '../components/MasterSettingsCenter';
import MasterCertificationDashboard from '../components/MasterCertificationDashboard';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'customer_tracking', label: 'Customer Tracking & Thermal Print', icon: Printer },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'technicians', label: 'Technicians', icon: Wrench },
  { id: 'staff', label: 'Staff Members', icon: Shield },
  { id: 'students', label: 'Students', icon: BookOpen },
  { id: 'courses', label: 'Courses', icon: FileText },
  { id: 'repairing-course', label: 'Repairing Course', icon: BookOpen },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'support', label: 'Support Tickets', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
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
  const [staff, setStaff] = useState([]);
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

  // Certificate template states
  const [certPending, setCertPending] = useState([]);
  const [certTemplate, setCertTemplate] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Ticket states
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketReplyMsg, setTicketReplyMsg] = useState('');
  const [ticketReplyFile, setTicketReplyFile] = useState(null);
  const [ticketReplyFilePreview, setTicketReplyFilePreview] = useState('');
  const [sendingTicketReply, setSendingTicketReply] = useState(false);
  const [loadingTicketMessages, setLoadingTicketMessages] = useState(false);

  // Announcement states
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetType, setAnnTargetType] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  // New course syllabus & material states
  const [syllabusCourse, setSyllabusCourse] = useState(null);
  const [syllabusSubjects, setSyllabusSubjects] = useState([]);
  const [syllabusItems, setSyllabusItems] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectOrder, setNewSubjectOrder] = useState(0);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('video');
  const [newMaterialFile, setNewMaterialFile] = useState(null);
  const [newMaterialYoutubeUrl, setNewMaterialYoutubeUrl] = useState('');
  const [newMaterialOrder, setNewMaterialOrder] = useState(0);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Courses sub-tab controls
  const [coursesSubTab, setCoursesSubTab] = useState('courses'); // courses, assign, purchases
  const [coursePurchases, setCoursePurchases] = useState([]);
  const [selectedBulkStudents, setSelectedBulkStudents] = useState([]);
  const [selectedBulkCourses, setSelectedBulkCourses] = useState([]);

  // Manual Purchase Form State
  const [showManualPurchaseModal, setShowManualPurchaseModal] = useState(false);
  const [manualPurchaseStudentId, setManualPurchaseStudentId] = useState('');
  const [manualPurchaseCourseId, setManualPurchaseCourseId] = useState('');
  const [manualPurchaseAmount, setManualPurchaseAmount] = useState('');
  const [manualPurchaseMethod, setManualPurchaseMethod] = useState('cash');
  const [savingManualPurchase, setSavingManualPurchase] = useState(false);

  // Customer Control & Manual Password Reset state
  const [customerPasswordModalOpen, setCustomerPasswordModalOpen] = useState(false);
  const [selectedCustomerForPassword, setSelectedCustomerForPassword] = useState(null);
  const [manualCustomerPassword, setManualCustomerPassword] = useState('');
  const [savingCustomerPassword, setSavingCustomerPassword] = useState(false);

  const loadCertPending = async () => {
    try {
      const res = await api.get('/master/certificate/pending');
      if (res && res.success) setCertPending(res.certificates || []);
    } catch (err) { showToast('Error loading certificate requests', 'error'); }
  };

  const loadCertTemplate = async () => {
    try {
      const res = await api.get('/master/certificate/templates');
      if (res && res.success) setCertTemplate(res.template || null);
    } catch (err) { console.error(err); }
  };

  const loadSupportTickets = async () => {
    try {
      const res = await api.get('/master/support/tickets');
      if (res && res.success) setSupportTickets(res.tickets || []);
    } catch (err) { showToast('Error loading support tickets', 'error'); }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await api.get('/master/announcements');
      if (res && res.success) setAnnouncements(res.announcements || []);
    } catch (err) { showToast('Error loading announcements', 'error'); }
  };

  const handleApproveCertificate = async (certId, status) => {
    try {
      const res = await api.put(`/master/certificate/${certId}/approve`, { status });
      if (res && res.success) {
        showToast(`Certificate ${status} successfully!`, 'success');
        loadCertPending();
      } else {
        showToast(res?.message || 'Action failed', 'error');
      }
    } catch (err) {
      showToast('Error approving certificate', 'error');
    }
  };

  const handleReissueCertificate = async (certId) => {
    try {
      const res = await api.post(`/master/certificate/${certId}/reissue`);
      if (res && res.success) {
        showToast(`Certificate reissued successfully!`, 'success');
        loadCertPending();
      } else {
        showToast(res?.message || 'Reissue failed', 'error');
      }
    } catch (err) {
      showToast('Error reissuing certificate', 'error');
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      if (templateFile) formData.append('template_file', templateFile);
      if (logoFile) formData.append('institute_logo', logoFile);
      if (sigFile) formData.append('institute_signature', sigFile);

      const res = await api.upload('/master/certificate/template', formData);
      if (res && res.success) {
        showToast('Template uploaded successfully!', 'success');
        setTemplateFile(null);
        setLogoFile(null);
        setSigFile(null);
        loadCertTemplate();
      } else {
        showToast(res?.message || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Error uploading assets', 'error');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setActiveTicket(ticket);
    setLoadingTicketMessages(true);
    try {
      const res = await api.get(`/master/support/tickets/${ticket.id}`);
      if (res && res.success) {
        setTicketMessages(res.messages || []);
      }
    } catch (err) {
      showToast('Error loading ticket thread', 'error');
    } finally {
      setLoadingTicketMessages(false);
    }
  };

  const handleTicketReplySubmit = async (e) => {
    e.preventDefault();
    if (!ticketReplyMsg.trim() && !ticketReplyFile) return;
    setSendingTicketReply(true);
    try {
      const formData = new FormData();
      formData.append('message', ticketReplyMsg);
      if (ticketReplyFile) {
        formData.append('screenshot', ticketReplyFile);
      }
      const res = await api.upload(`/master/support/tickets/${activeTicket.id}/reply`, formData);
      if (res && res.success) {
        setTicketReplyMsg('');
        setTicketReplyFile(null);
        setTicketReplyFilePreview('');
        // Reload messages
        const threadRes = await api.get(`/master/support/tickets/${activeTicket.id}`);
        if (threadRes && threadRes.success) {
          setTicketMessages(threadRes.messages || []);
        }
      } else {
        showToast(res?.message || 'Failed to send reply', 'error');
      }
    } catch (err) {
      showToast('Error sending reply', 'error');
    } finally {
      setSendingTicketReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, nextStatus) => {
    try {
      const res = await api.put(`/master/support/tickets/${ticketId}/status`, { status: nextStatus });
      if (res && res.success) {
        showToast(`Ticket status updated to ${nextStatus}`, 'success');
        loadSupportTickets();
        if (activeTicket && activeTicket.id === ticketId) {
          setActiveTicket(prev => ({ ...prev, status: nextStatus }));
        }
      } else {
        showToast(res?.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return showToast('Title and content are required', 'error');
    setCreatingAnnouncement(true);
    try {
      const res = await api.post('/master/announcements', {
        title: annTitle,
        content: annContent,
        target_type: annTargetType,
        studentIds: selectedStudentIds
      });
      if (res && res.success) {
        showToast('Announcement broadcasted successfully!', 'success');
        setAnnTitle('');
        setAnnContent('');
        setAnnTargetType('all');
        setSelectedStudentIds([]);
        loadAnnouncements();
      } else {
        showToast(res?.message || 'Failed to create announcement', 'error');
      }
    } catch (err) {
      showToast('Error creating announcement', 'error');
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleToggleStudentSelect = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds(prev => [...prev, studentId]);
    }
  };

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

  const loadStaff = async () => {
    const res = await api.get('/master/staff');
    if (res.success) setStaff(res.staff);
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
    if (activeTab === 'staff') loadStaff();
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'courses') loadCourses();
    if (activeTab === 'certificates') { loadCertPending(); loadCertTemplate(); }
    if (activeTab === 'support') { loadSupportTickets(); }
    if (activeTab === 'announcements') { loadAnnouncements(); loadStudents(); }
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

  const handleSaveCourse = async (form, thumbnailFile) => {
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description || '');
      fd.append('price', parseFloat(form.price) || 0);
      fd.append('is_free', form.is_free ? 1 : 0);
      fd.append('status', form.status || 'active');
      if (thumbnailFile) {
        fd.append('thumbnail', thumbnailFile);
      }

      let res;
      if (editItem) {
        res = await api.upload(`/course/manage/${editItem.id}`, fd);
      } else {
        res = await api.upload('/course/manage', fd);
      }

      if (res && res.success) {
        showToast(editItem ? 'Course updated successfully' : 'Course created successfully', 'success');
        loadCourses();
        setModalOpen(false);
      } else {
        showToast(res?.message || 'Failed to save course', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error saving course', 'error');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course? All subjects, items, and enrollments will be lost.')) return;
    const res = await api.delete(`/course/manage/${id}`);
    if (res.success) { showToast('Course deleted'); loadCourses(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleTogglePublished = async (c) => {
    const nextStatus = c.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/course/manage/${c.id}`, { status: nextStatus });
    if (res.success) loadCourses(); else showToast(res.message || 'Failed', 'error');
  };

  // Bulk enrollment handler
  const handleBulkAssign = async () => {
    if (selectedBulkStudents.length === 0 || selectedBulkCourses.length === 0) {
      return showToast('Select at least one student and one course', 'error');
    }
    try {
      const res = await api.post('/course/manage/assign', {
        studentIds: selectedBulkStudents,
        courseIds: selectedBulkCourses
      });
      if (res && res.success) {
        showToast('Courses Assigned Successfully', 'success');
        setSelectedBulkStudents([]);
        setSelectedBulkCourses([]);
        loadCourses();
        loadStudents();
      } else {
        showToast(res?.message || 'Bulk assignment failed', 'error');
      }
    } catch(err) {
      console.error('Bulk assignment error:', err);
      showToast('Error performing bulk assignment', 'error');
    }
  };

  // Device reset handler
  const handleResetDevice = async (studentId) => {
    if (!confirm('Are you sure you want to reset this student\'s registered Android device binding?')) return;
    try {
      const res = await api.put(`/master/students/${studentId}/reset-device`);
      if (res && res.success) {
        showToast('Android device binding reset successfully', 'success');
        loadStudents();
      } else {
        showToast(res?.message || 'Failed to reset device binding', 'error');
      }
    } catch (err) {
      showToast('Error resetting device binding', 'error');
    }
  };

  // Purchase Approvals
  const loadPurchases = async () => {
    try {
      const res = await api.get('/course/manage/purchases');
      if (res && res.success) setCoursePurchases(res.purchases || []);
    } catch(err) {
      console.error(err);
    }
  };

  const handleApprovePurchase = async (purchaseId, status) => {
    try {
      const res = await api.put(`/course/manage/purchases/${purchaseId}`, { status });
      if (res && res.success) {
        showToast(`Purchase request ${status} successfully`, 'success');
        loadPurchases();
      } else {
        showToast(res?.message || 'Failed to update status', 'error');
      }
    } catch(err) {
      showToast('Error updating status', 'error');
    }
  };

  const handleSaveManualPurchase = async (e) => {
    e.preventDefault();
    if (!manualPurchaseStudentId || !manualPurchaseCourseId) {
      return showToast('Select both student and course', 'error');
    }
    setSavingManualPurchase(true);
    try {
      const res = await api.post('/course/manage/purchases/manual', {
        student_id: manualPurchaseStudentId,
        course_id: manualPurchaseCourseId,
        amount_paid: manualPurchaseAmount ? parseFloat(manualPurchaseAmount) : undefined,
        payment_method: manualPurchaseMethod,
        status: 'approved'
      });
      if (res && res.success) {
        showToast('Purchase filed and approved successfully!', 'success');
        setShowManualPurchaseModal(false);
        setManualPurchaseStudentId('');
        setManualPurchaseCourseId('');
        setManualPurchaseAmount('');
        loadPurchases();
      } else {
        showToast(res?.message || 'Failed to file purchase', 'error');
      }
    } catch (err) {
      showToast('Error filing purchase', 'error');
    } finally {
      setSavingManualPurchase(false);
    }
  };

  // Syllabus & Syllabus Items Manager methods
  const loadSyllabus = async (course) => {
    setSyllabusCourse(course);
    setActiveSubject(null);
    setSyllabusItems([]);
    try {
      const res = await api.get(`/course/manage/${course.id}/subjects`);
      if (res && res.success) {
        setSyllabusSubjects(res.subjects || []);
      }
    } catch(err) {
      showToast('Error loading course subjects', 'error');
    }
  };

  const loadSubjectItems = async (subject) => {
    setActiveSubject(subject);
    try {
      const res = await api.get(`/course/manage/subject/${subject.id}/items`);
      if (res && res.success) {
        setSyllabusItems(res.items || []);
      }
    } catch(err) {
      showToast('Error loading subject items', 'error');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectTitle) return;
    try {
      const res = await api.post(`/course/manage/${syllabusCourse.id}/subject`, {
        title: newSubjectTitle,
        display_order: newSubjectOrder
      });
      if (res && res.success) {
        showToast('Subject created successfully', 'success');
        setNewSubjectTitle('');
        setNewSubjectOrder(0);
        // Refresh subjects
        const subRes = await api.get(`/course/manage/${syllabusCourse.id}/subjects`);
        if (subRes && subRes.success) setSyllabusSubjects(subRes.subjects || []);
      }
    } catch(err) {
      showToast('Error creating subject', 'error');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to delete this subject and all its materials?')) return;
    try {
      const res = await api.delete(`/course/manage/subject/${subjectId}`);
      if (res && res.success) {
        showToast('Subject deleted successfully', 'success');
        if (activeSubject?.id === subjectId) {
          setActiveSubject(null);
          setSyllabusItems([]);
        }
        // Refresh subjects
        const subRes = await api.get(`/course/manage/${syllabusCourse.id}/subjects`);
        if (subRes && subRes.success) setSyllabusSubjects(subRes.subjects || []);
      }
    } catch(err) {
      showToast('Error deleting subject', 'error');
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialTitle) return showToast('Title is required', 'error');
    if (newMaterialType !== 'youtube' && !newMaterialFile) return showToast('Please select a file', 'error');
    if (newMaterialType === 'youtube' && !newMaterialYoutubeUrl) return showToast('YouTube URL is required', 'error');
    
    setUploadingMaterial(true);

    try {
      const fd = new FormData();
      fd.append('title', newMaterialTitle);
      fd.append('type', newMaterialType);
      fd.append('display_order', newMaterialOrder);
      if (newMaterialType === 'youtube') {
        fd.append('youtube_url', newMaterialYoutubeUrl);
      } else {
        fd.append('file', newMaterialFile);
      }

      const res = await api.upload(`/course/manage/subject/${activeSubject.id}/item`, fd);
      if (res && res.success) {
        showToast('Material added successfully', 'success');
        setNewMaterialTitle('');
        setNewMaterialFile(null);
        setNewMaterialYoutubeUrl('');
        setNewMaterialOrder(0);
        // Refresh items
        const itemRes = await api.get(`/course/manage/subject/${activeSubject.id}/items`);
        if (itemRes && itemRes.success) setSyllabusItems(itemRes.items || []);
      } else {
        showToast(res?.message || 'Failed to upload material', 'error');
      }
    } catch(err) {
      showToast('Error uploading material', 'error');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (itemId) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await api.delete(`/course/manage/subject-item/${itemId}`);
      if (res && res.success) {
        showToast('Material deleted successfully', 'success');
        // Refresh items
        const itemRes = await api.get(`/course/manage/subject/${activeSubject.id}/items`);
        if (itemRes && itemRes.success) setSyllabusItems(itemRes.items || []);
      }
    } catch(err) {
      showToast('Error deleting material', 'error');
    }
  };

  const openCreateModal = (type) => { setModalType(type); setEditItem(null); setModalOpen(true); };
  const openEditModal = (type, item) => { setModalType(type); setEditItem(item); setModalOpen(true); };

  // CUSTOMER CONTROL & MANUAL PASSWORD RESET HANDLERS
  const handleOpenResetCustomerPasswordModal = (customer) => {
    setSelectedCustomerForPassword(customer);
    setManualCustomerPassword('');
    setCustomerPasswordModalOpen(true);
  };

  const handleSaveCustomerPassword = async (e) => {
    e.preventDefault();
    if (!selectedCustomerForPassword || !manualCustomerPassword) {
      return showToast('Please enter a new password', 'error');
    }
    if (manualCustomerPassword.trim().length < 4) {
      return showToast('Password must be at least 4 characters long', 'error');
    }

    setSavingCustomerPassword(true);
    try {
      const res = await api.put(`/master/customers/${selectedCustomerForPassword.id}`, {
        password: manualCustomerPassword.trim()
      });
      if (res && res.success) {
        showToast(`Password for customer "${selectedCustomerForPassword.name}" reset successfully!`, 'success');
        setCustomerPasswordModalOpen(false);
        setSelectedCustomerForPassword(null);
        setManualCustomerPassword('');
        loadCustomers();
      } else {
        showToast(res?.message || 'Failed to reset password', 'error');
      }
    } catch (err) {
      console.error('Customer password reset error:', err);
      showToast('Error resetting customer password', 'error');
    } finally {
      setSavingCustomerPassword(false);
    }
  };

  const handleSaveCustomer = async (formData) => {
    try {
      if (editItem) {
        const res = await api.put(`/master/customers/${editItem.id}`, formData);
        if (res && res.success) {
          showToast('Customer updated successfully!', 'success');
          loadCustomers();
          setModalOpen(false);
        } else {
          showToast(res?.message || 'Error updating customer', 'error');
        }
      } else {
        const res = await api.post('/customer/register', formData);
        if (res && res.success) {
          showToast('Customer created successfully!', 'success');
          loadCustomers();
          setModalOpen(false);
        } else {
          showToast(res?.message || 'Error creating customer', 'error');
        }
      }
    } catch (err) {
      console.error('Save customer error:', err);
      showToast('Error saving customer', 'error');
    }
  };

  const handleToggleCustomerStatus = async (customer) => {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.put(`/master/customers/${customer.id}`, {
        status: newStatus
      });
      if (res && res.success) {
        showToast(`Customer "${customer.name}" login status set to ${newStatus === 'active' ? 'Active (Allowed)' : 'Inactive (Blocked)'}`, 'success');
        loadCustomers();
      } else {
        showToast(res?.message || 'Failed to update customer login status', 'error');
      }
    } catch (err) {
      console.error('Toggle customer status error:', err);
      showToast('Error updating customer login status', 'error');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    try {
      const res = await api.delete(`/master/customers/${customerId}`);
      if (res && res.success) {
        showToast('Customer deleted successfully', 'success');
        loadCustomers();
      } else {
        showToast(res?.message || 'Failed to delete customer', 'error');
      }
    } catch (err) {
      console.error('Delete customer error:', err);
      showToast('Error deleting customer', 'error');
    }
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

  // STAFF CRUD
  const handleSaveStaff = async (formData) => {
    if (editItem) {
      const res = await api.put(`/master/staff/${editItem.id}`, formData);
      if (res.success) { showToast('Staff updated!'); loadStaff(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    } else {
      const res = await api.post('/master/staff', formData);
      if (res.success) { showToast('Staff member created!'); loadStaff(); setModalOpen(false); }
      else showToast(res.message || 'Error', 'error');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    const res = await api.delete(`/master/staff/${id}`);
    if (res.success) { showToast('Staff member deleted'); loadStaff(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleToggleStaffStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/master/staff/${item.id}`, { ...item, status: newStatus });
    if (res.success) { showToast(`Staff member ${newStatus === 'active' ? 'unlocked' : 'locked'}`); loadStaff(); }
    else showToast(res.message || 'Error', 'error');
  };

  const handleResetStaffPassword = async (id) => {
    const newPass = generatePassword();
    if (!confirm(`Reset password to: ${newPass}`)) return;
    const res = await api.put(`/master/staff/${id}`, { password: newPass });
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
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/dashboard/collection')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow-sm text-xs"
            >
              <Landmark className="w-4 h-4" /> Payment Collection
            </button>
            <button
              onClick={() => navigate('/dashboard/salary')}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow-sm text-xs"
            >
              <Wallet className="w-4 h-4" /> Salary Adjustments
            </button>
            <button onClick={loadDashboard} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"><RefreshCw className="w-5 h-5" /></button>
          </div>
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
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search customer by name, email, mobile..." className="input pl-9 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-gray-600">Total: {customers.length} Customers</div>
                <button onClick={() => openCreateModal('customer')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Customer</button>
              </div>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-left py-2.5 px-3">ID</th>
                  <th className="text-left py-2.5 px-3">Customer Name</th>
                  <th className="text-left py-2.5 px-3">Mobile Number</th>
                  <th className="text-left py-2.5 px-3">Email Address</th>
                  <th className="text-left py-2.5 px-3">City</th>
                  <th className="text-left py-2.5 px-3">Repairs</th>
                  <th className="text-left py-2.5 px-3">Login Access</th>
                  <th className="text-left py-2.5 px-3">Joined Date</th>
                  <th className="text-center py-2.5 px-3">Login & Password Controls</th>
                </tr></thead>
                <tbody>
                  {customers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm) || c.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-gray-500">#{c.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-700">{c.mobile || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-gray-600 text-xs">{c.email || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{c.city || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">{c.total_repairs || 0}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.status === 'active' ? <UserCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {c.status === 'active' ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleToggleCustomerStatus(c)}
                            className={`p-1.5 rounded transition ${c.status === 'active' ? 'hover:bg-amber-100 text-amber-700 bg-amber-50' : 'hover:bg-green-100 text-green-700 bg-green-50'}`}
                            title={c.status === 'active' ? 'Lock / Block Customer Login' : 'Unlock / Enable Customer Login'}
                          >
                            {c.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleOpenResetCustomerPasswordModal(c)}
                            className="p-1.5 hover:bg-purple-100 text-purple-700 bg-purple-50 rounded transition flex items-center gap-1 text-xs font-semibold px-2"
                            title="Reset Customer Password Manually"
                          >
                            <Key className="w-3.5 h-3.5" /> Reset Pass
                          </button>
                          <button
                            onClick={() => openEditModal('customer', c)}
                            className="p-1.5 hover:bg-blue-100 text-blue-700 bg-blue-50 rounded transition"
                            title="Edit Customer Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="p-1.5 hover:bg-red-100 text-red-700 bg-red-50 rounded transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search staff..." className="input pl-9 py-2 text-sm" />
              </div>
              <button onClick={() => openCreateModal('staff')} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Staff Member</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2">Staff ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Mobile</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Last Login</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr></thead>
                <tbody>
                  {staff.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs font-medium">{s.staff_id}</td>
                      <td className="py-2 px-2 font-medium">{s.name}</td>
                      <td className="py-2 px-2 text-gray-600">{s.email || 'N/A'}</td>
                      <td className="py-2 px-2">{s.mobile || 'N/A'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-500">{s.last_login ? new Date(s.last_login).toLocaleString() : 'Never'}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal('staff', s)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleStaffStatus(s)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={s.status === 'active' ? 'Lock' : 'Unlock'}>
                            {s.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleResetStaffPassword(s.id)} className="p-1.5 hover:bg-purple-50 rounded text-purple-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteStaff(s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staff.length === 0 && <p className="text-center text-gray-400 py-8">No staff members found</p>}
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
                          <button onClick={() => handleResetDevice(s.id)} className="p-1.5 hover:bg-zinc-50 rounded text-zinc-650" title="Reset Android Device Link"><Smartphone className="w-4 h-4" /></button>
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
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setCoursesSubTab('courses')}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 ${coursesSubTab === 'courses' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Manage Courses
              </button>
              <button 
                onClick={() => setCoursesSubTab('assign')}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 ${coursesSubTab === 'assign' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Bulk Course Assignment
              </button>
              <button 
                onClick={() => { setCoursesSubTab('purchases'); loadPurchases(); }}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 ${coursesSubTab === 'purchases' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Store Purchase Requests ({coursePurchases.filter(p => p.status === 'pending').length})
              </button>
            </div>

            {/* Sub-Tab 1: Courses List & Syllabus Editor */}
            {coursesSubTab === 'courses' && !syllabusCourse && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search courses..." className="input pl-9 py-2 text-sm" />
                  </div>
                  <button onClick={() => openCreateModal('course')} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Create Course
                  </button>
                </div>
                
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600">
                        <th className="text-left py-3 px-3">Banner</th>
                        <th className="text-left py-3 px-3">Course Title</th>
                        <th className="text-left py-3 px-3">Pricing</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Syllabus</th>
                        <th className="text-left py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.filter(c => c.title?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <tr key={c.id} className="border-b hover:bg-gray-50/50 transition">
                          <td className="py-2.5 px-3">
                            <div className="w-12 h-9 rounded bg-gray-150 overflow-hidden border">
                              {c.thumbnail ? (
                                <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-400 bg-gray-100">NO IMG</div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 capitalize">{c.title}</td>
                          <td className="py-2.5 px-3 font-medium">
                            {c.is_free === 1 ? (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Free</span>
                            ) : (
                              `₹${parseFloat(c.price || 0).toFixed(2)}`
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                              {c.status === 'active' ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button 
                              onClick={() => loadSyllabus(c)}
                              className="text-xs font-extrabold text-emerald-600 hover:text-emerald-800 transition flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Syllabus Manager
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEditModal('course', c)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleTogglePublished(c)} className="p-1 hover:bg-zinc-150 rounded text-zinc-650" title={c.status === 'active' ? 'Disable Course' : 'Enable Course'}>
                                {c.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteCourse(c.id)} className="p-1 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {courses.length === 0 && <p className="text-center text-gray-400 py-12 text-xs">No courses configured.</p>}
                </div>
              </div>
            )}

            {/* SYLLABUS EDITOR DRAWER / COMPONENT */}
            {coursesSubTab === 'courses' && syllabusCourse && (
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syllabus Curriculum Manager</span>
                    <h3 className="text-lg font-black text-gray-800 capitalize mt-0.5">{syllabusCourse.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSyllabusCourse(null)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Back to Course List
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Col: Subjects list */}
                  <div className="md:col-span-1 space-y-4 border-r pr-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subjects List</h4>
                    
                    {/* Add subject form */}
                    <form onSubmit={handleCreateSubject} className="space-y-2">
                      <input 
                        type="text" 
                        value={newSubjectTitle} 
                        onChange={e => setNewSubjectTitle(e.target.value)}
                        placeholder="Subject Title (e.g. Charging Section)"
                        className="input text-xs"
                        required
                      />
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={newSubjectOrder} 
                          onChange={e => setNewSubjectOrder(parseInt(e.target.value) || 0)}
                          placeholder="Sort Order"
                          className="input text-xs w-24"
                        />
                        <button type="submit" className="btn-primary py-1.5 flex-1 text-xs">Add Subject</button>
                      </div>
                    </form>

                    {/* Subjects Listing */}
                    <div className="space-y-1.5 pt-2">
                      {syllabusSubjects.map(sub => (
                        <div 
                          key={sub.id} 
                          onClick={() => loadSubjectItems(sub)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex justify-between items-center transition ${activeSubject?.id === sub.id ? 'bg-emerald-50 border-emerald-350 text-emerald-900 font-bold' : 'bg-gray-50 hover:bg-gray-100/50 text-gray-700'}`}
                        >
                          <span className="truncate">{sub.title}</span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {syllabusSubjects.length === 0 && <p className="text-center text-gray-400 py-6 text-xs">No subjects created yet.</p>}
                    </div>
                  </div>

                  {/* Right Col: Lessons and Materials under selected subject */}
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subject Contents / Materials</h4>

                    {activeSubject ? (
                      <div className="space-y-6">
                        {/* Selected Subject Banner */}
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-emerald-800 text-xs font-bold">
                          Active Subject: {activeSubject.title}
                        </div>

                        {/* Add material item form */}
                        <form onSubmit={handleCreateMaterial} className="bg-gray-50 border p-4 rounded-xl space-y-3">
                          <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Add Subject Material (Video, PDF, Notes, Links)</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input 
                              type="text" 
                              value={newMaterialTitle} 
                              onChange={e => setNewMaterialTitle(e.target.value)}
                              placeholder="Material Title (e.g. Multimeter Testing Guide)"
                              className="input text-xs"
                              required
                            />
                            <select 
                              value={newMaterialType} 
                              onChange={e => setNewMaterialType(e.target.value)}
                              className="input select text-xs"
                            >
                              <option value="video">Local Video Upload</option>
                              <option value="youtube">YouTube Stream Link</option>
                              <option value="pdf">PDF Document</option>
                              <option value="downloadable_file">Downloadable File / Notes</option>
                            </select>
                          </div>

                          {newMaterialType === 'youtube' ? (
                            <input 
                              type="url" 
                              value={newMaterialYoutubeUrl} 
                              onChange={e => setNewMaterialYoutubeUrl(e.target.value)}
                              placeholder="YouTube Video URL"
                              className="input text-xs"
                              required
                            />
                          ) : (
                            <div>
                              <input 
                                key={newMaterialFile ? newMaterialFile.name : 'empty'}
                                type="file" 
                                onChange={e => setNewMaterialFile(e.target.files[0])}
                                className="text-xs"
                                accept={
                                  newMaterialType === 'pdf' 
                                    ? 'application/pdf' 
                                    : newMaterialType === 'video' 
                                      ? 'video/*' 
                                      : '*'
                                }
                                required
                              />
                            </div>
                          )}

                          <div className="flex gap-2 items-center justify-end">
                            <input 
                              type="number" 
                              value={newMaterialOrder} 
                              onChange={e => setNewMaterialOrder(parseInt(e.target.value) || 0)}
                              placeholder="Sort Order"
                              className="input text-xs w-24"
                            />
                            <button 
                              type="submit" 
                              disabled={uploadingMaterial}
                              className="btn-primary py-2 px-6 text-xs flex items-center gap-1.5"
                            >
                              {uploadingMaterial ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Upload Material'}
                            </button>
                          </div>
                        </form>

                        {/* Subject Items List */}
                        <div className="space-y-2">
                          {syllabusItems.map(item => (
                            <div key={item.id} className="border p-3 rounded-lg flex items-center justify-between bg-white text-xs shadow-sm hover:shadow-md transition">
                              <div className="flex items-center gap-2">
                                <span className="font-bold uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] tracking-wider">{item.type}</span>
                                <span className="font-semibold text-gray-800 capitalize">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.file_path && (
                                  <a href={item.file_path} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800 font-bold">View File</a>
                                )}
                                {item.youtube_url && (
                                  <a href={item.youtube_url} target="_blank" rel="noreferrer" className="text-red-650 hover:text-red-800 font-bold flex items-center gap-0.5"><Play className="w-3 h-3" /> YouTube</a>
                                )}
                                <button 
                                  onClick={() => handleDeleteMaterial(item.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-600 rounded ml-2"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {syllabusItems.length === 0 && <p className="text-center text-gray-400 py-8 text-xs">No materials uploaded under this subject.</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-12 border border-dashed text-center text-gray-400 text-xs">
                        Select a subject from the left panel to load and upload course materials.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Bulk Course Assignment */}
            {coursesSubTab === 'assign' && (
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Bulk Assignment Manager</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Enroll multiple students into multiple courses in a single action.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Students Column */}
                  <div className="border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Students</span>
                      <button 
                        onClick={() => {
                          if (selectedBulkStudents.length === students.length) setSelectedBulkStudents([]);
                          else setSelectedBulkStudents(students.map(s => s.id));
                        }}
                        className="text-[10px] text-emerald-600 font-bold uppercase hover:text-emerald-800"
                      >
                        {selectedBulkStudents.length === students.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2">
                      {students.map(s => (
                        <label key={s.id} className="flex items-center gap-2.5 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={selectedBulkStudents.includes(s.id)}
                            onChange={() => {
                              if (selectedBulkStudents.includes(s.id)) {
                                setSelectedBulkStudents(prev => prev.filter(id => id !== s.id));
                              } else {
                                setSelectedBulkStudents(prev => [...prev, s.id]);
                              }
                            }}
                          />
                          <div>
                            <span className="font-semibold text-gray-800 capitalize">{s.name}</span>
                            <span className="text-[10px] text-gray-400 ml-2">ID: {s.student_id}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Courses Column */}
                  <div className="border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Courses</span>
                      <button 
                        onClick={() => {
                          if (selectedBulkCourses.length === courses.length) setSelectedBulkCourses([]);
                          else setSelectedBulkCourses(courses.map(c => c.id));
                        }}
                        className="text-[10px] text-emerald-600 font-bold uppercase hover:text-emerald-800"
                      >
                        {selectedBulkCourses.length === courses.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2">
                      {courses.map(c => (
                        <label key={c.id} className="flex items-center gap-2.5 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={selectedBulkCourses.includes(c.id)}
                            onChange={() => {
                              if (selectedBulkCourses.includes(c.id)) {
                                setSelectedBulkCourses(prev => prev.filter(id => id !== c.id));
                              } else {
                                setSelectedBulkCourses(prev => [...prev, c.id]);
                              }
                            }}
                          />
                          <div>
                            <span className="font-semibold text-gray-800 capitalize">{c.title}</span>
                            <span className="text-[10px] text-gray-400 ml-2">{c.is_free ? 'Free' : `₹${c.price}`}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button 
                    onClick={handleBulkAssign}
                    className="btn-primary py-2 px-8 text-xs font-bold flex items-center gap-2"
                  >
                    Assign {selectedBulkCourses.length} Courses to {selectedBulkStudents.length} Students
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: E-Store Purchases requests */}
            {coursesSubTab === 'purchases' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Course Purchase Records & Approvals</h4>
                    <p className="text-xs text-gray-500">View student purchase requests or manually record a course purchase.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (students.length === 0) loadStudents();
                      if (courses.length === 0) loadCourses();
                      setShowManualPurchaseModal(true);
                    }}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
                  >
                    <Plus className="w-4 h-4" /> File Student Purchase
                  </button>
                </div>

                {/* Manual Purchase Modal */}
                <Modal 
                  isOpen={showManualPurchaseModal} 
                  onClose={() => setShowManualPurchaseModal(false)}
                  title="File Course Purchase for Student"
                >
                  <form onSubmit={handleSaveManualPurchase} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Student *</label>
                      <select 
                        value={manualPurchaseStudentId} 
                        onChange={e => setManualPurchaseStudentId(e.target.value)}
                        className="input text-xs"
                        required
                      >
                        <option value="">-- Choose Student --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.student_id || 'ID #' + s.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Purchased Course *</label>
                      <select 
                        value={manualPurchaseCourseId} 
                        onChange={e => {
                          const cId = e.target.value;
                          setManualPurchaseCourseId(cId);
                          const matched = courses.find(c => String(c.id) === String(cId));
                          if (matched && matched.price) setManualPurchaseAmount(matched.price);
                        }}
                        className="input text-xs"
                        required
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.is_free ? 'Free' : '₹' + c.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Amount Paid (₹)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={manualPurchaseAmount} 
                          onChange={e => setManualPurchaseAmount(e.target.value)}
                          placeholder="e.g. 999.00"
                          className="input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                        <select 
                          value={manualPurchaseMethod} 
                          onChange={e => setManualPurchaseMethod(e.target.value)}
                          className="input text-xs"
                        >
                          <option value="cash">Cash / Offline</option>
                          <option value="upi">UPI / Online</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="manual">Manual Admin Filing</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <button 
                        type="button" 
                        onClick={() => setShowManualPurchaseModal(false)}
                        className="btn-secondary py-2 px-4 text-xs"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={savingManualPurchase}
                        className="btn-primary py-2 px-6 text-xs font-bold"
                      >
                        {savingManualPurchase ? 'Filing Purchase...' : 'File & Grant Access'}
                      </button>
                    </div>
                  </form>
                </Modal>

                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600">
                        <th className="text-left py-3 px-3">Student</th>
                        <th className="text-left py-3 px-3">Course Title</th>
                        <th className="text-left py-3 px-3">Amount</th>
                        <th className="text-left py-3 px-3">Method</th>
                        <th className="text-left py-3 px-3">Receipt Screenshot</th>
                        <th className="text-left py-3 px-3">Date</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                  <tbody>
                    {coursePurchases.map(p => (
                      <tr key={p.id} className="border-b hover:bg-gray-50/50 transition">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-800 capitalize block">{p.student_name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{p.student_code}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-700 capitalize">{p.course_name}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">₹{parseFloat(p.amount_paid).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-500">{p.payment_method}</td>
                        <td className="py-2.5 px-3">
                          {p.payment_screenshot ? (
                            <a 
                              href={p.payment_screenshot} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition flex items-center gap-1"
                            >
                              <Image className="w-3.5 h-3.5" /> View Screenshot
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400">None attached</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-450">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {p.status === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => handleApprovePurchase(p.id, 'approved')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleApprovePurchase(p.id, 'rejected')}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {coursePurchases.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center text-gray-400 py-12 text-xs">
                          No course purchase requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}
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

        {/* CUSTOMER TRACKING & THERMAL PRINT TAB */}
        {activeTab === 'customer_tracking' && (
          <CustomerTrackingList role="master" />
        )}

        {/* WEBSITE SETTINGS TAB */}
        {activeTab === 'website' && (
          <MasterSettingsCenter />
        )}

        {/* CERTIFICATES TAB */}
        {activeTab === 'certificates' && (
          <MasterCertificationDashboard />
        )}

        {/* SUPPORT TICKETS TAB */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] overflow-hidden">
            {/* Tickets selector list */}
            <div className="card md:col-span-1 flex flex-col h-full overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Student Support Tickets</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {supportTickets.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition select-none ${
                      activeTicket?.id === t.id ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1.5 mb-1">
                      <h3 className="font-semibold text-xs text-gray-900 truncate flex-1">{t.subject}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                        t.status === 'open' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        t.status === 'in_progress' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                        'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Student: <strong>{t.student_name}</strong> ({t.student_code})</p>
                  </div>
                ))}
                {supportTickets.length === 0 && <p className="text-center text-gray-400 py-8">No support tickets found</p>}
              </div>
            </div>

            {/* Chat Thread */}
            <div className="card md:col-span-2 flex flex-col h-full overflow-hidden">
              {activeTicket ? (
                <>
                  <div className="border-b pb-3 mb-4 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="font-bold text-gray-900">{activeTicket.subject}</h3>
                      <p className="text-xs text-gray-400">Student: {activeTicket.student_name} ({activeTicket.student_code})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={activeTicket.status} 
                        onChange={e => handleUpdateTicketStatus(activeTicket.id, e.target.value)}
                        className="input text-xs py-1 px-2.5 w-32 border-gray-300"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 mb-4">
                    {loadingTicketMessages ? (
                      <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-emerald-600" /></div>
                    ) : (
                      ticketMessages.map(m => {
                        const isMaster = m.sender_role === 'master';
                        return (
                          <div key={m.id} className={`flex flex-col ${isMaster ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-xl p-3 shadow-sm border ${
                              isMaster ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
                            }`}>
                              <p className="text-xs whitespace-pre-line leading-relaxed">{m.message}</p>
                              {m.attachment_path && (
                                <div className="mt-2 rounded overflow-hidden max-h-40 border border-white/10">
                                  <img src={m.attachment_path} alt="Screenshot" className="object-cover w-full h-full cursor-zoom-in" onClick={() => window.open(m.attachment_path)} />
                                </div>
                              )}
                            </div>
                            <span className="text-[8px] text-gray-400 mt-1 px-1">
                              {isMaster ? 'You' : 'Student'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply box */}
                  {activeTicket.status !== 'resolved' ? (
                    <form onSubmit={handleTicketReplySubmit} className="flex gap-2 items-center flex-shrink-0">
                      <label className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-emerald-600 cursor-pointer transition">
                        <Image className="w-5 h-5" />
                        <input type="file" onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setTicketReplyFile(file);
                            setTicketReplyFilePreview(URL.createObjectURL(file));
                          }
                        }} className="hidden" accept="image/*" />
                      </label>
                      <input 
                        type="text" 
                        value={ticketReplyMsg}
                        onChange={e => setTicketReplyMsg(e.target.value)}
                        placeholder="Reply message to student..." 
                        className="input flex-1 text-xs" 
                      />
                      <button type="submit" disabled={sendingTicketReply || (!ticketReplyMsg.trim() && !ticketReplyFile)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition">
                        {sendingTicketReply ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-gray-50 border rounded-lg text-center text-xs text-gray-400 font-bold flex items-center justify-center gap-1 flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-500" /> Resolved Support Ticket.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 opacity-30 text-gray-400 mb-2" />
                  <h3 className="font-semibold text-gray-700">Select a Ticket</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Select a thread on the left to start corresponding with the student.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left broadcaster form */}
            <div className="card lg:col-span-1 h-fit">
              <h2 className="text-lg font-semibold mb-4">Create Announcement</h2>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Title *</label>
                  <input type="text" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="input text-xs" placeholder="e.g. Schedule Update" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Content Message *</label>
                  <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} className="input text-xs h-24 resize-none py-1.5" placeholder="Announce detail..." required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Audience</label>
                  <select value={annTargetType} onChange={e => setAnnTargetType(e.target.value)} className="input text-xs">
                    <option value="all">Broadcast to All Students</option>
                    <option value="selected">Broadcast to Selected Students</option>
                  </select>
                </div>

                {annTargetType === 'selected' && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Select Recipients</span>
                    {students.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => handleToggleStudentSelect(s.id)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <span>{s.name} ({s.student_id})</span>
                      </label>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={creatingAnnouncement} className="btn-primary w-full py-2">
                  {creatingAnnouncement ? 'Creating...' : 'Broadcast Announcement'}
                </button>
              </form>
            </div>

            {/* Right broadcast logs */}
            <div className="card lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Announcement History Logs</h2>
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-4 border rounded-xl bg-white hover:shadow-sm transition">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm text-gray-900">{ann.title}</h3>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        ann.target_type === 'all' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-purple-50 border-purple-200 text-purple-700'
                      }`}>{ann.target_type === 'all' ? 'all students' : 'selected'}</span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                      <span>By: {ann.creator_name || 'Master'}</span>
                      <span>•</span>
                      <span>{new Date(ann.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <p className="text-center text-gray-400 py-8">No announcements broadcasted yet</p>}
              </div>
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
        {modalType === 'customer' && <CustomerForm editItem={editItem} onSave={handleSaveCustomer} onCancel={() => setModalOpen(false)} />}
        {modalType === 'admin' && <AdminForm editItem={editItem} onSave={handleSaveAdmin} onCancel={() => setModalOpen(false)} />}
        {modalType === 'technician' && <TechnicianForm editItem={editItem} onSave={handleSaveTechnician} onCancel={() => setModalOpen(false)} />}
        {modalType === 'student' && <StudentForm editItem={editItem} onSave={handleSaveStudent} onCancel={() => setModalOpen(false)} />}
        {modalType === 'staff' && <StaffForm editItem={editItem} onSave={handleSaveStaff} onCancel={() => setModalOpen(false)} />}
        {modalType === 'payment' && <PaymentMethodForm editItem={editItem} onSave={handleSavePaymentMethod} onCancel={() => setModalOpen(false)} />}
        {modalType === 'course' && <CourseForm editItem={editItem} onSave={handleSaveCourse} onCancel={() => setModalOpen(false)} />}
      </Modal>

      {/* CUSTOMER MANUAL PASSWORD RESET MODAL */}
      <Modal
        isOpen={customerPasswordModalOpen}
        onClose={() => {
          setCustomerPasswordModalOpen(false);
          setSelectedCustomerForPassword(null);
          setManualCustomerPassword('');
        }}
        title="🔑 Reset Customer Password Manually"
      >
        {selectedCustomerForPassword && (
          <form onSubmit={handleSaveCustomerPassword} className="space-y-4">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <p className="text-xs text-gray-500 font-semibold">Customer Account:</p>
              <p className="text-sm font-bold text-gray-900 capitalize">{selectedCustomerForPassword.name}</p>
              <p className="text-xs text-gray-600 font-mono mt-0.5">
                Mobile: {selectedCustomerForPassword.mobile || 'N/A'} | Email: {selectedCustomerForPassword.email || 'N/A'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">New Manual Password *</label>
                <button
                  type="button"
                  onClick={() => setManualCustomerPassword(generatePassword())}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                >
                  ⚡ Auto-Generate Random
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasswords['customer_pass'] ? 'text' : 'password'}
                  value={manualCustomerPassword}
                  onChange={e => setManualCustomerPassword(e.target.value)}
                  placeholder="Enter new customer password (e.g. customer123)..."
                  className="input text-xs pr-10 font-mono"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, customer_pass: !prev.customer_pass }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords['customer_pass'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                The customer will be able to log in using their registered Mobile or Email with this password.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setCustomerPasswordModalOpen(false);
                  setSelectedCustomerForPassword(null);
                  setManualCustomerPassword('');
                }}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustomerPassword}
                className="btn-primary text-xs py-2 px-5 font-bold"
              >
                {savingCustomerPassword ? 'Resetting Password...' : 'Save & Reset Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// COURSE FORM
function CourseForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: editItem?.title || '',
    description: editItem?.description || '',
    price: editItem?.price || 0,
    is_free: editItem?.is_free === 1 || editItem?.is_free === true ? 1 : 0,
    status: editItem?.status || 'active'
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(editItem?.thumbnail || '');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, thumbnailFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Course Title *</label>
        <input 
          value={form.title} 
          onChange={e => setForm({ ...form, title: e.target.value })} 
          className="input text-xs" 
          placeholder="e.g. Basic Hardware Repairing"
          required 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Free or Paid</label>
          <select 
            value={form.is_free} 
            onChange={e => setForm({ ...form, is_free: parseInt(e.target.value) })}
            className="input select text-xs"
          >
            <option value={0}>Paid Course</option>
            <option value={1}>Free Course</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Price (INR)</label>
          <input 
            type="number" 
            value={form.price} 
            onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
            className="input text-xs" 
            disabled={form.is_free === 1}
            required={form.is_free === 0}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Status</label>
        <select 
          value={form.status} 
          onChange={e => setForm({ ...form, status: e.target.value })}
          className="input select text-xs"
        >
          <option value="active">Enabled (Active)</option>
          <option value="inactive">Disabled (Inactive)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Description</label>
        <textarea 
          value={form.description} 
          onChange={e => setForm({ ...form, description: e.target.value })} 
          className="input h-20 text-xs" 
          placeholder="Enter detailed course details..."
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Course Banner Image</label>
        <div className="flex items-center gap-3">
          <label className="border border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-4 w-20 h-20 flex flex-col items-center justify-center cursor-pointer transition text-gray-400 hover:text-emerald-600">
            <Plus className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Select</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="hidden" 
            />
          </label>
          {thumbnailPreview && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
              <img src={thumbnailPreview} alt="Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 hover:bg-gray-100 rounded-lg text-xs text-gray-600 font-bold flex-1">Cancel</button>
        <button type="submit" className="btn-primary py-2 text-xs flex-1">{editItem ? 'Update Course' : 'Create Course'}</button>
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

// STAFF FORM
function StaffForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    staff_id: generateStaffId('STF', Math.floor(Math.random() * 9000) + 1000),
    name: '', password: generatePassword(), email: '', mobile: '', status: 'active'
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Staff ID *</label>
        <input value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} className="input font-mono" required disabled={!!editItem} />
        {!editItem && <p className="text-xs text-gray-500 mt-1">Auto-generated: {form.staff_id}</p>}
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
      {editItem && <div><label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select></div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Staff Member' : 'Create Staff Member'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

// CUSTOMER FORM
function CustomerForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(editItem || {
    name: '', email: '', mobile: '', address: '', city: '', password: generatePassword(), status: 'active'
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Full Name *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input text-xs" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Mobile Number *</label>
          <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="input text-xs font-mono" required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Email Address</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">City</label>
          <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input text-xs" placeholder="e.g. Kolhapur" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Login Access Status</label>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input select text-xs">
            <option value="active">Active (Login Allowed)</option>
            <option value="inactive">Inactive (Login Blocked)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Address</label>
        <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input text-xs h-16" placeholder="Customer address..." />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Password {editItem ? '(leave blank to keep unchanged)' : '*'}</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password || ''}
            onChange={e => setForm({...form, password: e.target.value})}
            className="input text-xs pr-10 font-mono"
            placeholder={editItem ? 'Enter new password or leave empty' : 'Auto-generated'}
            required={!editItem}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {!editItem && <p className="text-xs text-gray-500 mt-1 font-mono">Auto-generated: {form.password}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 text-xs py-2">{editItem ? 'Update Customer' : 'Create Customer'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
      </div>
    </form>
  );
}
