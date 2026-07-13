import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import PhotoUpload from '../components/PhotoUpload';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function PickupVerification() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({});
  const [gps, setGps] = useState({ lat: '', lng: '' });
  const [condition, setCondition] = useState('');
  const [otp, setOtp] = useState('');
  const [problemNotes, setProblemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    api.get('/technician/repair/' + id).then(res => {
      if (res.success) setRepair(res.repair);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isAuthenticated, navigate]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
        () => showToast('Location access denied', 'error')
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    if (photos.device_photo) formData.append('device_photo', photos.device_photo);
    if (photos.customer_selfie) formData.append('customer_selfie', photos.customer_selfie);
    formData.append('gps_lat', gps.lat);
    formData.append('gps_lng', gps.lng);
    formData.append('device_condition', condition);
    formData.append('problem_notes', problemNotes);
    formData.append('otp_code', otp);

    const res = await api.upload('/repair/' + id + '/pickup', formData);
    setSubmitting(false);
    if (res.success) { showToast('Pickup verified!'); navigate('/technician/repair/' + id); }
    else showToast(res.message || 'Error', 'error');
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="card mb-4">
          <h1 className="text-xl font-bold mb-1">Pickup Verification</h1>
          {repair && <p className="text-sm text-gray-500">{repair.brand} {repair.model} - {repair.tracking_number}</p>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Photos</h2>
            <div className="flex gap-4">
              <PhotoUpload label="Device Photo" name="device_photo" photos={photos} setPhotos={setPhotos} />
              <PhotoUpload label="Customer Selfie" name="customer_selfie" photos={photos} setPhotos={setPhotos} />
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Location</h2>
            <div className="flex gap-2">
              <input value={gps.lat} readOnly placeholder="Latitude" className="input flex-1" />
              <input value={gps.lng} readOnly placeholder="Longitude" className="input flex-1" />
              <button type="button" onClick={getLocation} className="btn-secondary flex items-center gap-1"><MapPin className="w-4 h-4" /> GPS</button>
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">Device Condition</h2>
            <textarea value={condition} onChange={e => setCondition(e.target.value)} placeholder="Describe device condition..." className="input mb-2" rows={3} />
            <textarea value={problemNotes} onChange={e => setProblemNotes(e.target.value)} placeholder="Problem notes..." className="input" rows={2} />
          </div>
          <div className="card mb-4">
            <h2 className="font-semibold mb-3">OTP Verification</h2>
            <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" className="input" maxLength={6} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Verify Pickup'}</button>
        </form>
      </main>
    </div>
  );
}
