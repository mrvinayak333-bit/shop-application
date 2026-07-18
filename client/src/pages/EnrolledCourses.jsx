import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function EnrolledCourses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) return setError('Please login to view enrolled courses');

        if (user.role === 'master') {
          // Master: list all courses with counts
          const res = await api.get('/course/manage');
          if (res.success) setCourses(res.courses || []);
          else setError(res.message || 'Failed to load courses');
        } else if (user.role === 'student') {
          // Student: use student dashboard endpoint which returns enrolled courses
          const res = await api.get('/student/dashboard');
          if (res.success) setCourses(res.courses || []);
          else setError(res.message || 'Failed to load your enrollments');
        } else {
          setError('Enrolled Courses available for Master and Student roles only');
        }
      } catch (e) {
        console.error(e);
        setError('Server error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const viewEnrollments = async (courseId) => {
    try {
      const res = await api.get(`/course/manage/enrollments/${courseId}`);
      if (res.success) setEnrollments(prev => ({ ...prev, [courseId]: res.enrollments }));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Enrolled Courses</h2>
      {user?.role === 'master' && (
        <div className="space-y-4">
          {courses.length === 0 ? <p>No courses found.</p> : (
            courses.map(c => (
              <div key={c.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{c.title}</h3>
                    <p className="text-sm text-gray-500">Code: {c.slug} • Price: ₹{c.price || '0.00'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Enrolled: <strong>{c.enrolled_students || 0}</strong></span>
                    <button onClick={() => viewEnrollments(c.id)} className="btn-primary text-sm">View Students</button>
                  </div>
                </div>
                {enrollments[c.id] && (
                  <div className="mt-3 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th>Name</th>
                          <th>Student ID</th>
                          <th>Mobile</th>
                          <th>Enrolled Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments[c.id].map(e => (
                          <tr key={e.id} className="border-t">
                            <td className="py-2">{e.name}</td>
                            <td>{e.student_id}</td>
                            <td>{e.mobile}</td>
                            <td>{e.enrolled_date || e.created_at || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {user?.role === 'student' && (
        <div className="space-y-4">
          {courses.length === 0 ? <p>You are not enrolled in any courses.</p> : (
            courses.map(c => (
              <div key={c.enrollment_id || c.course_id || c.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{c.course_name || c.title}</h3>
                    <p className="text-sm text-gray-500">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Status: {c.enrollment_status || c.status || c.status}</p>
                  </div>
                  <div>
                    <a className="btn-primary text-sm" href={`/course/${c.course_id || c.id}`}>Open Course</a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
