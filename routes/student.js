const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorize('student'));

router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Get student profile
    const { data: student, error: sErr } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (sErr) throw sErr;

    // 2. Get enrolled courses
    const { data: enrollments, error: eErr } = await supabase
      .from('course_enrollments')
      .select('*, courses(*), course_purchases(*)')
      .eq('student_id', studentId);
    
    if (eErr) throw eErr;

    // 3. Hydrate
    const courses = enrollments.map(en => ({
      ...en.courses,
      enrollment_id: en.id,
      assigned_at: en.enrolled_date,
      payment_status: en.payment_status,
      purchase_date: en.course_purchases?.[0]?.purchase_date
    }));

    res.json({ success: true, student, courses });
  } catch (err) {
    console.error('Student Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/course/:courseId', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const { data: enrollment } = await supabase.from('course_enrollments').select('id').eq('student_id', studentId).eq('course_id', courseId).single();
    if (!enrollment) return res.status(403).json({ success: false, message: 'Not enrolled' });

    const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single();
    const { data: subjects } = await supabase.from('course_subjects').select('*, course_subject_items(*)').eq('course_id', courseId).order('display_order');

    res.json({ success: true, course, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
