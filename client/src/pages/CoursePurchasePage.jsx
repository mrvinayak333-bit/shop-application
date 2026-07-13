import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, BookOpen, Download, Play, Loader } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function CoursePurchase() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse'); // browse, purchased, materials

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadCourses();
  }, [isAuthenticated, user]);

  const loadCourses = async () => {
    try {
      const [availRes, purchasedRes] = await Promise.all([
        api.get('/transactions/student/available'),
        api.get('/transactions/student/purchased')
      ]);
      
      if (availRes?.success) setCourses(availRes.courses || []);
      if (purchasedRes?.success) setPurchasedCourses(purchasedRes.courses || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading courses:', err);
      setLoading(false);
    }
  };

  const handlePurchase = async (courseId) => {
    try {
      const res = await api.post('/transactions/purchase', { courseId });
      if (res?.success) {
        showToast('Course purchased successfully!', 'success');
        setTab('purchased');
        loadCourses();
      } else {
        showToast(res?.message || 'Purchase failed', 'error');
      }
    } catch (err) {
      showToast('Error processing purchase', 'error');
    }
  };

  const handleViewMaterials = async (course) => {
    try {
      const res = await api.get(`/transactions/student/course/${course.id}/materials`);
      if (res?.success) {
        setSelectedCourse(course);
        setMaterials(res.materials || []);
        setTab('materials');
      } else {
        showToast(res?.message || 'Failed to load materials', 'error');
      }
    } catch (err) {
      showToast('Error loading materials', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Hub</h1>
          <p className="text-gray-600">Browse and purchase courses to enhance your skills</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setTab('browse')}
            className={`pb-3 px-4 font-medium border-b-2 transition ${
              tab === 'browse' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            Browse Courses
          </button>
          <button
            onClick={() => setTab('purchased')}
            className={`pb-3 px-4 font-medium border-b-2 transition ${
              tab === 'purchased' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            My Purchases ({purchasedCourses.length})
          </button>
        </div>

        {/* Browse Tab */}
        {tab === 'browse' && (
          <div>
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No courses available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                    <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-white" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{course.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-bold text-blue-600">₹{course.price}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {course.material_count || 0} materials
                        </span>
                      </div>
                      {course.already_purchased ? (
                        <button disabled className="w-full bg-gray-300 text-gray-700 py-2 rounded font-medium">
                          ✓ Already Purchased
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(course.id)}
                          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" /> Purchase Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Purchased Courses Tab */}
        {tab === 'purchased' && (
          <div>
            {purchasedCourses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-4">No purchased courses yet</p>
                <button onClick={() => setTab('browse')} className="text-blue-600 hover:underline">
                  Browse and purchase courses
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {purchasedCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{course.title}</h3>
                      <p className="text-gray-600 text-sm">
                        Purchased: {new Date(course.purchase_date).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {course.material_count} study materials available
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewMaterials(course)}
                      className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition"
                    >
                      View Materials
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Materials View Tab */}
        {tab === 'materials' && selectedCourse && (
          <div>
            <button onClick={() => setTab('purchased')} className="mb-4 text-blue-600 hover:underline">
              ← Back to Purchased Courses
            </button>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCourse.title}</h2>
              <p className="text-gray-600">{selectedCourse.material_count} materials</p>
            </div>
            
            {materials.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No materials available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map(material => (
                  <div key={material.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {material.material_type === 'video' && <Play className="w-5 h-5 text-red-600" />}
                      {material.material_type === 'pdf' && <Download className="w-5 h-5 text-blue-600" />}
                      {material.material_type === 'document' && <BookOpen className="w-5 h-5 text-green-600" />}
                      {material.material_type === 'quiz' && <BookOpen className="w-5 h-5 text-purple-600" />}
                      <div>
                        <p className="font-medium text-gray-900">{material.title}</p>
                        <p className="text-sm text-gray-500">
                          {material.material_type.toUpperCase()}
                          {material.duration_minutes && ` • ${material.duration_minutes} min`}
                        </p>
                        {material.description && <p className="text-sm text-gray-600 mt-1">{material.description}</p>}
                      </div>
                    </div>
                    {material.file_path && (
                      <a href={material.file_path} download className="text-blue-600 hover:text-blue-800">
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
