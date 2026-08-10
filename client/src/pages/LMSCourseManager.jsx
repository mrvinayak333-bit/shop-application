import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Plus, Edit3, Trash2, ChevronDown, ChevronRight,
  FileText, FileCode, Link, Archive,
  CheckCircle, Eye, Save, Loader, BarChart3, Video,
  Users, TrendingUp, AlertCircle, Upload, X, Play,
  GripVertical, RefreshCw, Star, ArrowLeft, ExternalLink
} from 'lucide-react';
import api, { getApiBase } from '../lib/api';
import ToastContainer, { showToast } from '../components/Toast';

const YoutubeIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const ImageIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ── Material type config ──────────────────────────────────────────────────────
const MATERIAL_TYPES = [
  { value: 'youtube',  label: 'YouTube Video', icon: YoutubeIcon, color: 'text-red-500',    bg: 'bg-red-50 border-red-200',   desc: 'Paste YouTube URL' },
  { value: 'pdf',      label: 'PDF Document',  icon: FileText,    color: 'text-sky-500',    bg: 'bg-sky-50 border-sky-200',   desc: 'Upload PDF (max 100MB)' },
  { value: 'image',    label: 'Image',         icon: ImageIcon,   color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200', desc: 'Upload image file' },
  { value: 'notes',    label: 'Notes / Text',  icon: FileCode,    color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200',  desc: 'Write formatted notes' },
  { value: 'zip',      label: 'ZIP / Archive', icon: Archive,     color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-200', desc: 'Upload ZIP file' },
  { value: 'link',     label: 'External Link', icon: Link,        color: 'text-teal-500',   bg: 'bg-teal-50 border-teal-200', desc: 'External website URL' },
];

const getMaterialType = (v) => MATERIAL_TYPES.find(t => t.value === v) || MATERIAL_TYPES[0];

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [/youtu\.be\/([^?&#]+)/, /youtube\.com\/watch\?v=([^&#]+)/, /youtube\.com\/embed\/([^?&#]+)/, /youtube\.com\/shorts\/([^?&#]+)/];
  for (const p of patterns) { const m = url.match(p); if (m && m[1]?.length === 11) return m[1]; }
  return null;
}

function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return cleanPath;
}

// ── Auto-save hook ────────────────────────────────────────────────────────────
function useAutoSave(fn, delay = 2000) {
  const timer = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const trigger = useCallback((...args) => {
    clearTimeout(timer.current);
    setSaved(false);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try { await fn(...args); setSaved(true); setTimeout(() => setSaved(false), 2000); }
      catch (e) { /* noop */ }
      finally { setSaving(false); }
    }, delay);
  }, [fn, delay]);

  return { trigger, saving, saved };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LMSCourseManager() {
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [subjectItems, setSubjectItems] = useState({});  // { subjectId: [...items] }
  const [activeView, setActiveView] = useState('courses'); // 'courses' | 'builder' | 'analytics'

  // Modals
  const [courseModal, setCourseModal] = useState(null);   // null | 'create' | 'edit'
  const [subjectModal, setSubjectModal] = useState(null); // null | { courseId, subject? }
  const [materialModal, setMaterialModal] = useState(null); // null | { subjectId, item? }

  useEffect(() => { loadCourses(); loadAnalytics(); }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    const res = await api.get('/course/manage');
    if (res?.success) setCourses(res.courses || []);
    setLoadingCourses(false);
  };

  const loadAnalytics = async () => {
    const res = await api.get('/course/manage/analytics');
    if (res?.success) setAnalytics(res);
  };

  const loadSubjects = async (courseId) => {
    const res = await api.get(`/course/manage/${courseId}/subjects`);
    if (res?.success) setSubjects(res.subjects || []);
  };

  const loadItems = async (subjectId) => {
    const res = await api.get(`/course/manage/subject/${subjectId}/items`);
    if (res?.success) {
      setSubjectItems(prev => ({ ...prev, [subjectId]: res.items || [] }));
    }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    setActiveView('builder');
    setExpandedSubjects({});
    setSubjectItems({});
    await loadSubjects(course.id);
  };

  const toggleSubject = async (subjectId) => {
    const isOpen = expandedSubjects[subjectId];
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !isOpen }));
    if (!isOpen && !subjectItems[subjectId]) await loadItems(subjectId);
  };

  // ── Course CRUD ─────────────────────────────────────────────────────────────
  const deleteCourse = async (id) => {
    if (!window.confirm('Delete this course? All subjects and materials will be removed.')) return;
    const res = await api.delete(`/course/manage/${id}`);
    if (res?.success) { showToast('Course deleted'); loadCourses(); if (selectedCourse?.id === id) { setSelectedCourse(null); setActiveView('courses'); } }
    else showToast(res?.message || 'Failed', 'error');
  };

  // ── Subject CRUD ────────────────────────────────────────────────────────────
  const deleteSubject = async (id) => {
    if (!window.confirm('Delete this subject and all its materials?')) return;
    const res = await api.delete(`/course/manage/subject/${id}`);
    if (res?.success) { showToast('Subject deleted'); loadSubjects(selectedCourse.id); }
    else showToast(res?.message || 'Failed', 'error');
  };

  // ── Material CRUD ───────────────────────────────────────────────────────────
  const deleteMaterial = async (subjectId, itemId) => {
    if (!window.confirm('Delete this material?')) return;
    const res = await api.delete(`/course/manage/subject-item/${itemId}`);
    if (res?.success) { showToast('Material deleted'); loadItems(subjectId); }
    else showToast(res?.message || 'Failed', 'error');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ToastContainer />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">LMS Course Manager</h1>
            <p className="text-xs text-slate-500">Professional Learning Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setActiveView('courses'); setSelectedCourse(null); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${activeView === 'courses' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            📚 Courses
          </button>
          <button onClick={() => setActiveView('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${activeView === 'analytics' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            📊 Analytics
          </button>
          <button onClick={() => setCourseModal('create')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Course
          </button>
        </div>
      </div>

      <div className="p-6">

        {/* ── ANALYTICS VIEW ────────────────────────────────────────────────── */}
        {activeView === 'analytics' && (
          <AnalyticsView analytics={analytics} onRefresh={loadAnalytics} />
        )}

        {/* ── COURSES LIST VIEW ──────────────────────────────────────────────── */}
        {activeView === 'courses' && (
          <CoursesView
            courses={courses}
            loading={loadingCourses}
            analytics={analytics}
            onSelect={selectCourse}
            onEdit={(c) => setCourseModal({ mode: 'edit', course: c })}
            onDelete={deleteCourse}
            onRefresh={loadCourses}
          />
        )}

        {/* ── COURSE BUILDER VIEW ───────────────────────────────────────────── */}
        {activeView === 'builder' && selectedCourse && (
          <CourseBuilderView
            course={selectedCourse}
            subjects={subjects}
            expandedSubjects={expandedSubjects}
            subjectItems={subjectItems}
            onToggleSubject={toggleSubject}
            onBack={() => { setActiveView('courses'); setSelectedCourse(null); }}
            onAddSubject={() => setSubjectModal({ courseId: selectedCourse.id })}
            onEditSubject={(sub) => setSubjectModal({ courseId: selectedCourse.id, subject: sub })}
            onDeleteSubject={deleteSubject}
            onAddMaterial={(subjectId) => setMaterialModal({ subjectId })}
            onEditMaterial={(subjectId, item) => setMaterialModal({ subjectId, item })}
            onDeleteMaterial={deleteMaterial}
            onReloadSubjects={() => loadSubjects(selectedCourse.id)}
            onReloadItems={loadItems}
          />
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {courseModal && (
        <CourseModal
          mode={typeof courseModal === 'string' ? courseModal : courseModal.mode}
          course={typeof courseModal === 'object' ? courseModal.course : null}
          onClose={() => setCourseModal(null)}
          onSaved={() => { setCourseModal(null); loadCourses(); }}
        />
      )}

      {subjectModal && (
        <SubjectModal
          courseId={subjectModal.courseId}
          subject={subjectModal.subject}
          onClose={() => setSubjectModal(null)}
          onSaved={() => { setSubjectModal(null); loadSubjects(subjectModal.courseId); }}
        />
      )}

      {materialModal && (
        <MaterialModal
          subjectId={materialModal.subjectId}
          item={materialModal.item}
          onClose={() => setMaterialModal(null)}
          onSaved={() => { setMaterialModal(null); loadItems(materialModal.subjectId); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsView({ analytics, onRefresh }) {
  const t = analytics?.totals || {};
  const stats = [
    { label: 'Total Courses',     value: t.total_courses || 0,     icon: BookOpen,   color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Subjects',    value: t.total_subjects || 0,    icon: GripVertical, color: 'from-sky-500 to-blue-500' },
    { label: 'Total Materials',   value: t.total_materials || 0,   icon: FileText,   color: 'from-violet-500 to-purple-500' },
    { label: 'Videos',            value: t.total_videos || 0,      icon: Video,      color: 'from-red-500 to-rose-500' },
    { label: 'PDFs',              value: t.total_pdfs || 0,        icon: FileText,   color: 'from-amber-500 to-orange-500' },
    { label: 'Total Enrollments', value: t.total_enrollments || 0, icon: Users,      color: 'from-indigo-500 to-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">📊 LMS Analytics</h2>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-black text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {analytics?.mostViewed && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-slate-700">Most Viewed Material</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{analytics.mostViewed.title}</div>
              <div className="text-xs text-slate-500">{analytics.mostViewed.view_count} views • {analytics.mostViewed.material_type}</div>
            </div>
          </div>
        </div>
      )}

      {analytics?.completionStats?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Course Completion Rates</h3>
          <div className="space-y-3">
            {analytics.completionStats.slice(0, 8).map(cs => (
              <div key={cs.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate max-w-[200px]">{cs.title}</span>
                  <span className="text-slate-500 shrink-0 ml-2">{cs.students} students • {cs.avg_completion}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${Math.min(cs.avg_completion || 0, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSES LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CoursesView({ courses, loading, analytics, onSelect, onEdit, onDelete, onRefresh }) {
  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">All Courses ({courses.length})</h2>
        <button onClick={onRefresh} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {courses.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-500">No courses yet</h3>
          <p className="text-xs text-slate-400 mt-1">Click "New Course" to create your first course</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
            {/* Thumbnail */}
            <div className="h-36 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
              {course.thumbnail ? (
                <img src={getFileUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="w-12 h-12 text-white/40" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${course.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'}`}>
                  {course.status === 'active' ? '● LIVE' : '○ DRAFT'}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-black text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{course.title}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description || 'No description'}</p>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.enrolled_students || 0} students</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {course.total_materials || 0} materials</span>
                {!course.is_free && <span className="text-emerald-600 font-bold">₹{course.price}</span>}
                {course.is_free && <span className="text-teal-600 font-bold">FREE</span>}
              </div>

              <div className="flex gap-2">
                <button onClick={() => onSelect(course)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Build Content
                </button>
                <button onClick={() => onEdit(course)}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(course.id)}
                  className="p-2 border border-red-100 rounded-lg hover:bg-red-50 transition text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE BUILDER VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CourseBuilderView({ course, subjects, expandedSubjects, subjectItems, onToggleSubject, onBack, onAddSubject, onEditSubject, onDeleteSubject, onAddMaterial, onEditMaterial, onDeleteMaterial, onReloadSubjects, onReloadItems }) {
  return (
    <div className="space-y-4">
      {/* Navigation & Back Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            Back to Courses
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold truncate max-w-xs">{course.title}</span>
        </div>

        <a
          href={`/courses/${course.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Preview Student View
        </a>
      </div>

      {/* Course Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          {course.thumbnail ? <img src={getFileUrl(course.thumbnail)} className="w-full h-full object-cover rounded-xl" alt="" /> : <BookOpen className="w-8 h-8 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-slate-800">{course.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{course.description || 'No description'}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span>{subjects.length} topics / subjects</span>
            <span>{Object.values(subjectItems).flat().length} materials uploaded</span>
            <span className={course.status === 'active' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>{course.status === 'active' ? '● Live' : '○ Draft'}</span>
          </div>
        </div>
        <button onClick={onAddSubject}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shrink-0 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Topic / Subject
        </button>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-500">No subjects yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Add subjects to organize your course content</p>
          <button onClick={onAddSubject} className="bg-emerald-600 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 transition">
            <Plus className="w-3.5 h-3.5 inline mr-1" /> Add First Subject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((sub, idx) => (
            <SubjectBlock
              key={sub.id}
              index={idx + 1}
              subject={sub}
              isExpanded={expandedSubjects[sub.id]}
              items={subjectItems[sub.id] || []}
              onToggle={() => onToggleSubject(sub.id)}
              onEdit={() => onEditSubject(sub)}
              onDelete={() => onDeleteSubject(sub.id)}
              onAddMaterial={() => onAddMaterial(sub.id)}
              onEditMaterial={(item) => onEditMaterial(sub.id, item)}
              onDeleteMaterial={(itemId) => onDeleteMaterial(sub.id, itemId)}
              onReload={() => onReloadItems(sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function SubjectBlock({ index, subject, isExpanded, items, onToggle, onEdit, onDelete, onAddMaterial, onEditMaterial, onDeleteMaterial, onReload }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Subject Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition" onClick={onToggle}>
        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm">{subject.title}</h3>
          <span className="text-[10px] text-slate-400">{subject.item_count || 0} materials</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onAddMaterial(); }}
            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg transition">
            <Plus className="w-3 h-3" /> Add
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Materials List */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">No materials yet in this subject</p>
              <button onClick={onAddMaterial} className="mt-2 text-xs text-emerald-600 font-bold hover:underline">+ Add Material</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <MaterialRow key={item.id} index={i + 1} item={item} onEdit={() => onEditMaterial(item)} onDelete={() => onDeleteMaterial(item.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL ROW
// ─────────────────────────────────────────────────────────────────────────────
function MaterialRow({ index, item, onEdit, onDelete }) {
  const mt = getMaterialType(item.material_type || item.type);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-white transition group">
      <span className="text-[10px] font-bold text-slate-400 w-5 text-center">{index}</span>
      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${mt.bg}`}>
        <mt.icon className={`w-3.5 h-3.5 ${mt.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{item.title}</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
          <span className={`font-bold ${mt.color}`}>{mt.label}</span>
          {item.duration_minutes > 0 && <span>• {item.duration_minutes} min</span>}
          {item.view_count > 0 && <span>• {item.view_count} views</span>}
          {item.material_type === 'youtube' && item.youtube_url && (
            <span className="text-red-400">• YouTube</span>
          )}
        </div>
      </div>

      {/* YouTube thumbnail preview */}
      {item.material_type === 'youtube' && item.youtube_url && (() => {
        const vid = extractYouTubeId(item.youtube_url);
        return vid ? <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} className="w-14 h-9 object-cover rounded-md border border-slate-200" alt="" /> : null;
      })()}

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CourseModal({ mode, course, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: course?.title || '',
    description: course?.description || '',
    price: course?.price || '',
    is_free: course?.is_free ? '1' : '0',
    status: course?.status || 'active',
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(course?.thumbnail ? getFileUrl(course.thumbnail) : null);
  const [saving, setSaving] = useState(false);

  const handleThumb = (e) => {
    const f = e.target.files[0];
    if (f) { setThumbnail(f); setThumbPreview(URL.createObjectURL(f)); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return showToast('Course title is required', 'error');
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (thumbnail) fd.append('thumbnail', thumbnail);

    const res = mode === 'create'
      ? await api.upload('/course/manage', fd)
      : await api.upload(`/course/manage/${course.id}`, fd);

    setSaving(false);
    if (res?.success) { showToast(mode === 'create' ? 'Course created!' : 'Course updated!'); onSaved(); }
    else showToast(res?.message || 'Failed to save', 'error');
  };

  return (
    <ModalWrapper title={mode === 'create' ? '✨ Create New Course' : '✏️ Edit Course'} onClose={onClose}>
      <div className="space-y-4">
        {/* Thumbnail */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Course Thumbnail</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              {thumbPreview ? <img src={thumbPreview} className="w-full h-full object-cover" alt="" /> : <BookOpen className="w-8 h-8 text-slate-300" />}
            </div>
            <label className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" /> Upload Image
              <input type="file" accept="image/*" className="hidden" onChange={handleThumb} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Course Title *</label>
          <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="e.g. Advanced Mobile Repairing" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
          <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="Describe what students will learn..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Pricing</label>
            <select className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.is_free} onChange={e => setForm(p => ({ ...p, is_free: e.target.value }))}>
              <option value="1">Free</option>
              <option value="0">Paid</option>
            </select>
          </div>
          {form.is_free === '0' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Price (₹)</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
          <select className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">● Active (visible to students)</option>
            <option value="inactive">○ Inactive (hidden)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {mode === 'create' ? 'Create Course' : 'Save Changes'}</>}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SubjectModal({ courseId, subject, onClose, onSaved }) {
  const [title, setTitle] = useState(subject?.title || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return showToast('Subject title is required', 'error');
    setSaving(true);
    const res = subject
      ? await api.put(`/course/manage/subject/${subject.id}`, { title })
      : await api.post(`/course/manage/${courseId}/subject`, { title });
    setSaving(false);
    if (res?.success) { showToast(subject ? 'Subject updated!' : 'Subject added!'); onSaved(); }
    else showToast(res?.message || 'Failed', 'error');
  };

  return (
    <ModalWrapper title={subject ? '✏️ Edit Subject' : '📚 Add New Subject'} onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject Title *</label>
        <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. Module 1: Introduction to Hardware" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {subject ? 'Save Changes' : 'Add Subject'}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL MODAL — supports all 6 material types
// ─────────────────────────────────────────────────────────────────────────────
function MaterialModal({ subjectId, item, onClose, onSaved }) {
  const existingType = item?.material_type || item?.type || 'youtube';
  const [selectedType, setSelectedType] = useState(existingType);
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    youtube_url: item?.youtube_url || '',
    external_url: item?.external_url || '',
    notes_content: item?.notes_content || '',
    duration_minutes: item?.duration_minutes || '',
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(item?.file_path ? getFileUrl(item.file_path) : null);
  const [youtubePreview, setYoutubePreview] = useState(null);
  const [ytValidating, setYtValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const mt = getMaterialType(selectedType);

  // YouTube preview validation
  const validateYouTube = async () => {
    if (!form.youtube_url) return;
    setYtValidating(true);
    setYoutubePreview(null);
    try {
      const res = await api.post('/course/validate-youtube', { url: form.youtube_url });
      if (res?.success) {
        setYoutubePreview(res);
        showToast('✅ YouTube URL valid!', 'success');
      } else {
        showToast(res?.message || 'Invalid YouTube URL', 'error');
      }
    } catch { showToast('Could not validate URL', 'error'); }
    setYtValidating(false);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    // Check 100MB limit
    if (f.size > 100 * 1024 * 1024) { showToast('File too large. Max 100MB allowed.', 'error'); return; }
    setFile(f);
    if (selectedType === 'image') setFilePreview(URL.createObjectURL(f));
    else setFilePreview(f.name);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return showToast('Title is required', 'error');

    if (selectedType === 'youtube') {
      const vid = extractYouTubeId(form.youtube_url);
      if (!vid) return showToast('Please enter a valid YouTube URL', 'error');
    }

    setSaving(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('material_type', selectedType);
    fd.append('type', selectedType);
    fd.append('description', form.description);
    fd.append('duration_minutes', form.duration_minutes || '0');

    if (selectedType === 'youtube') fd.append('youtube_url', form.youtube_url);
    if (selectedType === 'link') fd.append('external_url', form.external_url);
    if (selectedType === 'notes') fd.append('notes_content', form.notes_content);
    if (file) fd.append('file', file);

    // Simulate upload progress for large files
    let progressInterval = null;
    if (file && file.size > 5 * 1024 * 1024) {
      progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 300);
    }

    const res = item
      ? await api.upload(`/course/manage/subject-item/${item.id}`, fd)
      : await api.upload(`/course/manage/subject/${subjectId}/item`, fd);

    clearInterval(progressInterval);
    setUploadProgress(100);
    setSaving(false);

    if (res?.success) { showToast(item ? 'Material updated!' : 'Material added! 🎉'); onSaved(); }
    else showToast(res?.message || 'Failed to save material', 'error');
  };

  return (
    <ModalWrapper title={item ? '✏️ Edit Material' : '➕ Add New Material'} onClose={onClose} wide>
      {/* Material Type Selector */}
      {!item && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">Material Type</label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {MATERIAL_TYPES.map(t => (
              <button key={t.value} onClick={() => { setSelectedType(t.value); setFile(null); setFilePreview(null); setYoutubePreview(null); }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition ${selectedType === t.value ? `${t.bg} border-opacity-100` : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <t.icon className={`w-4 h-4 shrink-0 ${t.color}`} />
                <div>
                  <div className={`text-xs font-bold ${selectedType === t.value ? t.color : 'text-slate-700'}`}>{t.label}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Title *</label>
          <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Introduction to IC Chips" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Description (optional)</label>
          <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Brief description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        {/* Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Duration (minutes)</label>
            <input type="number" step="0.5" min="0" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. 15" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
          </div>
        </div>

        {/* ── YouTube ── */}
        {selectedType === 'youtube' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              <Youtube className="w-3.5 h-3.5 text-red-500 inline mr-1" /> YouTube URL *
            </label>
            <div className="flex gap-2">
              <input className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="https://youtu.be/xxxxx or https://www.youtube.com/watch?v=xxxxx"
                value={form.youtube_url} onChange={e => { setForm(p => ({ ...p, youtube_url: e.target.value })); setYoutubePreview(null); }} />
              <button onClick={validateYouTube} disabled={ytValidating || !form.youtube_url}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition disabled:opacity-50 shrink-0">
                {ytValidating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Preview
              </button>
            </div>
            {youtubePreview && (
              <div className="mt-3 rounded-xl overflow-hidden border border-red-200">
                <div className="aspect-video bg-black">
                  <iframe
                    src={`${youtubePreview.embedUrl}&autoplay=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube Preview"
                  />
                </div>
                <div className="bg-red-50 px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-slate-600">Video ID: <strong>{youtubePreview.videoId}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PDF / Image / ZIP ── */}
        {['pdf', 'image', 'zip'].includes(selectedType) && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              <mt.icon className={`w-3.5 h-3.5 ${mt.color} inline mr-1`} />
              Upload {mt.label} {selectedType === 'pdf' && <span className="text-slate-400 font-normal">(max 100MB)</span>}
            </label>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${mt.bg} hover:border-opacity-100`}>
              <mt.icon className={`w-8 h-8 ${mt.color}`} />
              <span className="text-xs font-bold text-slate-600">
                {filePreview
                  ? (selectedType === 'image' ? '✅ Image ready' : `✅ ${typeof filePreview === 'string' && filePreview.length < 40 ? filePreview : 'File ready'}`)
                  : `Click to choose ${mt.label}`}
              </span>
              {selectedType === 'image' && filePreview && <img src={filePreview} className="w-24 h-16 object-cover rounded-lg mt-1" alt="" />}
              <span className="text-[10px] text-slate-400">
                {selectedType === 'pdf' && 'PDF files only, max 100MB'}
                {selectedType === 'image' && 'JPG, PNG, WebP'}
                {selectedType === 'zip' && 'ZIP, RAR, 7Z archives'}
              </span>
              <input type="file"
                accept={selectedType === 'pdf' ? 'application/pdf' : selectedType === 'image' ? 'image/*' : '.zip,.rar,.7z'}
                className="hidden" onChange={handleFile} />
            </label>
            {item?.file_path && !file && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Existing file will be kept if no new file selected
              </div>
            )}
          </div>
        )}

        {/* ── External Link ── */}
        {selectedType === 'link' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              <Link className="w-3.5 h-3.5 text-teal-500 inline mr-1" /> External URL *
            </label>
            <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="https://example.com/resource"
              value={form.external_url} onChange={e => setForm(p => ({ ...p, external_url: e.target.value }))} />
          </div>
        )}

        {/* ── Notes ── */}
        {selectedType === 'notes' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              <FileCode className="w-3.5 h-3.5 text-amber-500 inline mr-1" /> Notes Content *
            </label>
            <textarea rows={8} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y font-mono"
              placeholder="Write your notes here... Supports plain text."
              value={form.notes_content} onChange={e => setForm(p => ({ ...p, notes_content: e.target.value }))} />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading...</span><span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {item ? 'Save Changes' : 'Add Material'}</>}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function ModalWrapper({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-base font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
