import { useEffect, useState } from 'react';
import { BookOpen, DollarSign, CheckCircle, Clock, Users, Search, Trash2, Plus, Edit, X, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function EnrolledCourses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [error, setError] = useState('');
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState('courses'); // courses, sales, students
  const [searchStudent, setSearchStudent] = useState('');
  
  // Modal States
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  
  // Forms Data
  const [enrollForm, setEnrollForm] = useState({
    student_id: '',
    amount_paid: '',
    payment_method: 'cash',
    status: 'completed'
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (!user) return setError('Please login to view enrolled courses');

      if (user.role === 'master' || user.role === 'admin') {
        // Master/Admin: Load courses, sales, and student list
        const [courseRes, purchaseRes, studentRes] = await Promise.all([
          api.get('/course/manage'),
          api.get('/transactions/all-purchases'),
          api.get('/admin/students')
        ]);

        if (courseRes.success) setCourses(courseRes.courses || []);
        else setError(courseRes.message || 'Failed to load courses');

        if (purchaseRes.success) setPurchases(purchaseRes.purchases || []);
        if (studentRes.success) setStudents(studentRes.students || []);

      } else if (user.role === 'student') {
        // Student: use student dashboard endpoint which returns enrolled courses
        const res = await api.get('/student/dashboard');
        if (res.success) setCourses(res.courses || []);
        else setError(res.message || 'Failed to load your enrollments');
      } else {
        setError('Access denied.');
      }
    } catch (e) {
      console.error(e);
      setError('Server connection error. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const viewEnrollments = async (courseId) => {
    try {
      const res = await api.get(`/course/manage/enrollments/${courseId}`);
      if (res.success) {
        setEnrollments(prev => ({ ...prev, [courseId]: res.enrollments }));
      } else {
        showToast(res.message || 'Failed to fetch enrollments', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error fetching enrollments', 'error');
    }
  };

  // Manual enrollment handler
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollForm.student_id || !enrollForm.amount_paid) {
      showToast('Please fill all fields', 'error');
      return;
    }

    try {
      const payload = {
        student_id: parseInt(enrollForm.student_id),
        course_id: selectedCourseForEnroll.id,
        amount_paid: parseFloat(enrollForm.amount_paid),
        payment_method: enrollForm.payment_method,
        status: enrollForm.status
      };
      
      const res = await api.post('/transactions/admin/purchase-course', payload);
      if (res.success) {
        showToast('Student enrolled and purchase recorded successfully', 'success');
        setShowEnrollModal(false);
        setEnrollForm({ student_id: '', amount_paid: '', payment_method: 'cash', status: 'completed' });
        loadData();
        viewEnrollments(selectedCourseForEnroll.id);
      } else {
        showToast(res.message || 'Failed to enroll student', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error registering enrollment', 'error');
    }
  };

  // Remove enrollment handler
  const handleRemoveEnrollment = async (enrollmentId, courseId) => {
    if (!confirm('Are you sure you want to remove this student enrollment? This will delete their course access.')) return;
    try {
      const res = await api.delete(`/course/manage/enroll/${enrollmentId}`);
      if (res.success) {
        showToast('Enrollment removed successfully', 'success');
        loadData();
        viewEnrollments(courseId);
      } else {
        showToast(res.message || 'Failed to remove enrollment', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error removing enrollment', 'error');
    }
  };

  // Update payment/sale handler
  const handleUpdatePurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/transactions/admin/purchase/${editingPurchase.id}`, {
        amount_paid: parseFloat(editingPurchase.amount_paid),
        payment_method: editingPurchase.payment_method,
        status: editingPurchase.status
      });

      if (res.success) {
        showToast('Transaction and enrollment synced successfully', 'success');
        setShowEditPurchaseModal(false);
        setEditingPurchase(null);
        loadData();
      } else {
        showToast(res.message || 'Failed to update transaction', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating transaction', 'error');
    }
  };

  // Delete transaction handler
  const handleDeletePurchase = async (purchaseId) => {
    if (!confirm('Are you sure you want to delete this course purchase transaction? This will also remove the student enrollment.')) return;
    try {
      const res = await api.delete(`/transactions/admin/purchase/${purchaseId}`);
      if (res.success) {
        showToast('Transaction and enrollment deleted', 'success');
        loadData();
      } else {
        showToast(res.message || 'Failed to delete transaction', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error deleting transaction', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-slate-500 text-sm">Loading course control panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary text-sm">Retry Connection</button>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalRevenue = purchases.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  const completedSales = purchases.filter(p => p.status === 'completed').length;
  const uniqueStudents = [...new Set(purchases.map(p => p.student_id))].length;

  const filteredStudents = students.filter(s =>
    s.student_id?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16 transition">
      <Navbar />
      <ToastContainer />

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Admin/Master Panel */}
        {(user?.role === 'master' || user?.role === 'admin') ? (
          <div className="space-y-8">
            
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-emerald-600" />
                Course Control Panel
              </h1>
              <p className="text-slate-500 text-sm mt-1">Manage course sales, student enrollments, and payments in one dashboard.</p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-850 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sales</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-850 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Students</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{uniqueStudents}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-850 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed Transactions</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{completedSales}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-850 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Courses</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{courses.length}</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
              <button
                onClick={() => setActiveTab('courses')}
                className={`pb-3 px-1 font-bold text-sm border-b-2 transition ${
                  activeTab === 'courses' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Course Enrollments
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`pb-3 px-1 font-bold text-sm border-b-2 transition ${
                  activeTab === 'sales' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Sales & Payments Ledger
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`pb-3 px-1 font-bold text-sm border-b-2 transition ${
                  activeTab === 'students' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Student Directory
              </button>
            </div>

            {/* TAB: COURSES */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <p className="text-slate-450 dark:text-slate-500 text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border">No courses found.</p>
                ) : (
                  courses.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white">{c.title || c.course_name}</h3>
                          <p className="text-xs text-slate-400 font-semibold mt-1">
                            Duration: {c.duration_days || c.duration || '-'} • Price: ₹{parseFloat(c.price || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 font-bold px-3 py-1.5 rounded-lg">
                            Enrolled: <strong>{c.student_count || c.enrolled_students || 0}</strong>
                          </span>
                          <button
                            onClick={() => viewEnrollments(c.id)}
                            className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition font-bold"
                          >
                            View Students
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourseForEnroll(c);
                              setShowEnrollModal(true);
                            }}
                            className="text-xs bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-emerald-700 transition font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Enroll Student
                          </button>
                        </div>
                      </div>

                      {/* Enrolled Students Details Accordion */}
                      {enrollments[c.id] && (
                        <div className="border-t border-slate-100 dark:border-slate-750 pt-4 overflow-x-auto">
                          {enrollments[c.id].length === 0 ? (
                            <p className="text-xs text-slate-450 dark:text-slate-500 py-2">No students enrolled in this course yet.</p>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="text-slate-400 font-bold uppercase border-b dark:border-slate-700">
                                  <th className="py-2.5">Name</th>
                                  <th>Student ID</th>
                                  <th>Mobile</th>
                                  <th>Enrollment Date</th>
                                  <th>Payment Status</th>
                                  <th className="text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-750">
                                {enrollments[c.id].map(e => (
                                  <tr key={e.id} className="text-slate-650 dark:text-slate-300">
                                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-100">{e.name}</td>
                                    <td>{e.student_code || e.student_id}</td>
                                    <td>{e.mobile || '-'}</td>
                                    <td>{e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString() : '-'}</td>
                                    <td>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                        e.payment_status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-450' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-450'
                                      }`}>
                                        {e.payment_status || 'completed'}
                                      </span>
                                    </td>
                                    <td className="text-right">
                                      <button
                                        onClick={() => handleRemoveEnrollment(e.id, c.id)}
                                        className="text-red-500 hover:text-red-700 p-1 transition"
                                        title="Remove Enrollment"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: SALES & PAYMENTS LEDGER */}
            {activeTab === 'sales' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850 overflow-hidden">
                <div className="p-5 border-b dark:border-slate-750 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-white">Transaction Logs</h3>
                  <button onClick={loadData} className="text-slate-400 hover:text-emerald-600 transition p-1"><RefreshCw className="w-4 h-4" /></button>
                </div>
                {purchases.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No transactions recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-850 text-slate-450 dark:text-slate-400 font-bold border-b dark:border-slate-750">
                        <tr>
                          <th className="px-6 py-3">Student</th>
                          <th className="px-6 py-3">Course</th>
                          <th className="px-6 py-3">Amount</th>
                          <th className="px-6 py-3">Method</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                        {purchases.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 text-slate-650 dark:text-slate-350">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800 dark:text-white">{p.student_name}</p>
                              <p className="text-xs text-slate-400">{p.student_id}</p>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{p.course_name}</td>
                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white">₹{parseFloat(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 uppercase text-xs font-semibold text-slate-500">{p.payment_method}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                p.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-450' :
                                p.status === 'pending' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-450' :
                                'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs">{new Date(p.purchase_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setEditingPurchase(p);
                                  setShowEditPurchaseModal(true);
                                }}
                                className="text-slate-400 hover:text-emerald-600 p-1"
                                title="Edit Transaction"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(p.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: STUDENT DIRECTORY */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students by Student ID, name, email or mobile..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-750 dark:bg-slate-800 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-450 dark:text-slate-500">No students found matching your search.</div>
                  ) : (
                    filteredStudents.map(s => {
                      const studentPurchases = purchases.filter(p => p.student_id === s.id);
                      const totalSpent = studentPurchases.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
                      return (
                        <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-5 flex flex-col justify-between hover:shadow-md transition">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">{s.name}</h3>
                                <p className="text-xs text-slate-400 font-semibold">{s.student_id}</p>
                              </div>
                              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-lg font-bold">
                                {s.class || 'LMS'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">📧 {s.email}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">📱 {s.mobile || 'No Mobile'}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-750">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Courses Owned</p>
                              <p className="text-lg font-black text-emerald-600">{studentPurchases.length}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Investment</p>
                              <p className="text-lg font-black text-slate-800 dark:text-white">₹{totalSpent.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* Student Role: List Enrolled Courses */
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">My Enrolled Courses</h2>
              <p className="text-slate-500 text-sm mt-1">Access study materials and progress for your active courses.</p>
            </div>
            
            {courses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-12 text-center border">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">You are not enrolled in any courses yet.</p>
                <a href="/courses" className="text-emerald-600 font-semibold hover:underline mt-2 inline-block">Browse and Purchase Courses</a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(c => (
                  <div key={c.enrollment_id || c.course_id || c.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850 p-5 flex gap-4 hover:shadow-md transition">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {c.banner_image ? (
                        <img src={c.banner_image} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base line-clamp-1">{c.course_name || c.title}</h3>
                        <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {c.enrollment_status || c.status || 'Active'}
                        </span>
                        <a href="/courses" className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition font-bold">Open Course</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL: MANUAL ENROLLMENT */}
      {showEnrollModal && selectedCourseForEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition">
            <div className="flex items-center justify-between p-6 border-b dark:border-slate-750">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Enroll Student</h3>
                <p className="text-xs text-slate-400 mt-0.5">Course: {selectedCourseForEnroll.title}</p>
              </div>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleEnrollStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Student</label>
                <select
                  value={enrollForm.student_id}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  required
                >
                  <option value="">Choose a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fee Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    value={enrollForm.amount_paid}
                    onChange={(e) => setEnrollForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={enrollForm.payment_method}
                    onChange={(e) => setEnrollForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI/Online</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={enrollForm.status}
                    onChange={(e) => setEnrollForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition mt-6 text-sm"
              >
                Confirm Course Access
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TRANSACTION */}
      {showEditPurchaseModal && editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition">
            <div className="flex items-center justify-between p-6 border-b dark:border-slate-750">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Edit Purchase Transaction</h3>
                <p className="text-xs text-slate-400 mt-0.5">Student: {editingPurchase.student_name}</p>
              </div>
              <button onClick={() => setShowEditPurchaseModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleUpdatePurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fee Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    value={editingPurchase.amount_paid}
                    onChange={(e) => setEditingPurchase(prev => ({ ...prev, amount_paid: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={editingPurchase.payment_method}
                    onChange={(e) => setEditingPurchase(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI/Online</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Status</label>
                  <select
                    value={editingPurchase.status}
                    onChange={(e) => setEditingPurchase(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-250 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition mt-6 text-sm"
              >
                Update & Sync Enrollment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
