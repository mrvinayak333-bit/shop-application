import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, FileText, DollarSign, Package, AlertCircle, CheckCircle, Clock, Phone, MapPin, Calendar, User, ClipboardList, Send, Hammer, Printer, Eye, Truck, CreditCard, Star, Shield, Handshake } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

const statusPathways = [
  { value: 'received_center', label: 'Device Received', icon: '📦' },
  { value: 'under_diagnosis', label: 'Inspection Started', icon: '🔍' },
  { value: 'inspection_done', label: 'Inspection Completed', icon: '✅' },
  { value: 'quotation_sent', label: 'Quotation Sent', icon: '📄' },
  { value: 'customer_approved', label: 'Customer Approved', icon: '👍' },
  { value: 'waiting_parts', label: 'Waiting for Spare Parts', icon: '⏳' },
  { value: 'repair_started', label: 'Repair Started', icon: '🔧' },
  { value: 'ic_repair', label: 'IC Level Repair', icon: '🔌' },
  { value: 'software_install', label: 'Software Installation', icon: '💿' },
  { value: 'testing', label: 'Testing', icon: '🧪' },
  { value: 'quality_test', label: 'Quality Testing', icon: '✓' },
  { value: 'ready_delivery', label: 'Ready for Delivery', icon: '📋' },
  { value: 'repair_completed', label: 'Repair Completed', icon: '🎯' },
  { value: 'admin_approved_delivery', label: 'Admin Approved', icon: '🛡️' },
  { value: 'handed_to_admin', label: 'Handed to Admin', icon: '🤝' },
  { value: 'ready_to_deliver', label: 'Ready to Deliver', icon: '📦' },
  { value: 'customer_received', label: 'Customer Received', icon: '📲' },
  { value: 'customer_confirmed', label: 'Confirmed Working', icon: '✅' },
  { value: 'payment_done', label: 'Payment Done', icon: '💳' },
  { value: 'payment_verified', label: 'Payment Verified', icon: '🔐' },
  { value: 'successfully_delivered', label: 'Successfully Delivered', icon: '🎉' },
  { value: 'feedback_given', label: 'Feedback Given', icon: '⭐' },
  { value: 'delivered', label: 'Delivered', icon: '🎉' },
];

export default function RepairDetail() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Diagnosis & Repair states
  const [diagnosis, setDiagnosis] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('3');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  
  // Status update states
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  
  // Quotation states
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationPartsCost, setQuotationPartsCost] = useState('');
  const [quotationLaborCost, setQuotationLaborCost] = useState('');
  const [quotationSpareParts, setQuotationSpareParts] = useState('');
  const [quotationDiagnosis, setQuotationDiagnosis] = useState('');
  const [quotationDays, setQuotationDays] = useState('3');
  const [quotationOtherCharges, setQuotationOtherCharges] = useState('');
  const [quotationDiscount, setQuotationDiscount] = useState('');
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationCustomerName, setQuotationCustomerName] = useState('');
  const [quotationDeviceName, setQuotationDeviceName] = useState('');
  const [quotationImei, setQuotationImei] = useState('');
  const [generating, setGenerating] = useState(false);

  // Delivery workflow states
  const [repairCompleteNotes, setRepairCompleteNotes] = useState('');
  const [completingRepair, setCompletingRepair] = useState(false);
  const [handoverCondition, setHandoverCondition] = useState('');
  const [handoverAccessories, setHandoverAccessories] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handingOver, setHandingOver] = useState(false);
  const [handoverPhoto, setHandoverPhoto] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login/technician'); return; }
    loadRepair();
  }, [id, isAuthenticated, navigate]);

  const loadRepair = async () => {
    try {
      const res = await api.get('/technician/repair/' + id);
      if (res.success) {
        setData(res);
        setNewStatus(res.repair.status);
        if (res.quotation) {
          const q = res.quotation;
          setQuotationDiagnosis(q.diagnosis || '');
          setQuotationPartsCost(q.parts_cost || '');
          setQuotationLaborCost(q.labor_cost || '');
          setQuotationSpareParts(q.spare_parts || '');
          setQuotationDays(q.estimated_days || '3');
          setQuotationOtherCharges(q.other_charges || '');
          setQuotationDiscount(q.discount || '');
          setQuotationNotes(q.notes || '');
          setQuotationCustomerName(q.customer_name || '');
          setQuotationDeviceName(q.device_name || '');
          setQuotationImei(q.imei || '');
        }
      } else {
        showToast(res.message || 'Failed to load repair details', 'error');
      }
    } catch (err) {
      console.error('Load repair error:', err);
      showToast('Failed to load repair details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus) return showToast('Please select a status', 'error');
    const res = await api.put('/technician/repair/' + id + '/status', { status: newStatus, notes: statusNotes });
    if (res.success) {
      showToast('Status updated successfully');
      setStatusNotes('');
      loadRepair();
    } else {
      showToast(res.message || 'Error updating status', 'error');
    }
  };

  const generateQuotation = async () => {
    if (!quotationPartsCost && !quotationLaborCost) {
      return showToast('Please fill at least parts cost or labor cost', 'error');
    }
    setGenerating(true);
    try {
      const res = await api.post('/technician/repair/' + id + '/quotation', {
        parts_cost: quotationPartsCost || 0,
        labor_cost: quotationLaborCost || 0,
        spare_parts: quotationSpareParts,
        diagnosis: quotationDiagnosis,
        estimated_days: quotationDays,
        other_charges: quotationOtherCharges || 0,
        discount: quotationDiscount || 0,
        notes: quotationNotes,
        customer_name: quotationCustomerName || data?.repair?.customer,
        device_name: quotationDeviceName || `${data?.repair?.brand} ${data?.repair?.model}`,
        imei: quotationImei || data?.repair?.imei || ''
      });
      if (res.success) {
        showToast('Quotation generated and sent to customer!', 'success');
        setShowQuotationForm(false);
        loadRepair();
      } else {
        showToast(res.message || 'Error generating quotation', 'error');
      }
    } catch (err) {
      showToast('Error generating quotation. Please try again.', 'error');
    }
    setGenerating(false);
  };

  const viewQuotationPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/repair/${id}/quotation/pdf?token=${token}`, '_blank');
  };

  const markRepairComplete = async () => {
    setCompletingRepair(true);
    try {
      const res = await api.put('/repair/' + id + '/repair-complete', { notes: repairCompleteNotes });
      if (res.success) {
        showToast('Repair marked as completed! Waiting for admin verification.', 'success');
        setRepairCompleteNotes('');
        loadRepair();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error completing repair', 'error'); }
    setCompletingRepair(false);
  };

  const handoverToAdmin = async () => {
    setHandingOver(true);
    try {
      const formData = new FormData();
      formData.append('device_condition', handoverCondition);
      formData.append('accessories', handoverAccessories);
      formData.append('notes', handoverNotes);
      if (handoverPhoto) formData.append('photo', handoverPhoto);
      const res = await api.put('/repair/' + id + '/handover-to-admin', formData);
      if (res.success) {
        showToast('Device handed over to admin successfully!', 'success');
        setHandoverCondition(''); setHandoverAccessories(''); setHandoverNotes(''); setHandoverPhoto(null);
        loadRepair();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error handing over device', 'error'); }
    setHandingOver(false);
  };

  const saveDiagnosis = async () => {
    if (!diagnosis) {
      showToast('Please enter diagnosis details', 'error');
      return;
    }
    
    setSavingDiagnosis(true);
    try {
      const res = await api.put('/technician/repair/' + id + '/status', {
        status: 'under_diagnosis',
        notes: `Diagnosis: ${diagnosis}\nSpare Parts: ${spareParts || 'N/A'}\nRepair Notes: ${repairNotes || 'N/A'}`
      });
      
      if (res.success) {
        showToast('Diagnosis saved successfully! Moving to quotation...', 'success');
        
        // Pre-fill quotation form with diagnosis data
        setQuotationDiagnosis(diagnosis);
        setQuotationSpareParts(spareParts);
        
        // Reload repair data
        await loadRepair();
        
        // Auto-navigate to quotation tab after 1.5 seconds
        setTimeout(() => {
          setActiveTab('quotation');
          showToast('Please fill in the cost details for quotation', 'info');
        }, 1500);
      } else {
        showToast(res.message || 'Error saving diagnosis', 'error');
      }
    } catch (err) {
      console.error('Save diagnosis error:', err);
      showToast('Error saving diagnosis. Please try again.', 'error');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;
  if (!data) return <div className="min-h-screen"><Navbar /><p className="text-center py-20">Repair not found</p></div>;

  const { repair, statusLog, quotation } = data;
  const partsC = parseFloat(quotationPartsCost || 0);
  const laborC = parseFloat(quotationLaborCost || 0);
  const otherC = parseFloat(quotationOtherCharges || 0);
  const discC = parseFloat(quotationDiscount || 0);
  const totalCost = partsC + laborC + otherC - discC;
  const quotationApproved = quotation?.status === 'approved';
  const quotationRejected = quotation?.status === 'rejected';
  const quotationPending = quotation && (quotation.status === 'sent' || quotation.status === 'pending');

  const tabs = [
    { id: 'details', label: 'Device Details', icon: Phone },
    { id: 'diagnosis', label: 'Diagnosis', icon: Hammer },
    { id: 'quotation', label: 'Quotation', icon: FileText },
    { id: 'status', label: 'Update Status', icon: ClipboardList },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <Link to="/technician" className="inline-flex items-center gap-1 text-blue-600 hover:underline mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{repair.brand} {repair.model}</h1>
              <p className="text-gray-500 font-mono text-sm">{repair.tracking_number}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={repair.status} />
                {quotation && (
                  <span className={`text-xs px-2 py-1 rounded-full ${quotation.status === 'approved' ? 'bg-green-100 text-green-700' : quotation.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    Quotation: {quotation.status}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold">{repair.customer}</p>
              <p className="text-sm text-gray-600">{repair.mobile}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Device Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" /> Device Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Device Type</p>
                  <p className="font-semibold">{repair.device_type}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Brand</p>
                  <p className="font-semibold">{repair.brand}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Model</p>
                  <p className="font-semibold">{repair.model || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">IMEI</p>
                  <p className="font-semibold font-mono">{repair.imei || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" /> Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-semibold">{repair.customer}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="font-semibold">{repair.mobile}</p>
                </div>
                {repair.address && (
                  <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-semibold">{repair.address}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" /> Problem Description
              </h2>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-gray-800">{repair.issue_description}</p>
              </div>
              {repair.device_condition && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Device Condition at Pickup</p>
                  <p className="font-semibold">{repair.device_condition}</p>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" /> Repair Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Registered Date</p>
                  <p className="font-semibold">{new Date(repair.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-semibold">{new Date(repair.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hammer className="w-5 h-5 text-blue-600" /> Diagnose Mobile Problem
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis / Problem Found</label>
                  <textarea
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    placeholder="Describe the problem found after diagnosis..."
                    className="input h-32 resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spare Parts Required</label>
                  <textarea
                    value={spareParts}
                    onChange={e => setSpareParts(e.target.value)}
                    placeholder="List spare parts needed (if any)..."
                    className="input h-24 resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repair Notes</label>
                  <textarea
                    value={repairNotes}
                    onChange={e => setRepairNotes(e.target.value)}
                    placeholder="Additional notes for the repair..."
                    className="input h-24 resize-none"
                    rows={3}
                  />
                </div>
                <button 
                  onClick={saveDiagnosis} 
                  disabled={savingDiagnosis}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingDiagnosis ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Save & Continue to Quotation
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  After saving, you'll be automatically redirected to create a quotation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quotation Tab */}
        {activeTab === 'quotation' && (
          <div className="space-y-4">
            {quotation && quotation.status !== 'pending' ? (
              <>
                {/* Quotation Status Banner */}
                <div className={`card border-2 ${quotationApproved ? 'border-green-300 bg-green-50' : quotationRejected ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${quotationApproved ? 'bg-green-200' : quotationRejected ? 'bg-red-200' : 'bg-yellow-200'}`}>
                        {quotationApproved ? <CheckCircle className="w-7 h-7 text-green-700" /> : quotationRejected ? <AlertCircle className="w-7 h-7 text-red-700" /> : <Clock className="w-7 h-7 text-yellow-700" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Quotation {quotation.status === 'sent' ? 'Waiting for Approval' : quotation.status === 'approved' ? 'Approved' : quotation.status === 'rejected' ? 'Rejected' : quotation.status}</h3>
                        {quotation.approved_at && <p className="text-xs text-gray-500">{new Date(quotation.approved_at).toLocaleString()}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={viewQuotationPDF} className="btn-secondary flex items-center gap-1 text-sm">
                        <Eye className="w-4 h-4" /> View PDF
                      </button>
                      <button onClick={viewQuotationPDF} className="btn-secondary flex items-center gap-1 text-sm">
                        <Printer className="w-4 h-4" /> Print
                      </button>
                    </div>
                  </div>
                  {quotationRejected && quotation.reject_reason && (
                    <div className="p-3 bg-red-100 rounded-lg mt-2">
                      <p className="text-sm font-medium text-red-800">Reject Reason: {quotation.reject_reason}</p>
                    </div>
                  )}
                </div>

                {/* Quotation Invoice Details */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" /> Quotation Invoice
                    {quotation.job_card_no && <span className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">{quotation.job_card_no}</span>}
                  </h2>
                  {/* Customer & Device Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Customer Name</p>
                      <p className="font-semibold">{quotation.customer_name || repair.customer}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Device Name</p>
                      <p className="font-semibold">{quotation.device_name || `${repair.brand} ${repair.model}`}</p>
                    </div>
                    {quotation.imei && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">IMEI</p>
                        <p className="font-semibold font-mono">{quotation.imei}</p>
                      </div>
                    )}
                  </div>
                  {/* Diagnosis & Spare Parts */}
                  {quotation.diagnosis && (
                    <div className="p-3 bg-blue-50 rounded-lg mb-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium mb-1">Diagnosis</p>
                      <p className="text-gray-800">{quotation.diagnosis}</p>
                    </div>
                  )}
                  {quotation.spare_parts && (
                    <div className="p-3 bg-yellow-50 rounded-lg mb-3 border border-yellow-100">
                      <p className="text-xs text-yellow-600 font-medium mb-1">Spare Parts</p>
                      <p className="text-gray-800">{quotation.spare_parts}</p>
                    </div>
                  )}
                  {/* Cost Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Parts Cost:</span>
                      <span className="font-medium">₹{parseFloat(quotation.parts_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Labor Cost:</span>
                      <span className="font-medium">₹{parseFloat(quotation.labor_cost || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(quotation.other_charges || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Other Charges:</span>
                        <span className="font-medium">₹{parseFloat(quotation.other_charges).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(quotation.discount || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600">Discount:</span>
                        <span className="font-medium text-green-600">-₹{parseFloat(quotation.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-gray-700 font-semibold">Total Amount:</span>
                      <span className="font-bold text-blue-600 text-xl">₹{parseFloat(quotation.total_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Estimated Days:</span>
                      <span className="font-medium">{quotation.estimated_days} days</span>
                    </div>
                  </div>
                  {quotation.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{quotation.notes}</p>
                    </div>
                  )}
                </div>
                {quotation.status === 'rejected' && (
                  <button onClick={() => setShowQuotationForm(true)} className="btn-primary w-full">
                    Create New Quotation
                  </button>
                )}
              </>
            ) : (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Generate Quotation Invoice
                </h2>
                <div className="space-y-4">
                  {/* Customer & Device Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                      <input value={quotationCustomerName} onChange={e => setQuotationCustomerName(e.target.value)} placeholder="Customer name" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Device Name</label>
                      <input value={quotationDeviceName} onChange={e => setQuotationDeviceName(e.target.value)} placeholder="e.g., Samsung Galaxy S21" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IMEI</label>
                      <input value={quotationImei} onChange={e => setQuotationImei(e.target.value)} placeholder="IMEI number" className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis / Problem Found</label>
                    <textarea value={quotationDiagnosis} onChange={e => setQuotationDiagnosis(e.target.value)} placeholder="Describe the problem found..." className="input h-24 resize-none" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Spare Parts Required</label>
                    <input value={quotationSpareParts} onChange={e => setQuotationSpareParts(e.target.value)} placeholder="e.g., Display, Battery, Charging Port" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Parts Cost (₹)</label>
                      <input type="number" value={quotationPartsCost} onChange={e => setQuotationPartsCost(e.target.value)} placeholder="0" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Labor Cost (₹)</label>
                      <input type="number" value={quotationLaborCost} onChange={e => setQuotationLaborCost(e.target.value)} placeholder="0" className="input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Charges (₹)</label>
                      <input type="number" value={quotationOtherCharges} onChange={e => setQuotationOtherCharges(e.target.value)} placeholder="0" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Discount (₹)</label>
                      <input type="number" value={quotationDiscount} onChange={e => setQuotationDiscount(e.target.value)} placeholder="0" className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Repair Days</label>
                    <input type="number" value={quotationDays} onChange={e => setQuotationDays(e.target.value)} placeholder="3" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea value={quotationNotes} onChange={e => setQuotationNotes(e.target.value)} placeholder="Additional notes for the quotation..." className="input h-20 resize-none" rows={2} />
                  </div>
                  {/* Total Calculation */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2 border">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Parts Cost:</span><span>₹{partsC.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Labor Cost:</span><span>₹{laborC.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Other Charges:</span><span>₹{otherC.toFixed(2)}</span></div>
                    {discC > 0 && <div className="flex justify-between text-sm"><span className="text-green-600">Discount:</span><span className="text-green-600">-₹{discC.toFixed(2)}</span></div>}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-700 font-semibold">Total Estimated Cost:</span>
                      <span className="text-2xl font-bold text-blue-600">₹{totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={generateQuotation} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate & Send to Customer'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">Customer will receive notification to approve or reject the quotation</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Update Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Quotation Warning */}
            {!quotationApproved && (
              <div className="card bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Quotation Not Approved Yet</h3>
                    <p className="text-sm text-yellow-700">{quotationPending ? 'Customer has not approved the quotation yet. Please wait for customer approval.' : quotationRejected ? 'Quotation was rejected by customer. Create a new quotation first.' : 'No quotation has been sent. Please create a quotation first.'}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" /> Update Repair Status
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <StatusBadge status={repair.status} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select New Status</label>
                  <div className="grid grid-cols-1 gap-2">
                    {statusPathways.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setNewStatus(s.value)}
                        disabled={!quotationApproved && ['repair_started','ic_repair','software_install','testing','quality_test','ready_delivery','delivered'].includes(s.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          newStatus === s.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${!quotationApproved && ['repair_started','ic_repair','software_install','testing','quality_test','ready_delivery','delivered'].includes(s.value) ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className="mr-2">{s.icon}</span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status Notes (Optional)</label>
                  <textarea
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    placeholder="Add notes for this status change..."
                    className="input h-20 resize-none"
                    rows={2}
                  />
                </div>
                <button onClick={updateStatus} disabled={!quotationApproved && ['repair_started','ic_repair','software_install','testing','quality_test','ready_delivery','delivered'].includes(newStatus)} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="space-y-4">
            {/* Delivery Progress */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Delivery Workflow
              </h2>
              <div className="space-y-3">
                {[
                  { status: 'repair_completed', label: 'Repair Completed', desc: 'Technician marks repair as done' },
                  { status: 'admin_approved_delivery', label: 'Admin Verified', desc: 'Admin verifies the completed repair' },
                  { status: 'handed_to_admin', label: 'Handed to Admin', desc: 'Technician hands device to admin' },
                  { status: 'ready_to_deliver', label: 'Ready for Customer', desc: 'Admin marks device ready for pickup' },
                  { status: 'customer_received', label: 'Customer Received', desc: 'Customer confirms receiving device' },
                  { status: 'customer_confirmed', label: 'Device Working', desc: 'Customer confirms device working' },
                  { status: 'payment_done', label: 'Payment Done', desc: 'Customer makes payment' },
                  { status: 'payment_verified', label: 'Payment Verified', desc: 'Admin verifies payment' },
                  { status: 'successfully_delivered', label: 'Delivered', desc: 'Final delivery complete' },
                ].map((step, i) => {
                  const done = statusPathways.findIndex(s => s.value === repair.status) >= statusPathways.findIndex(s => s.value === step.status);
                  const current = repair.status === step.status;
                  return (
                    <div key={step.status} className={`flex items-center gap-3 p-3 rounded-lg border ${current ? 'border-blue-400 bg-blue-50' : done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? 'bg-green-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {done && !current ? '✓' : i + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${done ? 'text-green-700' : current ? 'text-blue-700' : 'text-gray-500'}`}>{step.label}</p>
                        <p className="text-xs text-gray-500">{step.desc}</p>
                      </div>
                      {current && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Current</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Mark Repair Completed */}
            {!['repair_completed','admin_approved_delivery','admin_rejected_delivery','handed_to_admin','ready_to_deliver','customer_received','customer_confirmed','payment_done','payment_verified','successfully_delivered','feedback_given','delivered'].includes(repair.status) && quotationApproved && (
              <div className="card border-2 border-blue-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                  Mark Repair as Completed
                </h3>
                <textarea value={repairCompleteNotes} onChange={e => setRepairCompleteNotes(e.target.value)} placeholder="Completion notes (optional)..." className="input h-20 resize-none mb-3" rows={2} />
                <button onClick={markRepairComplete} disabled={completingRepair} className="btn-primary w-full disabled:opacity-50">
                  {completingRepair ? 'Processing...' : 'Mark Repair Completed'}
                </button>
              </div>
            )}

            {/* Step 2: Admin Verification Status */}
            {['repair_completed'].includes(repair.status) && (
              <div className="card border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Awaiting Admin Verification</h3>
                    <p className="text-sm text-yellow-700">Admin will verify the completed repair. Please wait.</p>
                  </div>
                </div>
              </div>
            )}
            {repair.status === 'admin_rejected_delivery' && (
              <div className="card border-2 border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Admin Rejected Repair</h3>
                    <p className="text-sm text-red-700">Admin found issues. Please fix and update status again.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Hand Over to Admin */}
            {['admin_approved_delivery'].includes(repair.status) && (
              <div className="card border-2 border-indigo-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-indigo-600" />
                  Hand Over Device to Admin
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Condition After Repair</label>
                    <textarea value={handoverCondition} onChange={e => setHandoverCondition(e.target.value)} placeholder="Describe device condition..." className="input h-20 resize-none" rows={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accessories Checklist</label>
                    <textarea value={handoverAccessories} onChange={e => setHandoverAccessories(e.target.value)} placeholder="e.g., Charger, Case, SIM tray..." className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                    <input type="file" accept="image/*" onChange={e => setHandoverPhoto(e.target.files[0])} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Additional notes..." className="input h-16 resize-none" rows={2} />
                  </div>
                  <button onClick={handoverToAdmin} disabled={handingOver} className="btn-primary w-full disabled:opacity-50">
                    {handingOver ? 'Processing...' : 'Hand Over to Admin'}
                  </button>
                </div>
              </div>
            )}

            {/* Later steps info */}
            {['handed_to_admin','ready_to_deliver','customer_received','customer_confirmed','payment_done','payment_verified','successfully_delivered','feedback_given'].includes(repair.status) && (
              <div className="card bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Delivery In Progress</h3>
                    <p className="text-sm text-green-700">Device has been handed over. Current status: <StatusBadge status={repair.status} /></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="space-y-4">
            {quotation ? (
              <>
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" /> Payment Summary
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Parts Cost:</span>
                      <span className="font-medium">₹{parseFloat(quotation.parts_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Labor Cost:</span>
                      <span className="font-medium">₹{parseFloat(quotation.labor_cost || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(quotation.other_charges || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Other Charges:</span>
                        <span className="font-medium">₹{parseFloat(quotation.other_charges).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(quotation.discount || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600">Discount:</span>
                        <span className="font-medium text-green-600">-₹{parseFloat(quotation.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-gray-700 font-semibold">Total Amount:</span>
                      <span className="font-bold text-blue-600 text-xl">₹{parseFloat(quotation.total_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="card">
                  <h3 className="font-semibold mb-3">Payment Status</h3>
                  {['payment_done','payment_verified','successfully_delivered','feedback_given','delivered'].includes(repair.status) ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          {repair.status === 'payment_done' ? 'Payment received, awaiting verification' :
                           repair.status === 'payment_verified' ? 'Payment verified by admin' :
                           'Payment complete - Device delivered'}
                        </p>
                        {repair.payment_verified_at && <p className="text-xs text-gray-500">Verified: {new Date(repair.payment_verified_at).toLocaleString()}</p>}
                      </div>
                    </div>
                  ) : ['customer_confirmed'].includes(repair.status) ? (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <p className="font-medium text-yellow-800">Awaiting customer payment</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Clock className="w-6 h-6 text-gray-400" />
                      <p className="font-medium text-gray-600">Payment not yet available</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No quotation created yet. Payment will be available after quotation approval.</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Repair Timeline
              </h2>
              <div className="space-y-4">
                {statusLog && statusLog.length > 0 ? (
                  statusLog.map((log, i) => (
                    <div key={log.id || i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          i === statusLog.length - 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {statusPathways.find(p => p.value === log.status)?.icon || '•'}
                        </div>
                        {i < statusLog.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold text-gray-900">
                          {statusPathways.find(p => p.value === log.status)?.label || log.status}
                        </p>
                        {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                          {log.updated_by_role && ` • by ${log.updated_by_role}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-8">No timeline entries yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
