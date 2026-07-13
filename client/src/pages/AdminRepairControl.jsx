import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Camera, MapPin, Upload, CheckCircle, AlertCircle, Download, Package, User, Clock, FileText, Printer, Eye, DollarSign, ThumbsUp, ThumbsDown, Truck, CreditCard, Shield, Star } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api, { getApiBase } from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function AdminRepairControl() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTracking, setSearchTracking] = useState('');
  const [repair, setRepair] = useState(null);
  const [searching, setSearching] = useState(false);
  const [pickupDone, setPickupDone] = useState(false);
  const [pickupDetails, setPickupDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('pickup');
  
  // Quotation overview states
  const [quotations, setQuotations] = useState([]);
  const [quotationFilter, setQuotationFilter] = useState('');
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  // Delivery management states
  const [deliveryRepairs, setDeliveryRepairs] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState('pending');
  const [paymentRepairs, setPaymentRepairs] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deliveryRejectReason, setDeliveryRejectReason] = useState('');
  const [processingDelivery, setProcessingDelivery] = useState(null);
  const [finalDeliveryOtp, setFinalDeliveryOtp] = useState('');
  const [finalDeliveryRepair, setFinalDeliveryRepair] = useState(null);
  
  // Verification states
  const [pendingRepairs, setPendingRepairs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(null);
  
  // Form states
  const [deviceCondition, setDeviceCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [gpsCoords, setGpsCoords] = useState({ lat: '', lng: '' });
  const [submissionPhoto, setSubmissionPhoto] = useState(null);
  const [customerSelfie, setCustomerSelfie] = useState(null);
  const [submissionPhotoPreview, setSubmissionPhotoPreview] = useState('');
  const [customerSelfiePreview, setCustomerSelfiePreview] = useState('');
  
  const submissionPhotoRef = useRef(null);
  const customerSelfieRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login/admin');
    }
    // Load pending repairs and technicians
    loadPendingRepairs();
    loadTechnicians();
    loadQuotations();
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (activeTab === 'quotations') loadQuotations();
    if (activeTab === 'delivery') { loadDeliveryRepairs(); loadPaymentRepairs(); }
  }, [activeTab, quotationFilter]);

  // Load pending verification repairs
  const loadPendingRepairs = async () => {
    try {
      const res = await api.get('/admin/repairs/pending-verification');
      if (res.success) setPendingRepairs(res.repairs);
    } catch (err) { console.error(err); }
  };

  // Load technicians
  const loadTechnicians = async () => {
    try {
      const res = await api.get('/admin/technicians/list');
      if (res.success) setTechnicians(res.technicians);
    } catch (err) { console.error(err); }
  };

  // Load quotations
  const loadQuotations = async () => {
    setQuotationsLoading(true);
    try {
      const url = quotationFilter ? `/admin/quotations?status=${quotationFilter}` : '/admin/quotations';
      const res = await api.get(url);
      if (res.success) setQuotations(res.quotations);
    } catch (err) { console.error(err); }
    setQuotationsLoading(false);
  };

  // Load delivery repairs
  const loadDeliveryRepairs = async () => {
    setDeliveryLoading(true);
    try {
      // Fetch both repairs that are completed (awaiting admin verification)
      // and repairs ready/in-pipeline for delivery, then merge them.
      const [completedRes, readyRes] = await Promise.all([
        api.get('/repair/delivery/pending-verification'),
        api.get('/repair/delivery/ready')
      ]);

      const completed = (completedRes && completedRes.success && Array.isArray(completedRes.repairs)) ? completedRes.repairs : [];
      const ready = (readyRes && readyRes.success && Array.isArray(readyRes.repairs)) ? readyRes.repairs : [];

      // Merge and dedupe by id
      const combinedMap = new Map();
      [...completed, ...ready].forEach(r => combinedMap.set(r.id, r));
      setDeliveryRepairs(Array.from(combinedMap.values()));
    } catch (err) { console.error(err); }
    setDeliveryLoading(false);
  };

  // Load payment pending repairs
  const loadPaymentRepairs = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.get('/repair/delivery/pending-payment');
      if (res.success) setPaymentRepairs(res.repairs);
    } catch (err) { console.error(err); }
    setPaymentLoading(false);
  };

  // Admin delivery verify
  const handleDeliveryVerify = async (repairId, approved) => {
    setProcessingDelivery(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/admin-delivery-verify`, { approved, reject_reason: deliveryRejectReason });
      if (res.success) {
        showToast(approved ? 'Repair approved for delivery' : 'Repair rejected', approved ? 'success' : 'info');
        setDeliveryRejectReason('');
        loadDeliveryRepairs();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setProcessingDelivery(null);
  };

  // Admin ready for customer
  const handleReadyForCustomer = async (repairId, deliveryType) => {
    setProcessingDelivery(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/ready-for-customer`, { delivery_type: deliveryType || 'pickup' });
      if (res.success) {
        showToast('Device marked ready for customer', 'success');
        loadDeliveryRepairs();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setProcessingDelivery(null);
  };

  // Verify payment
  const handleVerifyPayment = async (repairId, verified) => {
    setProcessingDelivery(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/verify-payment`, { verified });
      if (res.success) {
        showToast(verified ? 'Payment verified' : 'Payment rejected', verified ? 'success' : 'info');
        loadPaymentRepairs();
        loadDeliveryRepairs();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setProcessingDelivery(null);
  };

  // Final delivery
  const handleFinalDelivery = async (repairId) => {
    setProcessingDelivery(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/final-delivery`, { otp: finalDeliveryOtp, delivered_by_name: user?.name || 'Admin' });
      if (res.success) {
        showToast('Device delivered successfully!', 'success');
        setFinalDeliveryOtp('');
        setFinalDeliveryRepair(null);
        loadDeliveryRepairs();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setProcessingDelivery(null);
  };

  const viewQuotationPDF = (repairId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/repair/${repairId}/quotation/pdf?token=${token}`, '_blank');
  };

  // Verify and transfer to technician
  const handleVerify = async () => {
    if (!selectedRepair || !selectedTechnician) {
      showToast('Please select a technician', 'error');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.put(`/admin/verify/${selectedRepair.tracking_number}`, {
        technician_id: selectedTechnician,
        notes: verifyNotes
      });
      if (res.success) {
        showToast('Device verified and transferred to technician!', 'success');
        setVerifySuccess(res.details);
        setSelectedRepair(null);
        setSelectedTechnician('');
        setVerifyNotes('');
        loadPendingRepairs();
      } else {
        showToast(res.message || 'Verification failed', 'error');
      }
    } catch (err) {
      showToast('Verification failed', 'error');
    }
    setVerifying(false);
  };

  // Search tracking number
  const handleSearch = async () => {
    if (!searchTracking.trim()) {
      showToast('Please enter tracking number', 'error');
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/admin/repairs/search/${searchTracking.trim()}`);
      if (res.success) {
        setRepair(res.repair);
        setDeviceCondition(res.repair.device_condition || '');
        setNotes(res.repair.notes || '');
        showToast('Repair found!', 'success');
      } else {
        showToast(res.message || 'Tracking number not found', 'error');
        setRepair(null);
      }
    } catch (err) {
      showToast('Tracking number not found', 'error');
      setRepair(null);
    }
    setSearching(false);
  };

  // Capture GPS location
  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(7);
          const lng = pos.coords.longitude.toFixed(7);
          setGpsCoords({ lat, lng });
          setGpsLocation(`${lat}, ${lng}`);
          showToast('GPS location captured', 'success');
        },
        (err) => {
          showToast('Unable to capture GPS: ' + err.message, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showToast('Geolocation not supported', 'error');
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'submission') {
        setSubmissionPhoto(file);
        setSubmissionPhotoPreview(ev.target.result);
      } else {
        setCustomerSelfie(file);
        setCustomerSelfiePreview(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit pickup
  const handlePickup = async () => {
    if (!repair) return;
    if (!deviceCondition) {
      showToast('Please select device condition', 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('tracking_number', repair.tracking_number);
    formData.append('device_condition', deviceCondition);
    formData.append('notes', notes);
    formData.append('gps_location', gpsLocation);
    formData.append('gps_lat', gpsCoords.lat);
    formData.append('gps_lng', gpsCoords.lng);
    formData.append('admin_name', user?.name || 'Admin');
    if (submissionPhoto) formData.append('submission_photo', submissionPhoto);
    if (customerSelfie) formData.append('customer_selfie', customerSelfie);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiBase()}/admin/pickup`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        setPickupDone(true);
        setPickupDetails(data.pickupDetails);
        showToast('Successfully Submitted Device!', 'success');
      } else {
        showToast(data.message || 'Pickup failed', 'error');
      }
    } catch (err) {
      showToast('Pickup failed: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Download Excel reports
  const downloadReport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiBase()}/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${type} report downloaded`, 'success');
      } else {
        showToast('Failed to download report', 'error');
      }
    } catch (err) {
      showToast('Download failed', 'error');
    }
  };

  // Reset form
  const resetForm = () => {
    setSearchTracking('');
    setRepair(null);
    setDeviceCondition('');
    setNotes('');
    setGpsLocation('');
    setGpsCoords({ lat: '', lng: '' });
    setSubmissionPhoto(null);
    setCustomerSelfie(null);
    setSubmissionPhotoPreview('');
    setCustomerSelfiePreview('');
    setPickupDone(false);
    setPickupDetails(null);
  };

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Repair Control</h1>
            <p className="text-gray-500 text-sm">Search, inspect, verify and transfer devices</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadReport('activity')} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Activity Excel
            </button>
            <button onClick={() => downloadReport('customers')} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Customer Excel
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('pickup')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'pickup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 inline mr-1" /> Pickup Device
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'verify'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" /> Verify & Transfer
            {pendingRepairs.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingRepairs.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('quotations')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'quotations'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" /> Quotations
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'delivery'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-1" /> Delivery
          </button>
        </div>

        {/* Success Message after Pickup */}
        {pickupDone && pickupDetails && activeTab === 'pickup' && (
          <div className="card bg-green-50 border border-green-200 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-green-800">Successfully Submitted Device</h3>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p><span className="font-medium">Customer Name:</span> {pickupDetails.customerName}</p>
                  <p><span className="font-medium">Tracking Number:</span> {pickupDetails.trackingNumber}</p>
                  <p><span className="font-medium">Admin Name:</span> {pickupDetails.adminName}</p>
                  <p><span className="font-medium">Submission Date & Time:</span> {new Date(pickupDetails.submissionDateTime).toLocaleString()}</p>
                  <p><span className="font-medium">Device Condition:</span> {pickupDetails.deviceCondition}</p>
                </div>
                <button onClick={resetForm} className="mt-4 btn-primary text-sm">New Pickup</button>
              </div>
            </div>
          </div>
        )}

        {/* PICKUP TAB */}
        {activeTab === 'pickup' && (
          <>
            {/* Search Section */}
            {!pickupDone && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" /> Search Customer Tracking Number
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter tracking number (e.g., SRM-2026-XXXX)"
                value={searchTracking}
                onChange={(e) => setSearchTracking(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input flex-1"
              />
              <button onClick={handleSearch} disabled={searching} className="btn-primary flex items-center gap-2">
                {searching ? <Loading /> : <Search className="w-4 h-4" />} Search
              </button>
            </div>
          </div>
        )}

        {/* Repair Details & Pickup Form */}
        {repair && !pickupDone && (
          <div className="space-y-6">
            {/* Repair Info */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Repair Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Tracking Number</p>
                  <p className="font-mono font-semibold">{repair.tracking_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer Name</p>
                  <p className="font-semibold">{repair.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="font-semibold">{repair.customer_mobile}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">City</p>
                  <p className="font-semibold">{repair.customer_city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Device</p>
                  <p className="font-semibold">{repair.brand} {repair.device_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Model</p>
                  <p className="font-semibold">{repair.model || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Issue</p>
                  <p className="text-sm text-gray-700">{repair.issue_description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-semibold capitalize">{repair.status?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>

            {/* Device Condition */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" /> Device Condition
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Dead', 'Physical Damage', 'ON Condition'].map(cond => (
                  <button
                    key={cond}
                    onClick={() => setDeviceCondition(cond)}
                    className={`p-4 rounded-lg border-2 text-center font-medium transition-all ${
                      deviceCondition === cond
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Notes */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> Problem Notes
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add problem notes, observations, accessories received..."
                rows={3}
                className="input"
              />
            </div>

            {/* Photo Upload Section */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-600" /> Photo Capture
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Submission Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-1" /> Mobile Submission Photo
                  </label>
                  <div
                    onClick={() => submissionPhotoRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors min-h-[180px] flex flex-col items-center justify-center"
                  >
                    {submissionPhotoPreview ? (
                      <img src={submissionPhotoPreview} alt="Submission" className="max-h-40 rounded-lg object-contain" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload device photo</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={submissionPhotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoChange(e, 'submission')}
                    className="hidden"
                  />
                </div>

                {/* Customer Selfie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" /> Customer Selfie (Security)
                  </label>
                  <div
                    onClick={() => customerSelfieRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-green-400 transition-colors min-h-[180px] flex flex-col items-center justify-center"
                  >
                    {customerSelfiePreview ? (
                      <img src={customerSelfiePreview} alt="Customer Selfie" className="max-h-40 rounded-lg object-contain" />
                    ) : (
                      <>
                        <User className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to capture customer selfie</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={customerSelfieRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handlePhotoChange(e, 'selfie')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* GPS Location */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" /> GPS Location
              </h2>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={gpsLocation}
                    onChange={(e) => setGpsLocation(e.target.value)}
                    placeholder="GPS coordinates will appear here"
                    className="input"
                    readOnly
                  />
                </div>
                <button onClick={captureGPS} className="btn-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Capture GPS
                </button>
              </div>
              {gpsCoords.lat && (
                <p className="text-xs text-gray-500 mt-2">
                  Lat: {gpsCoords.lat}, Lng: {gpsCoords.lng}
                </p>
              )}
            </div>

            {/* Pickup Button */}
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">Ready to Pickup?</h3>
                  <p className="text-sm text-blue-700">This will notify Master Panel and Customer</p>
                </div>
                <button
                  onClick={handlePickup}
                  disabled={loading || !deviceCondition}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loading /> : <CheckCircle className="w-5 h-5" />}
                  Pickup Device
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* VERIFY TAB */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            {/* Pending Repairs List */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" /> Pending Verification ({pendingRepairs.length})
              </h2>
              {pendingRepairs.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No devices pending verification</p>
              ) : (
                <div className="space-y-3">
                  {pendingRepairs.map(r => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRepair(r)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedRepair?.id === r.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-semibold text-sm">{r.tracking_number}</p>
                          <p className="text-sm text-gray-600">{r.customer_name} • {r.customer_mobile}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {r.brand} {r.device_type} • Condition: {r.device_condition || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Picked up: {r.pickup_date ? new Date(r.pickup_date).toLocaleString() : 'N/A'} by {r.pickup_by || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Pending</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Form */}
            {selectedRepair && (
              <div className="card bg-green-50 border border-green-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" /> Verify & Transfer to Technician
                </h2>
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600">Selected Device:</p>
                    <p className="font-mono font-semibold">{selectedRepair.tracking_number}</p>
                    <p className="text-sm text-gray-600">{selectedRepair.customer_name} • {selectedRepair.brand} {selectedRepair.device_type}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Technician *</label>
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      className="input"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name} - {t.specialization || 'General'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Notes</label>
                    <textarea
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Add verification notes..."
                      rows={3}
                      className="input"
                    />
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying || !selectedTechnician}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying ? <Loading /> : <CheckCircle className="w-5 h-5" />}
                    Verify & Transfer to Technician
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verify Success Popup */}
        {verifySuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
                <p className="text-gray-500 text-sm mt-1">Device verified and transferred to technician</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tracking Number:</span>
                  <span className="font-mono font-semibold text-gray-900">{verifySuccess.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="font-semibold text-gray-900">{verifySuccess.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verified By:</span>
                  <span className="font-semibold text-gray-900">{verifySuccess.adminName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned To:</span>
                  <span className="font-semibold text-gray-900">{verifySuccess.technicianName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-semibold text-gray-900">{new Date(verifySuccess.verifiedAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium">Notifications sent to:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Master Panel - Device verified</li>
                  <li>• Customer - Device being processed</li>
                  <li>• Technician - New repair assigned</li>
                </ul>
              </div>
              <button
                onClick={() => setVerifySuccess(null)}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === 'quotations' && (
          <div className="space-y-6">
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[{v:'',l:'All'},{v:'sent',l:'Pending'},{v:'approved',l:'Approved'},{v:'rejected',l:'Rejected'}].map(f => (
                <button key={f.v} onClick={() => setQuotationFilter(f.v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${quotationFilter === f.v ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
                  {f.l}
                </button>
              ))}
            </div>

            {/* Quotations Table */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> All Quotations
              </h2>
              {quotationsLoading ? (
                <div className="text-center py-8"><Loading /></div>
              ) : quotations.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No quotations found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Job Card</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Customer</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Technician</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Amount</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map(q => (
                        <tr key={q.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <p className="font-mono text-xs">{q.job_card_no || 'N/A'}</p>
                            <p className="text-xs text-gray-400">{q.tracking_number}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium">{q.customer_name}</p>
                            <p className="text-xs text-gray-400">{q.customer_mobile}</p>
                          </td>
                          <td className="py-3 px-3 text-xs">{q.technician_name || 'N/A'}</td>
                          <td className="py-3 px-3 font-semibold text-green-600">₹{parseFloat(q.total_cost || 0).toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              q.status === 'approved' ? 'bg-green-100 text-green-700' :
                              q.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {q.status === 'sent' ? 'Pending' : q.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500">{new Date(q.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <button onClick={() => viewQuotationPDF(q.repair_id)} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                              <Printer className="w-3 h-3" /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DELIVERY TAB */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            {/* Repairs Completed - Pending Verification */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Repairs Completed - Pending Verification
              </h2>
              {deliveryLoading ? <div className="text-center py-4"><Loading /></div> :
                deliveryRepairs.filter(r => r.status === 'repair_completed').length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No repairs pending verification</p>
                ) : (
                  <div className="space-y-3">
                    {deliveryRepairs.filter(r => r.status === 'repair_completed').map(r => (
                      <div key={r.id} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{r.brand} {r.model}</p>
                            <p className="text-sm text-gray-500 font-mono">{r.tracking_number}</p>
                            <p className="text-xs text-gray-500">Customer: {r.customer_name} | Tech: {r.tech_name || 'N/A'}</p>
                            {r.repair_completed_at && <p className="text-xs text-gray-400">Completed: {new Date(r.repair_completed_at).toLocaleString()}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeliveryVerify(r.id, true)} disabled={processingDelivery === r.id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                              {processingDelivery === r.id ? '...' : 'Accept'}
                            </button>
                            <button onClick={() => handleDeliveryVerify(r.id, false)} disabled={processingDelivery === r.id} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                              {processingDelivery === r.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Approved & Handed Over */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" /> Delivery Pipeline
              </h2>
              {deliveryLoading ? <div className="text-center py-4"><Loading /></div> :
                deliveryRepairs.filter(r => ['admin_approved_delivery','handed_to_admin','ready_to_deliver','payment_verified'].includes(r.status)).length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No repairs in delivery pipeline</p>
                ) : (
                  <div className="space-y-3">
                    {deliveryRepairs.filter(r => ['admin_approved_delivery','handed_to_admin','ready_to_deliver','payment_verified'].includes(r.status)).map(r => (
                      <div key={r.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{r.brand} {r.model}</p>
                            <p className="text-sm text-gray-500 font-mono">{r.tracking_number}</p>
                            <p className="text-xs text-gray-500">Customer: {r.customer_name} | Tech: {r.tech_name || 'N/A'}</p>
                            <div className="mt-1"><StatusBadge status={r.status} /></div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {r.status === 'admin_approved_delivery' && (
                              <button onClick={() => handleReadyForCustomer(r.id, 'pickup')} disabled={processingDelivery === r.id} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                                {processingDelivery === r.id ? '...' : 'Mark Ready'}
                              </button>
                            )}
                            {r.status === 'handed_to_admin' && (
                              <button onClick={() => handleReadyForCustomer(r.id, 'pickup')} disabled={processingDelivery === r.id} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                                {processingDelivery === r.id ? '...' : 'Ready for Customer'}
                              </button>
                            )}
                            {r.status === 'payment_verified' && (
                              <button onClick={() => { setFinalDeliveryRepair(r.id); }} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
                                Final Delivery
                              </button>
                            )}
                          </div>
                        </div>
                        {finalDeliveryRepair === r.id && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="font-medium text-sm mb-2">Enter OTP for final delivery:</p>
                            <div className="flex gap-2">
                              <input value={finalDeliveryOtp} onChange={e => setFinalDeliveryOtp(e.target.value)} placeholder="OTP" className="input flex-1" maxLength={6} />
                              <button onClick={() => handleFinalDelivery(r.id)} disabled={processingDelivery === r.id} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                                {processingDelivery === r.id ? '...' : 'Deliver'}
                              </button>
                              <button onClick={() => { setFinalDeliveryRepair(null); setFinalDeliveryOtp(''); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Payment Verification */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" /> Payment Verification
              </h2>
              {paymentLoading ? <div className="text-center py-4"><Loading /></div> :
                paymentRepairs.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No payments pending verification</p>
                ) : (
                  <div className="space-y-3">
                    {paymentRepairs.map(r => (
                      <div key={r.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{r.brand} {r.model}</p>
                            <p className="text-sm text-gray-500 font-mono">{r.tracking_number}</p>
                            <p className="text-xs text-gray-500">Customer: {r.customer_name}</p>
                            <p className="text-sm font-bold text-green-700 mt-1">Amount: ₹{parseFloat(r.total_cost || 0).toFixed(2)}</p>
                            {r.payment_screenshot && (
                              <a href={`/api${r.payment_screenshot}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View Screenshot</a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleVerifyPayment(r.id, true)} disabled={processingDelivery === r.id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                              {processingDelivery === r.id ? '...' : 'Verify'}
                            </button>
                            <button onClick={() => handleVerifyPayment(r.id, false)} disabled={processingDelivery === r.id} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                              {processingDelivery === r.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
