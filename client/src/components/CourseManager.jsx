import { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Edit, Trash2, Users, CheckCircle, X, Search, 
  RefreshCw, FileText, Video, Link, ShieldAlert, Smartphone, 
  Check, AlertCircle, Eye, Loader, Upload, Layers, Award, 
  MessageSquare, Send, Bell, Image, Bookmark
} from 'lucide-react';
import api from '../lib/api';
import ToastContainer, { showToast } from './Toast';

export default function CourseManager() {
  const [activeSubTab, setActiveSubTab] = useState('courses'); // courses, assign, purchases, devices, support, certificates, announcements
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & form state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState('');
  
  // Selected course for curriculum management
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // CRUD states
  const [editCourse, setEditCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    price: 0,
    is_free: 0,
    banner_image: '',
    status: 'active'
  });
  
  // Subject builder states
  const [subjectTitle, setSubjectTitle] = useState('');
  const [itemForm, setItemForm] = useState({
    subjectId: null,
    title: '',
    type: 'video', // video, pdf, youtube, downloadable_file
    file_path: '',
    youtube_url: '',
    display_order: 0
  });
  const [uploading, setUploading] = useState(false);

  // Bulk assignment states
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  // Support tickets states
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Certificates states
  const [certRequests, setCertRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateFile, setSelectedTemplateFile] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState(null);
  const [reissueForm, setReissueForm] = useState({
    studentId: '',
    courseId: ''
  });

  // Announcements states
  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    target_type: 'all',
    studentIds: []
  });

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'courses') {
        const res = await api.get('/course/manage');
        if (res?.success) setCourses(res.courses || []);
      } else if (activeSubTab === 'assign') {
        const [studRes, courRes] = await Promise.all([
          api.get('/course/manage/students'),
          api.get('/course/manage')
        ]);
        if (studRes?.success) setStudents(studRes.students || []);
        if (courRes?.success) setCourses(courRes.courses || []);
      } else if (activeSubTab === 'purchases') {
        const res = await api.get('/course/manage/purchases');
        if (res?.success) setPurchases(res.purchases || []);
      } else if (activeSubTab === 'devices') {
        const res = await api.get('/course/manage/students');
        if (res?.success) setStudents(res.students || []);
      } else if (activeSubTab === 'support') {
        const res = await api.get('/course/manage/support/tickets');
        if (res?.success) setTickets(res.tickets || []);
      } else if (activeSubTab === 'certificates') {
        const [requestsRes, templatesRes, studRes, courRes] = await Promise.all([
          api.get('/course/manage/certificates/requests'),
          api.get('/course/manage/certificates/templates'),
          api.get('/course/manage/students'),
          api.get('/course/manage')
        ]);
        if (requestsRes?.success) setCertRequests(requestsRes.requests || []);
        if (templatesRes?.success) setTemplates(templatesRes.templates || []);
        if (studRes?.success) setStudents(studRes.students || []);
        if (courRes?.success) setCourses(courRes.courses || []);
      } else if (activeSubTab === 'announcements') {
        const [annRes, studRes] = await Promise.all([
          api.get('/course/manage/announcements'),
          api.get('/course/manage/students')
        ]);
        if (annRes?.success) setAnnouncements(annRes.announcements || []);
        if (studRes?.success) setStudents(studRes.students || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // COURSE CRUD OPERATIONS
  // =====================================================
  const openCreateCourseModal = () => {
    setEditCourse(null);
    setCourseForm({ title: '', description: '', price: 0, is_free: 0, banner_image: '', status: 'active' });
    setCourseModalOpen(true);
  };

  const openEditCourseModal = (course) => {
    setEditCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      price: course.price,
      is_free: course.is_free,
      banner_image: course.banner_image || '',
      status: course.status
    });
    setCourseModalOpen(true);
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('banner', file);
    try {
      const res = await api.upload('/course/manage/upload-banner', formData);
      if (res?.success) {
        setCourseForm(prev => ({ ...prev, banner_image: res.filePath }));
        showToast('Banner image uploaded', 'success');
      }
    } catch (err) {
      showToast('Error uploading banner', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title) return showToast('Course title is required', 'error');
    try {
      let res = editCourse 
        ? await api.put(`/course/manage/${editCourse.id}`, courseForm)
        : await api.post('/course/manage', courseForm);
      if (res?.success) {
        showToast(editCourse ? 'Course updated' : 'Course created', 'success');
        setCourseModalOpen(false);
        loadData();
      }
    } catch (err) {
      showToast('Server error', 'error');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course? All subjects, items, and progress will be deleted.')) return;
    try {
      const res = await api.delete(`/course/manage/${id}`);
      if (res?.success) {
        showToast('Course deleted successfully', 'success');
        loadData();
      }
    } catch (err) {
      showToast('Server error', 'error');
    }
  };

  // =====================================================
  // CURRICULUM SUBJECTS AND ITEMS BUILDER
  // =====================================================
  const openCurriculumBuilder = (course) => {
    setSelectedCourse(course);
    setSubjectTitle('');
    setItemForm({ subjectId: null, title: '', type: 'video', file_path: '', youtube_url: '', display_order: 0 });
    setCurriculumModalOpen(true);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subjectTitle.trim()) return showToast('Subject title required', 'error');
    try {
      const res = await api.post(`/course/manage/${selectedCourse.id}/subject`, { title: subjectTitle });
      if (res?.success) {
        showToast('Subject added', 'success');
        setSubjectTitle('');
        refreshCurriculum();
      }
    } catch (err) {
      showToast('Failed to add subject', 'error');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Delete subject and all contents?')) return;
    try {
      const res = await api.put(`/course/manage/subject/${subjectId}`, { action: 'delete' });
      if (res?.success) {
        showToast('Subject deleted', 'success');
        refreshCurriculum();
      }
    } catch (err) {
      showToast('Failed to delete subject', 'error');
    }
  };

  const handleItemFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.upload('/course/manage/upload-file', formData);
      if (res?.success) {
        setItemForm(prev => ({ ...prev, file_path: res.filePath }));
        showToast('File uploaded successfully', 'success');
      }
    } catch (err) {
      showToast('File upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const { subjectId, title, type, file_path, youtube_url, display_order } = itemForm;
    if (!subjectId) return showToast('Select subject', 'error');
    if (!title.trim()) return showToast('Title required', 'error');

    try {
      const res = await api.post(`/course/manage/subject/${subjectId}/item`, {
        title, type, file_path, youtube_url, display_order
      });
      if (res?.success) {
        showToast('Content added', 'success');
        setItemForm(prev => ({ ...prev, title: '', file_path: '', youtube_url: '' }));
        refreshCurriculum();
        
        // Notify students enrolled in this course about new content
        await api.post('/notifications/send', {
          user_role: 'student',
          title: 'New Course Material Uploaded 📚',
          message: `New ${type} "${title}" has been added to "${selectedCourse.title}".`,
          type: 'new_content'
        });
      }
    } catch (err) {
      showToast('Failed to add item', 'error');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await api.put(`/course/manage/subject/item/${itemId}`, { action: 'delete' });
      if (res?.success) {
        showToast('Item deleted', 'success');
        refreshCurriculum();
      }
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  const refreshCurriculum = async () => {
    const res = await api.get('/course/manage');
    if (res?.success) {
      setCourses(res.courses || []);
      const current = res.courses.find(c => c.id === selectedCourse.id);
      if (current) setSelectedCourse(current);
    }
  };

  // =====================================================
  // BULK ENROLLMENTS & DEVICE RESET
  // =====================================================
  const handleToggleStudentSelect = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };
  const handleToggleCourseSelect = (id) => {
    setSelectedCourses(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  const handleBulkAssign = async () => {
    if (!selectedStudents.length || !selectedCourses.length) return showToast('Select students and courses', 'warning');
    try {
      const res = await api.post('/course/manage/assign', { studentIds: selectedStudents, courseIds: selectedCourses });
      if (res?.success) {
        showToast('Courses assigned successfully', 'success');
        setSelectedCourses([]);
        setSelectedStudents([]);
      }
    } catch (err) {
      showToast('Assignment error', 'error');
    }
  };

  const handleResetDevice = async (studentId) => {
    if (!confirm('Reset device binding for this student?')) return;
    try {
      const res = await api.put(`/course/manage/student/${studentId}/reset-device`);
      if (res?.success) {
        showToast('Device binding reset successfully', 'success');
        loadData();
      }
    } catch (err) {
      showToast('Reset failed', 'error');
    }
  };

  const handleProcessPurchase = async (purchaseId, status) => {
    if (!confirm(`Mark purchase request as ${status}?`)) return;
    try {
      const res = await api.put(`/course/manage/purchase/${purchaseId}`, { status });
      if (res?.success) {
        showToast(`Request ${status}`, 'success');
        loadData();
      }
    } catch (err) {
      showToast('Operation failed', 'error');
    }
  };

  // =====================================================
  // SUPPORT TICKETS REPLY & STATUS
  // =====================================================
  const handleOpenTicket = async (ticket) => {
    setActiveTicket(ticket);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/course/manage/support/tickets/${ticket.id}/messages`);
      if (res?.success) setTicketMessages(res.messages || []);
    } catch (e) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    try {
      const res = await api.post(`/course/manage/support/tickets/${activeTicket.id}/reply`, { message: replyMessage });
      if (res?.success) {
        setReplyMessage('');
        const msgRes = await api.get(`/course/manage/support/tickets/${activeTicket.id}/messages`);
        if (msgRes?.success) setTicketMessages(msgRes.messages || []);
      }
    } catch (e) {
      showToast('Failed to reply', 'error');
    }
  };

  const handleUpdateTicketStatus = async (status) => {
    try {
      const res = await api.put(`/course/manage/support/tickets/${activeTicket.id}/status`, { status });
      if (res?.success) {
        showToast('Ticket status updated to ' + status, 'success');
        setActiveTicket(prev => ({ ...prev, status }));
        // Reload ticket list
        const listRes = await api.get('/course/manage/support/tickets');
        if (listRes?.success) setTickets(listRes.tickets || []);
      }
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  // =====================================================
  // CERTIFICATE TEMPLATES & APPROVALS
  // =====================================================
  const handleTemplateUpload = async (e) => {
    e.preventDefault();
    if (!selectedTemplateFile) return showToast('Template background image is required', 'warning');
    
    setUploading(true);
    const formData = new FormData();
    formData.append('template', selectedTemplateFile);
    if (selectedLogoFile) formData.append('logo', selectedLogoFile);
    if (selectedSignatureFile) formData.append('signature', selectedSignatureFile);

    try {
      const res = await api.upload('/course/manage/certificates/template', formData);
      if (res?.success) {
        showToast('Certificate template uploaded and set active', 'success');
        setSelectedTemplateFile(null);
        setSelectedLogoFile(null);
        setSelectedSignatureFile(null);
        loadData();
      }
    } catch (err) {
      showToast('Error uploading template', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleApproveCert = async (id, status) => {
    if (!confirm(`Are you sure you want to ${status} this certificate request?`)) return;
    try {
      const res = await api.put(`/course/manage/certificates/request/${id}/approve`, { status });
      if (res?.success) {
        showToast(`Certificate request ${status} successfully!`, 'success');
        loadData();
      }
    } catch (e) {
      showToast('Failed to approve certificate', 'error');
    }
  };

  const handleReissueCert = async (e) => {
    e.preventDefault();
    const { studentId, courseId } = reissueForm;
    if (!studentId || !courseId) return showToast('Student and Course are required', 'warning');
    
    try {
      const res = await api.post('/course/manage/certificates/reissue', { studentId, courseId });
      if (res?.success) {
        showToast('Certificate reissued and approved successfully!', 'success');
        setReissueForm({ studentId: '', courseId: '' });
        loadData();
      }
    } catch (e) {
      showToast('Reissue failed', 'error');
    }
  };

  // =====================================================
  // ANNOUNCEMENTS BROADCAST
  // =====================================================
  const handleAnnStudentSelect = (id) => {
    setAnnForm(prev => {
      const ids = prev.studentIds.includes(id) 
        ? prev.studentIds.filter(sid => sid !== id) 
        : [...prev.studentIds, id];
      return { ...prev, studentIds: ids };
    });
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.content.trim()) {
      return showToast('Title and content are required', 'warning');
    }
    if (annForm.target_type === 'selected' && annForm.studentIds.length === 0) {
      return showToast('Select at least one recipient student', 'warning');
    }

    try {
      const res = await api.post('/course/manage/announcements', annForm);
      if (res?.success) {
        showToast('Announcement broadcasted successfully!', 'success');
        setAnnForm({ title: '', content: '', target_type: 'all', studentIds: [] });
        loadData();
      }
    } catch (e) {
      showToast('Failed to send announcement', 'error');
    }
  };

  // Filters based on Search Query
  const filteredCourses = courses.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredStudents = students.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_code?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      {/* CMS Header & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Course Management System</h2>
          <p className="text-sm text-gray-500 mt-1">Manage course lists, assignments, support tickets, and certificates templates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => { setActiveSubTab('courses'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'courses' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Courses Curriculum
          </button>
          <button 
            onClick={() => { setActiveSubTab('assign'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'assign' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Bulk Assign
          </button>
          <button 
            onClick={() => { setActiveSubTab('purchases'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'purchases' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Purchase Requests
          </button>
          <button 
            onClick={() => { setActiveSubTab('devices'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'devices' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Student Device Locks
          </button>
          <button 
            onClick={() => { setActiveSubTab('support'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'support' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Support Tickets
          </button>
          <button 
            onClick={() => { setActiveSubTab('certificates'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'certificates' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Certificates
          </button>
          <button 
            onClick={() => { setActiveSubTab('announcements'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSubTab === 'announcements' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Announcements
          </button>
        </div>
      </div>

      {/* SEARCH BAR (Visible except for specific layouts if not needed) */}
      {['courses', 'assign', 'devices'].includes(activeSubTab) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={activeSubTab === 'courses' ? "Search courses..." : "Search students..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeSubTab === 'courses' && (
            <button 
              onClick={openCreateCourseModal}
              className="btn-primary py-2 px-4 flex items-center gap-2 rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: COURSES CURRICULUM */}
          {activeSubTab === 'courses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center border-b">
                      {course.banner_image ? (
                        <img src={course.banner_image} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-12 h-12 text-gray-300" />
                      )}
                      <div className="absolute top-3 right-3 flex gap-1">
                        <button onClick={() => openEditCourseModal(course)} className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-lg shadow-sm backdrop-blur" title="Edit Course"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCourse(course.id)} className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow-sm backdrop-blur" title="Delete Course"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <span className={`absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-semibold ${course.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {course.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{course.title}</h3>
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2 h-10">{course.description || 'No description.'}</p>
                      
                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-gray-400" /> {course.subject_count || 0} Subjects</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" /> {course.student_count || 0} Students</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 pt-0 border-t border-gray-50 flex items-center justify-between mt-3 bg-gray-50/50">
                    <span className="text-lg font-extrabold text-gray-900 mt-2">
                      {course.is_free ? <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">FREE</span> : `₹${course.price}`}
                    </span>
                    <button 
                      onClick={() => openCurriculumBuilder(course)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                    >
                      Build Curriculum &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: BULK ASSIGNMENT */}
          {activeSubTab === 'assign' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Students Selection List */}
              <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">
                  <span>Select Students ({selectedStudents.length} selected)</span>
                </h3>
                <div className="max-h-96 overflow-y-auto divide-y pr-2 space-y-1">
                  {filteredStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(student.id)} 
                        onChange={() => handleToggleStudentSelect(student.id)}
                        className="rounded text-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{student.name}</p>
                        <p className="text-xs text-gray-500 truncate">ID: {student.student_code} • {student.mobile || student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Courses Selection List */}
              <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Select Courses ({selectedCourses.length} selected)</h3>
                  <div className="max-h-80 overflow-y-auto divide-y pr-2 space-y-1">
                    {courses.map(course => (
                      <label key={course.id} className="flex items-center gap-3 py-2.5 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                        <input 
                          type="checkbox" 
                          checked={selectedCourses.includes(course.id)} 
                          onChange={() => handleToggleCourseSelect(course.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.is_free ? 'Free' : `₹${course.price}`}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t mt-4">
                  <button 
                    onClick={handleBulkAssign}
                    disabled={!selectedStudents.length || !selectedCourses.length}
                    className="w-full btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Assign Selected Courses
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASE REQUESTS */}
          {activeSubTab === 'purchases' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-600 font-semibold">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Proof</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{p.student_name}</p>
                        <p className="text-xs text-gray-500">ID: {p.student_code}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{p.course_title}</td>
                      <td className="px-6 py-4 font-bold text-green-600">₹{p.amount_paid}</td>
                      <td className="px-6 py-4">
                        {p.payment_screenshot ? (
                          <button 
                            onClick={() => { setSelectedScreenshot(p.payment_screenshot); setScreenshotModalOpen(true); }}
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Proof
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">No screenshot</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.status === 'pending' ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleProcessPurchase(p.id, 'approved')} className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200">Approve</button>
                            <button onClick={() => handleProcessPurchase(p.id, 'rejected')} className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200">Reject</button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.status.toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: STUDENT DEVICE LOCKS */}
          {activeSubTab === 'devices' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-600 font-semibold">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Bound Device ID</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">ID: {student.student_code}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-700">
                        {student.android_device_id || <span className="text-yellow-600 font-medium">Unlocked (Will lock on first login)</span>}
                      </td>
                      <td className="px-6 py-4 capitalize">{student.status}</td>
                      <td className="px-6 py-4 text-center">
                        {student.android_device_id ? (
                          <button onClick={() => handleResetDevice(student.id)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200">Reset Device ID</button>
                        ) : (
                          <span className="text-gray-400 text-xs">No active lock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: SUPPORT TICKETS */}
          {activeSubTab === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-5 rounded-2xl border shadow-sm">
              {/* Tickets Inbox list */}
              <div className="lg:col-span-4 border-r pr-4 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm mb-2">Student Tickets Inbox</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {tickets.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${activeTicket?.id === t.id ? 'border-blue-600 bg-blue-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.status === 'open' ? 'bg-amber-100 text-amber-800' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {t.status.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold text-xs text-gray-850 truncate">{t.subject}</p>
                      <p className="text-[10px] text-gray-500 mt-1">From: {t.student_name} ({t.student_code})</p>
                    </div>
                  ))}
                  {tickets.length === 0 && <p className="text-center text-xs text-gray-400 py-12">No student support tickets.</p>}
                </div>
              </div>

              {/* Messaging Panel */}
              <div className="lg:col-span-8 flex flex-col min-h-[400px] justify-between">
                {activeTicket ? (
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    <div className="border-b pb-3 mb-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{activeTicket.subject}</h4>
                        <p className="text-[10px] text-gray-400">Student: {activeTicket.student_name} ({activeTicket.student_code})</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={activeTicket.status} 
                          onChange={e => handleUpdateTicketStatus(e.target.value)}
                          className="px-2 py-1 border rounded text-xs focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2 mb-4">
                      {loadingMessages ? (
                        <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div>
                      ) : (
                        ticketMessages.map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender_role !== 'student' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-3 rounded-2xl max-w-xs ${msg.sender_role !== 'student' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                              <p className="text-xs">{msg.message}</p>
                              {msg.attachment_path && (
                                <div className="mt-2 pt-2 border-t border-white/20">
                                  <a href={msg.attachment_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-200 hover:text-white underline font-semibold">
                                    View Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                            <span className="text-[8px] text-gray-400 font-mono mt-1">{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleSendReply} className="border-t pt-3 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Type reply message..." 
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-xl text-xs bg-gray-50"
                        required
                      />
                      <button type="submit" className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="h-full flex-1 flex items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-dashed">
                    <div>
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">Select a student ticket from the left panel to message them.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CERTIFICATES CONTROL */}
          {activeSubTab === 'certificates' && (
            <div className="space-y-6">
              {/* Uploader Template section */}
              <div className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Upload Certificate Template</h3>
                  <form onSubmit={handleTemplateUpload} className="space-y-4 text-xs text-gray-700">
                    <div>
                      <label className="block font-bold mb-1">Background Template Background *</label>
                      <input type="file" onChange={e => setSelectedTemplateFile(e.target.files[0])} accept="image/*" className="w-full text-xs" required />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Institute Logo Overlay (Optional)</label>
                      <input type="file" onChange={e => setSelectedLogoFile(e.target.files[0])} accept="image/*" className="w-full text-xs" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Institute Signature Overlay (Optional)</label>
                      <input type="file" onChange={e => setSelectedSignatureFile(e.target.files[0])} accept="image/*" className="w-full text-xs" />
                    </div>
                    <button type="submit" disabled={uploading} className="btn-primary py-2 px-4 rounded-xl font-bold flex items-center gap-1.5">
                      {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload & Activate
                    </button>
                  </form>
                </div>

                {/* Reissue section */}
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Manual / Reissue Certificate</h3>
                  <form onSubmit={handleReissueCert} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold mb-1">Select Student</label>
                      <select 
                        value={reissueForm.studentId}
                        onChange={e => setReissueForm({ ...reissueForm, studentId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none"
                        required
                      >
                        <option value="">Choose Student</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Select Course Module</label>
                      <select 
                        value={reissueForm.courseId}
                        onChange={e => setReissueForm({ ...reissueForm, courseId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none"
                        required
                      >
                        <option value="">Choose Course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 shadow">
                      <Bookmark className="w-4 h-4" /> Issue Certificate
                    </button>
                  </form>
                </div>
              </div>

              {/* Pending approval list */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-gray-900 text-sm">Certificate Requests Queue</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-600 font-semibold">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Course Completed</th>
                      <th className="px-6 py-4">Certificate Number</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {certRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{req.student_name}</p>
                          <p className="text-xs text-gray-500">ID: {req.student_code}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{req.course_title}</td>
                        <td className="px-6 py-4 font-mono text-xs">{req.certificate_number}</td>
                        <td className="px-6 py-4 text-center">
                          {req.status === 'pending_approval' ? (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleApproveCert(req.id, 'approved')} className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200">Approve</button>
                              <button onClick={() => handleApproveCert(req.id, 'rejected')} className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200">Reject</button>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {req.status.toUpperCase()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: ANNOUNCEMENTS */}
          {activeSubTab === 'announcements' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-5 rounded-2xl border shadow-sm">
              {/* Creator Form */}
              <div className="lg:col-span-5 border-r pr-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Broadcast New Announcement</h3>
                <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Schedule Update"
                      value={annForm.title}
                      onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Content details *</label>
                    <textarea 
                      placeholder="Announcement description..."
                      value={annForm.content}
                      onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                      rows="4"
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Audience</label>
                    <select 
                      value={annForm.target_type}
                      onChange={e => setAnnForm({ ...annForm, target_type: e.target.value, studentIds: [] })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    >
                      <option value="all">Broadcast to All Students</option>
                      <option value="selected">Broadcast to Selected Students</option>
                    </select>
                  </div>

                  {annForm.target_type === 'selected' && (
                    <div>
                      <label className="block font-bold mb-1.5">Select Recipients ({annForm.studentIds.length} selected)</label>
                      <div className="max-h-40 overflow-y-auto border rounded-xl p-2.5 divide-y space-y-1">
                        {students.map(s => (
                          <label key={s.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={annForm.studentIds.includes(s.id)}
                              onChange={() => handleAnnStudentSelect(s.id)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-[11px] font-semibold text-gray-800">{s.name} ({s.student_code})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full btn-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow">
                    <Bell className="w-4 h-4" /> Send Announcement
                  </button>
                </form>
              </div>

              {/* Feed History */}
              <div className="lg:col-span-7 pl-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Broadcast History Feed</h3>
                <div className="divide-y max-h-96 overflow-y-auto space-y-3 pr-2">
                  {announcements.map(ann => (
                    <div key={ann.id} className="pt-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-950 text-sm">{ann.title}</span>
                        <span className="text-[9px] text-gray-400 font-mono">{new Date(ann.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <span className="text-[9px] bg-gray-150 text-gray-600 px-1.5 py-0.5 rounded font-semibold mt-2 inline-block">
                        Audience: {ann.target_type.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {announcements.length === 0 && <p className="text-center text-xs text-gray-450 py-12">No announcement history.</p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================
          MODAL: CREATE / EDIT COURSE
          ===================================================== */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">{editCourse ? 'Edit Course Details' : 'Create New Course'}</h3>
              <button onClick={() => setCourseModalOpen(false)} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg">✕</button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course Title *</label>
                <input 
                  type="text" 
                  value={courseForm.title} 
                  onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g. Basic Hardware Repairing"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  value={courseForm.description} 
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Describe what the student will learn..."
                  rows="3"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select 
                    value={courseForm.status} 
                    onChange={e => setCourseForm({ ...courseForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="active">Active/Enabled</option>
                    <option value="inactive">Disabled/Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pricing Mode</label>
                  <select 
                    value={courseForm.is_free} 
                    onChange={e => setCourseForm({ ...courseForm, is_free: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="0">Paid Course</option>
                    <option value="1">Free Course</option>
                  </select>
                </div>
              </div>

              {courseForm.is_free === 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price (INR ₹)</label>
                  <input 
                    type="number" 
                    value={courseForm.price} 
                    onChange={e => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="2999"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course Banner Image</label>
                <div className="mt-1 flex items-center gap-4">
                  {courseForm.banner_image && (
                    <img src={courseForm.banner_image} alt="banner" className="w-16 h-12 rounded object-cover border" />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer text-sm font-medium text-gray-700 border transition">
                    <Upload className="w-4 h-4" /> Upload Image
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </label>
                  {uploading && <Loader className="w-5 h-5 animate-spin text-blue-600" />}
                </div>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button type="submit" className="flex-1 btn-primary py-2.5 rounded-xl font-bold">
                  {editCourse ? 'Update Course' : 'Create Course'}
                </button>
                <button type="button" onClick={() => setCourseModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: CURRICULUM & SUBJECT BUILDER
          ===================================================== */}
      {curriculumModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Curriculum Builder: {selectedCourse.title}</h3>
                <p className="text-xs text-gray-500">Configure subjects and course content items (videos, PDFs, links).</p>
              </div>
              <button onClick={() => setCurriculumModalOpen(false)} className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg">✕</button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              {/* Left Column: Subject List */}
              <div className="md:col-span-5 border-r pr-2 flex flex-col justify-between max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-3">Course Subjects</h4>
                  <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="e.g. Charging Section" 
                      value={subjectTitle}
                      onChange={e => setSubjectTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Add</button>
                  </form>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedCourse.subjects || []).map(subject => (
                      <div 
                        key={subject.id} 
                        onClick={() => setItemForm(prev => ({ ...prev, subjectId: subject.id }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${itemForm.subjectId === subject.id ? 'border-blue-600 bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <span className="font-semibold text-xs text-gray-900">{subject.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold">{subject.items?.length || 0} items</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }} className="p-1 hover:bg-red-50 text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Content items */}
              <div className="md:col-span-7 flex flex-col justify-between max-h-[60vh] overflow-y-auto pl-2">
                {itemForm.subjectId ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-800">
                        Adding items to: <strong>{(selectedCourse.subjects || []).find(s => s.id === itemForm.subjectId)?.title}</strong>
                      </p>
                    </div>

                    <form onSubmit={handleAddItem} className="space-y-3 p-3 border rounded-xl bg-gray-50">
                      <h5 className="font-bold text-gray-900 text-xs">Add Subject Content Item</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold mb-1">Item Title</label>
                          <input type="text" placeholder="e.g. Diagnostics Video" value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} className="w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none" required />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold mb-1">Content Type</label>
                          <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value, file_path: '', youtube_url: '' })} className="w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none">
                            <option value="video">Upload Video (MP4)</option>
                            <option value="pdf">Upload PDF</option>
                            <option value="youtube">YouTube Embed Link</option>
                            <option value="downloadable_file">Downloadable File</option>
                          </select>
                        </div>
                      </div>

                      {itemForm.type === 'youtube' ? (
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold mb-1">YouTube URL</label>
                          <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={itemForm.youtube_url} onChange={e => setItemForm({ ...itemForm, youtube_url: e.target.value })} className="w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold mb-1">Upload File</label>
                          <div className="flex items-center gap-3">
                            <input type="file" onChange={handleItemFileUpload} className="text-xs" />
                            {uploading && <Loader className="w-4 h-4 animate-spin text-blue-600" />}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-gray-400">Order: <input type="number" value={itemForm.display_order} onChange={e => setItemForm({ ...itemForm, display_order: parseInt(e.target.value) || 0 })} className="w-12 ml-1 px-1 border text-center text-xs" /></span>
                        <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">Add Content</button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      <h5 className="font-bold text-gray-900 text-xs">Curriculum Materials:</h5>
                      <div className="divide-y max-h-40 overflow-y-auto pr-1">
                        {((selectedCourse.subjects || []).find(s => s.id === itemForm.subjectId)?.items || []).map(item => (
                          <div key={item.id} className="py-2 flex items-center justify-between hover:bg-gray-50">
                            <span className="text-xs font-semibold">{item.title}</span>
                            <button type="button" onClick={() => handleDeleteItem(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-dashed">
                    <p className="text-xs text-gray-500">Select a subject on the left to add materials.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setCurriculumModalOpen(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: VIEW PAYMENT SCREENSHOT PROOF
          ===================================================== */}
      {screenshotModalOpen && selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setScreenshotModalOpen(false)}>
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2" onClick={e => e.stopPropagation()}>
            <button onClick={() => setScreenshotModalOpen(false)} className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full shadow-lg z-10 w-8 h-8 flex items-center justify-center">✕</button>
            <img src={selectedScreenshot} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
