import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/courses');
        if (res.success) setCourses(res.courses);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6">Loading courses...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Courses</h1>
      {courses.length === 0 ? <p>No courses available</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map(c => (
            <div key={c.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{c.title}</h3>
              <p className="text-sm text-gray-500">{c.is_free ? 'Free' : `₹${parseFloat(c.price||0).toFixed(2)}`}</p>
              <button className="mt-3 btn-primary">View</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
