import { useState, useEffect } from 'react';
import { BookOpen, Loader, Search, DollarSign, CheckCircle, Clock, AlertCircle, Download, Plus, Edit, Trash2, Eye } from 'lucide-react';
import api from '../lib/api';
import { showToast } from './Toast';

export default function RepairingCoursePurchase() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    amount_paid: '',
    payment_method: 'card'
  });
  const [tab, setTab] = useState('courses'); // courses, purchases, students

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [studentsRes, coursesRes, purchasesRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/courses'),
        api.get('/transactions/all-purchases')
      ]);

      if (studentsRes?.success) setStudents(studentsRes.students || []);
      if (coursesRes?.success) setCourses(coursesRes.courses || []);
      if (purchasesRes?.success) setPurchases(purchasesRes.purchases || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.student_id?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handlePurchaseCourse = async (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.course_id || !formData.amount_paid) {
      showToast('All fields required', 'error');
      return;
    }

    try {
      const res = await api.post('/transactions/admin/purchase-course', formData);
      if (res?.success) {
        showToast('Course purchased successfully!', 'success');
        setShowPurchaseModal(false);
        setFormData({ student_id: '', course_id: '', amount_paid: '', payment_method: 'card' });
        loadAllData();
      }
    } catch (err) {
      showToast('Failed to purchase course', 'error');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!confirm('Delete this purchase?')) return;
    try {
      const res = await api.delete(`/transactions/admin/purchase/${purchaseId}`);
      if (res?.success) {
        showToast('Purchase deleted', 'success');
        loadAllData();
      }
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get student details
  const studentStats = selectedStudent ? {
    totalPurchases: purchases.filter(p => p.student_id === selectedStudent.id).length,
    totalSpent: purchases.filter(p => p.student_id === selectedStudent.id).reduce((sum, p) => sum + (p.amount_paid || 0), 0)
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repairing Course Purchase</h2>
          <p className="text-gray-600 mt-1">Manage course sales, payments, and student information</p>
        </div>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Purchase
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['courses', 'purchases', 'students'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 px-4 font-medium border-b-2 transition capitalize ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* COURSES TAB */}
      {tab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">No courses available</div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
                <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded mb-3 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">{course.course_name}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{course.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600">₹{course.price}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {purchases.filter(p => p.course_id === course.id).length} sold
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, course_id: course.id }));
                    setShowPurchaseModal(true);
                  }}
                  className="w-full mt-3 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
                >
                  Sell Course
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* PURCHASES TAB */}
      {tab === 'purchases' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No purchases yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Course</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchases.map(purchase => {
                    const student = students.find(s => s.id === purchase.student_id);
                    const course = courses.find(c => c.id === purchase.course_id);
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{student?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm">{course?.course_name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">₹{purchase.amount_paid}</td>
                        <td className="px-4 py-3 text-sm capitalize text-gray-600">{purchase.payment_method}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                            purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STUDENTS TAB */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Student ID, Name, or Email..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map(student => {
              const studentPurchases = purchases.filter(p => p.student_id === student.id);
              const totalSpent = studentPurchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition hover:shadow-lg ${
                    selectedStudent?.id === student.id ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.student_id}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{student.class}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{student.email}</p>
                  <p className="text-sm text-gray-600 mb-3">📱 {student.mobile}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-gray-500">Total Purchases</p>
                      <p className="text-lg font-bold text-blue-600">{studentPurchases.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Spent</p>
                      <p className="text-lg font-bold text-green-600">₹{totalSpent}</p>
                    </div>
                  </div>

                  {studentPurchases.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">Recent Purchases:</p>
                      <div className="space-y-1">
                        {studentPurchases.slice(0, 2).map(p => {
                          const course = courses.find(c => c.id === p.course_id);
                          return (
                            <div key={p.id} className="text-xs text-gray-700 flex justify-between">
                              <span>{course?.course_name}</span>
                              <span className="font-bold">₹{p.amount_paid}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, student_id: student.id }));
                      setShowPurchaseModal(true);
                    }}
                    className="w-full mt-3 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 text-sm"
                  >
                    Add Purchase
                  </button>
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">No students found</div>
          )}
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Add Course Purchase</h3>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setFormData({ student_id: '', course_id: '', amount_paid: '', payment_method: 'card' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePurchaseCourse} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => {
                    const course = courses.find(c => c.id === parseInt(e.target.value));
                    setFormData(prev => ({
                      ...prev,
                      course_id: e.target.value,
                      amount_paid: course?.price || ''
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_name} (₹{c.price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">₹</span>
                  <input
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="card">Debit/Credit Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Confirm Purchase
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
