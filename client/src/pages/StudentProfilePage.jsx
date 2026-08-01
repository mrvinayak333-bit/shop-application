import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Hash, Home, Upload, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function StudentProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [gender, setGender] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadProfile();
  }, [authLoading, isAuthenticated, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/profile');
      if (res && res.success && res.student) {
        const s = res.student;
        setStudent(s);
        setName(s.name || '');
        setFathersName(s.fathers_name || '');
        setAddress(s.address || '');
        setAge(s.age || '');
        setDob(s.dob ? s.dob.split('T')[0] : '');
        setMobile(s.mobile || '');
        setEmail(s.email || '');
        setAadhaarNumber(s.aadhaar_number || '');
        setGender(s.gender || '');
        if (s.profile_photo) {
          setPhotoPreview(s.profile_photo);
        }
      } else {
        showToast('Failed to load profile details', 'error');
      }
    } catch (err) {
      showToast('Error loading profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return showToast('Full Name is required', 'error');
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('fathers_name', fathersName);
      formData.append('address', address);
      formData.append('age', age);
      formData.append('dob', dob);
      formData.append('aadhaar_number', aadhaarNumber);
      formData.append('gender', gender);
      if (photoFile) {
        formData.append('profile_photo', photoFile);
      }

      const res = await api.upload('/student/profile', formData);
      if (res && res.success) {
        showToast('Profile updated successfully!', 'success');
        loadProfile();
      } else {
        showToast(res?.message || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Error saving profile changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <ToastContainer />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/dashboard/student')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-6 text-white">
            <h1 className="text-2xl font-black">Student Profile</h1>
            <p className="opacity-80 text-sm mt-0.5">Manage your digital profile and personal information</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 flex flex-col md:flex-row gap-8">
            {/* Left Column: Profile Photo */}
            <div className="w-full md:w-64 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-8">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Profile Picture</h3>
              
              <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-50 shadow-inner flex items-center justify-center group mb-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-20 h-20 text-gray-300" />
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer flex flex-col items-center justify-center text-white text-xs font-bold transition duration-300">
                  <Upload className="w-5 h-5 mb-1 animate-bounce" />
                  Upload Photo
                  <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/*" />
                </label>
              </div>
              
              <p className="text-[10px] text-gray-400 text-center leading-normal max-w-[200px]">
                Accepts JPG, PNG, WEBP. Maximum file size 10MB.
              </p>
              
              <div className="mt-8 w-full border-t border-gray-100 pt-6">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-2">Student Meta Details</span>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p><strong>Code ID:</strong> {student?.student_id}</p>
                  <p><strong>Course:</strong> {student?.course || 'N/A'}</p>
                  <p><strong>Batch:</strong> {student?.batch || 'N/A'}</p>
                  <p><strong>Enrolled:</strong> {student?.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Editable Details Form */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Vinayak" 
                      className="input pl-10" 
                      required
                    />
                  </div>
                </div>

                {/* Father's Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Father's Name (Optional)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      value={fathersName} 
                      onChange={e => setFathersName(e.target.value)} 
                      placeholder="Father's name" 
                      className="input pl-10" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Age */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Age</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={e => setAge(e.target.value)} 
                    placeholder="e.g. 24" 
                    className="input" 
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="date" 
                      value={dob} 
                      onChange={e => setDob(e.target.value)} 
                      className="input pl-10" 
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Gender</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)} 
                    className="input select"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="tel" 
                      value={mobile} 
                      disabled
                      placeholder="Mobile number" 
                      className="input pl-10 bg-gray-50 cursor-not-allowed" 
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Contact admin to update registered mobile.</span>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email ID (Optional)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="email@example.com" 
                      className="input pl-10" 
                    />
                  </div>
                </div>
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Aadhaar Card Number</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    value={aadhaarNumber} 
                    onChange={e => setAadhaarNumber(e.target.value)} 
                    placeholder="12-digit Aadhaar Number" 
                    className="input pl-10" 
                    maxLength={16}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Residential Address</label>
                <div className="relative flex">
                  <Home className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <textarea 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="Enter complete residential address details..." 
                    className="input pl-10 py-2 h-24 resize-none" 
                  />
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 px-8 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    'Save Profile Details'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
