import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Smartphone, Clock, CheckCircle, Wrench, FileText, Bell, ThumbsUp, ThumbsDown, DollarSign, AlertCircle, Eye, X, Printer, Truck, CreditCard, Star, Package } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';

export default function CustomerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [expandedQuotation, setExpandedQuotation] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRepairId, setSelectedRepairId] = useState(null);

  // Delivery workflow states
  const [confirmingRepair, setConfirmingRepair] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') {
      navigate('/login/customer');
      return;
    }
    loadDashboard();
  }, [isAuthenticated, user, navigate]);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/customer/dashboard');
      if (res.success) setData(res);
      else showToast('Failed to load dashboard', 'error');
      setLoading(false);
    } catch {
      showToast('Failed to load dashboard', 'error');
      setLoading(false);
    }
  };

  const handleQuotationApproval = async (repairId, approved) => {
    setApproving(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/quotation/approve`, { approved, reject_reason: rejectReason });
      if (res.success) {
        showToast(approved ? 'Quotation approved! Repair will continue.' : 'Quotation rejected.', approved ? 'success' : 'info');
        setShowApproveConfirm(false);
        setShowRejectForm(false);
        setRejectReason('');
        setExpandedQuotation(null);
        loadDashboard();
      } else {
        showToast(res.message || 'Error updating quotation', 'error');
      }
    } catch {
      showToast('Error updating quotation', 'error');
    }
    setApproving(null);
  };

  const openApproveConfirm = (repairId) => {
    setSelectedRepairId(repairId);
    setShowApproveConfirm(true);
    setShowRejectForm(false);
  };

  const openRejectForm = (repairId) => {
    setSelectedRepairId(repairId);
    setShowRejectForm(true);
    setShowApproveConfirm(false);
    setRejectReason('');
  };

  const viewQuotationPDF = (repairId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/repair/${repairId}/quotation/pdf?token=${token}`, '_blank');
  };

  const confirmReceiveDevice = async (repairId) => {
    setConfirmingRepair(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/customer-receive`);
      if (res.success) {
        showToast('Device received! Please check if it is working properly.', 'success');
        loadDashboard();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setConfirmingRepair(null);
  };

  const confirmDeviceWorking = async (repairId) => {
    setConfirmingRepair(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/customer-confirm`, { confirmed: true });
      if (res.success) {
        showToast('Thank you for confirming! Please proceed with payment.', 'success');
        loadDashboard();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setConfirmingRepair(null);
  };

  const reportIssue = async (repairId) => {
    setConfirmingRepair(repairId);
    try {
      const res = await api.put(`/repair/${repairId}/customer-confirm`, { confirmed: false, issue_description: issueDescription });
      if (res.success) {
        showToast('Issue reported. Our team will look into it.', 'info');
        setShowIssueForm(false);
        setIssueDescription('');
        loadDashboard();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setConfirmingRepair(null);
  };

  const submitPayment = async (repairId) => {
    if (!paymentMethod) return showToast('Please select a payment method', 'error');
    setProcessingPayment(repairId);
    try {
      const formData = new FormData();
      formData.append('payment_method', paymentMethod);
      const repair = activeRepairs.find(r => r.id === repairId);
      formData.append('amount', repair?.total_cost || 0);
      if (paymentScreenshot) formData.append('screenshot', paymentScreenshot);
      const res = await api.post(`/repair/${repairId}/payment`, formData);
      if (res.success) {
        showToast('Payment submitted successfully!', 'success');
        setPaymentMethod('');
        setPaymentScreenshot(null);
        loadDashboard();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error submitting payment', 'error'); }
    setProcessingPayment(null);
  };

  const submitFeedback = async (repairId) => {
    setSubmittingFeedback(repairId);
    try {
      const res = await api.post(`/repair/${repairId}/feedback`, { rating: feedbackRating, comments: feedbackComments });
      if (res.success) {
        showToast('Thank you for your feedback!', 'success');
        setFeedbackComments('');
        loadDashboard();
      } else {
        showToast(res.message || 'Error', 'error');
      }
    } catch { showToast('Error', 'error'); }
    setSubmittingFeedback(null);
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  const customer = data?.customer || {};
  const activeRepairs = data?.activeRepairs || [];
  const repairHistory = data?.repairHistory || [];
  const notifications = data?.notifications || [];

  // Find repairs with pending quotations
  const pendingQuotations = activeRepairs.filter(r => r.quotation_status === 'sent');
  // Find repairs with approved/rejected quotations
  const processedQuotations = activeRepairs.filter(r => r.quotation_status === 'approved' || r.quotation_status === 'rejected');
  // Delivery workflow repairs
  const deviceReadyRepairs = activeRepairs.filter(r => r.status === 'ready_to_deliver');
  const deviceReceivedRepairs = activeRepairs.filter(r => r.status === 'customer_received');
  const paymentPendingRepairs = activeRepairs.filter(r => r.status === 'customer_confirmed');
  const feedbackPendingRepairs = activeRepairs.filter(r => ['successfully_delivered','delivered'].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {customer.name}</h1>
            <p className="text-gray-500 text-sm">{customer.mobile}</p>
          </div>
          <Link to="/repair/register" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Repair
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <Smartphone className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{customer.total_repairs || 0}</p>
            <p className="text-xs text-gray-500">Total Repairs</p>
          </div>
          <div className="card">
            <Clock className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{activeRepairs.length}</p>
            <p className="text-xs text-gray-500">Active Repairs</p>
          </div>
          <div className="card">
            <Wrench className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{repairHistory.length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="card">
            <CheckCircle className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{customer.city || 'N/A'}</p>
            <p className="text-xs text-gray-500">City</p>
          </div>
        </div>

        {/* Pending Quotations - NEEDS APPROVAL */}
        {pendingQuotations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" /> Quotation Pending Your Approval
            </h2>
            <div className="space-y-4">
              {pendingQuotations.map(repair => (
                <div key={repair.id} className="card border-2 border-orange-200 bg-orange-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">{repair.brand} {repair.model}</p>
                      <p className="text-sm text-gray-500 font-mono">{repair.tracking_number}</p>
                      <StatusBadge status={repair.status} />
                    </div>
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  
                  {/* Open Quotation Button */}
                  <button onClick={() => setExpandedQuotation(expandedQuotation === repair.id ? null : repair.id)} className="w-full mb-4 py-3 bg-white hover:bg-gray-50 border border-orange-300 rounded-lg font-semibold text-orange-700 flex items-center justify-center gap-2 transition-colors">
                    <Eye className="w-5 h-5" /> {expandedQuotation === repair.id ? 'Hide' : 'Open'} Quotation Details
                  </button>

                  {/* Expanded Quotation Details */}
                  {expandedQuotation === repair.id && (
                    <div className="bg-white rounded-lg p-4 mb-4 space-y-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-600" /> Quotation Invoice
                        </h3>
                        <button onClick={() => viewQuotationPDF(repair.id)} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                          <Printer className="w-3 h-3" /> View PDF
                        </button>
                      </div>
                      {repair.quotation_notes && (
                        <div className="p-2 bg-gray-50 rounded text-sm"><span className="text-gray-500">Notes:</span> {repair.quotation_notes}</div>
                      )}
                      {repair.diagnosis && (
                        <div className="p-2 bg-blue-50 rounded text-sm"><span className="text-gray-500">Diagnosis:</span> <span className="font-medium text-gray-800">{repair.diagnosis}</span></div>
                      )}
                      {repair.spare_parts && (
                        <div className="p-2 bg-yellow-50 rounded text-sm"><span className="text-gray-500">Spare Parts:</span> <span className="font-medium text-gray-800">{repair.spare_parts}</span></div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div><span className="text-gray-500">Parts Cost:</span> <span className="font-medium">₹{repair.parts_cost || 0}</span></div>
                        <div><span className="text-gray-500">Labor Cost:</span> <span className="font-medium">₹{repair.labor_cost || 0}</span></div>
                        {parseFloat(repair.other_charges || 0) > 0 && <div><span className="text-gray-500">Other Charges:</span> <span className="font-medium">₹{repair.other_charges}</span></div>}
                        {parseFloat(repair.discount || 0) > 0 && <div><span className="text-green-600">Discount:</span> <span className="font-medium text-green-600">-₹{repair.discount}</span></div>}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold text-gray-700">Total Estimated Cost:</span>
                        <span className="text-2xl font-bold text-green-600">₹{repair.total_cost || 0}</span>
                      </div>
                      {repair.estimated_days && <p className="text-xs text-gray-500">Estimated repair time: {repair.estimated_days} days</p>}
                      {repair.job_card_no && <p className="text-xs text-gray-400 font-mono">Job Card: {repair.job_card_no}</p>}

                      {/* Approve / Reject Buttons */}
                      <div className="pt-3 border-t space-y-3">
                        {!showApproveConfirm && !showRejectForm && (
                          <div className="flex gap-3">
                            <button onClick={() => openApproveConfirm(repair.id)} disabled={approving === repair.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                              <ThumbsUp className="w-5 h-5" /> {approving === repair.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button onClick={() => openRejectForm(repair.id)} disabled={approving === repair.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                              <ThumbsDown className="w-5 h-5" /> {approving === repair.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        )}

                        {/* Approve Confirmation Popup */}
                        {showApproveConfirm && selectedRepairId === repair.id && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="font-semibold text-green-800 mb-3">Do you approve this quotation?</p>
                            <div className="flex gap-3">
                              <button onClick={() => handleQuotationApproval(repair.id, true)} disabled={approving === repair.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
                                {approving === repair.id ? 'Processing...' : 'YES, Approve'}
                              </button>
                              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">
                                NO, Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reject Form */}
                        {showRejectForm && selectedRepairId === repair.id && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="font-semibold text-red-800 mb-2">Reason for Rejection</p>
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Please tell us why you are rejecting this quotation..." className="w-full p-3 border border-red-200 rounded-lg text-sm resize-none h-20 mb-3" rows={3} />
                            <div className="flex gap-3">
                              <button onClick={() => handleQuotationApproval(repair.id, false)} disabled={approving === repair.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
                                {approving === repair.id ? 'Processing...' : 'Submit Rejection'}
                              </button>
                              <button onClick={() => setShowRejectForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Collapsed quick buttons (when not expanded) */}
                  {expandedQuotation !== repair.id && (
                    <div className="flex gap-3">
                      <button onClick={() => openApproveConfirm(repair.id)} disabled={approving === repair.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        <ThumbsUp className="w-5 h-5" /> {approving === repair.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button onClick={() => openRejectForm(repair.id)} disabled={approving === repair.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        <ThumbsDown className="w-5 h-5" /> {approving === repair.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {/* Inline Reject Form when not expanded */}
                  {!expandedQuotation && showRejectForm && selectedRepairId === repair.id && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                      <p className="font-semibold text-red-800 mb-2">Reason for Rejection</p>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Please tell us why..." className="w-full p-3 border border-red-200 rounded-lg text-sm resize-none h-20 mb-3" rows={3} />
                      <div className="flex gap-3">
                        <button onClick={() => handleQuotationApproval(repair.id, false)} disabled={approving === repair.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50">Submit Rejection</button>
                        <button onClick={() => setShowRejectForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Inline Approve Confirm when not expanded */}
                  {!expandedQuotation && showApproveConfirm && selectedRepairId === repair.id && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                      <p className="font-semibold text-green-800 mb-3">Do you approve this quotation?</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleQuotationApproval(repair.id, true)} disabled={approving === repair.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50">YES, Approve</button>
                        <button onClick={() => setShowApproveConfirm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">NO, Cancel</button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center mt-2">
                    Approve to continue repair • Reject to close request
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Device Ready for Pickup */}
        {deviceReadyRepairs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-teal-600">
              <Truck className="w-5 h-5" /> Your Device is Ready!
            </h2>
            {deviceReadyRepairs.map(repair => (
              <div key={repair.id} className="card border-2 border-teal-200 bg-teal-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">{repair.brand} {repair.model}</p>
                    <p className="text-sm text-gray-500 font-mono">{repair.tracking_number}</p>
                    <StatusBadge status={repair.status} />
                  </div>
                  <Package className="w-8 h-8 text-teal-600" />
                </div>
                <div className="p-3 bg-white rounded-lg mb-3">
                  <p className="text-sm text-gray-700">Your device repair has been completed successfully and is ready for collection.</p>
                  {repair.quotation_notes && <p className="text-xs text-gray-500 mt-1">Notes: {repair.quotation_notes}</p>}
                  <p className="text-sm font-bold text-teal-700 mt-2">Amount: ₹{repair.total_cost || 0}</p>
                </div>
                <button onClick={() => confirmReceiveDevice(repair.id)} disabled={confirmingRepair === repair.id} className="btn-primary w-full disabled:opacity-50">
                  {confirmingRepair === repair.id ? 'Processing...' : 'I Have Received My Device'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Device Received - Confirm Working */}
        {deviceReceivedRepairs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-600">
              <CheckCircle className="w-5 h-5" /> Confirm Device Status
            </h2>
            {deviceReceivedRepairs.map(repair => (
              <div key={repair.id} className="card border-2 border-purple-200 bg-purple-50">
                <p className="font-semibold text-lg mb-2">{repair.brand} {repair.model}</p>
                <p className="text-sm text-gray-500 font-mono mb-3">{repair.tracking_number}</p>
                <p className="text-sm text-gray-700 mb-3">Please check your device and confirm it is working properly.</p>
                {!showIssueForm && (
                  <div className="flex gap-3">
                    <button onClick={() => confirmDeviceWorking(repair.id)} disabled={confirmingRepair === repair.id} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      <CheckCircle className="w-5 h-5" /> {confirmingRepair === repair.id ? 'Processing...' : 'Device Working Perfectly'}
                    </button>
                    <button onClick={() => setShowIssueForm(true)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Report Issue
                    </button>
                  </div>
                )}
                {showIssueForm && (
                  <div className="space-y-3 mt-3">
                    <textarea value={issueDescription} onChange={e => setIssueDescription(e.target.value)} placeholder="Describe the issue..." className="w-full p-3 border rounded-lg text-sm resize-none h-20" rows={3} />
                    <div className="flex gap-3">
                      <button onClick={() => reportIssue(repair.id)} disabled={confirmingRepair === repair.id} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
                        {confirmingRepair === repair.id ? 'Submitting...' : 'Submit Issue'}
                      </button>
                      <button onClick={() => setShowIssueForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payment Section */}
        {paymentPendingRepairs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-600">
              <CreditCard className="w-5 h-5" /> Make Payment
            </h2>
            {paymentPendingRepairs.map(repair => (
              <div key={repair.id} className="card border-2 border-green-200 bg-green-50">
                <p className="font-semibold text-lg mb-1">{repair.brand} {repair.model}</p>
                <p className="text-sm text-gray-500 font-mono mb-3">{repair.tracking_number}</p>
                <div className="p-3 bg-white rounded-lg mb-3 space-y-2">
                  <div className="flex justify-between text-sm"><span>Parts Cost:</span><span>₹{repair.parts_cost || 0}</span></div>
                  <div className="flex justify-between text-sm"><span>Labor Cost:</span><span>₹{repair.labor_cost || 0}</span></div>
                  {parseFloat(repair.other_charges || 0) > 0 && <div className="flex justify-between text-sm"><span>Other:</span><span>₹{repair.other_charges}</span></div>}
                  {parseFloat(repair.discount || 0) > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount:</span><span>-₹{repair.discount}</span></div>}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total:</span><span className="text-green-700">₹{repair.total_cost || 0}</span></div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['Cash','UPI','PhonePe','Google Pay','Paytm','Debit Card','Credit Card','Net Banking'].map(m => (
                        <button key={m} onClick={() => setPaymentMethod(m)} className={`p-2 rounded-lg border text-sm font-medium transition ${paymentMethod === m ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot (optional)</label>
                    <input type="file" accept="image/*" onChange={e => setPaymentScreenshot(e.target.files[0])} className="input" />
                  </div>
                  <button onClick={() => submitPayment(repair.id)} disabled={processingPayment === repair.id || !paymentMethod} className="btn-primary w-full disabled:opacity-50">
                    {processingPayment === repair.id ? 'Processing...' : 'Proceed to Pay ₹' + (repair.total_cost || 0)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feedback Section */}
        {feedbackPendingRepairs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-600">
              <Star className="w-5 h-5" /> Rate Your Experience
            </h2>
            {feedbackPendingRepairs.map(repair => (
              <div key={repair.id} className="card border-2 border-yellow-200 bg-yellow-50">
                <p className="font-semibold text-lg mb-1">{repair.brand} {repair.model}</p>
                <p className="text-sm text-gray-500 font-mono mb-3">{repair.tracking_number}</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setFeedbackRating(s)} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition ${feedbackRating >= s ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comments (optional)</label>
                    <textarea value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)} placeholder="Share your experience..." className="input h-20 resize-none" rows={3} />
                  </div>
                  <button onClick={() => submitFeedback(repair.id)} disabled={submittingFeedback === repair.id} className="btn-primary w-full disabled:opacity-50">
                    {submittingFeedback === repair.id ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Repairs */}
        {activeRepairs.length > 0 && pendingQuotations.length === 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Active Repairs</h2>
            <div className="space-y-3">
              {activeRepairs.map(repair => (
                <Link key={repair.tracking_number} to={`/track/${repair.tracking_number}`} className="card hover:shadow-lg transition block">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{repair.brand} {repair.model}</p>
                      <p className="text-sm text-gray-500">{repair.tracking_number}</p>
                      <p className="text-xs text-gray-400 mt-1">{repair.device_type} • {new Date(repair.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={repair.status} />
                  </div>
                  {repair.tech && <p className="text-sm text-gray-600 mt-2">Technician: {repair.tech}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Recent Notifications
            </h2>
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <div key={n.id} className={`p-3 rounded-lg border-l-4 ${
                  n.type === 'quotation' ? 'bg-orange-50 border-orange-500' :
                  n.type === 'status_update' ? 'bg-blue-50 border-blue-500' :
                  'bg-gray-50 border-gray-400'
                }`}>
                  <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                  <p className="text-gray-600 text-xs mt-1">{n.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repair History */}
        {repairHistory.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Repair History</h2>
            <div className="space-y-3">
              {repairHistory.map(repair => (
                <div key={repair.tracking_number} className="card opacity-75">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{repair.brand} {repair.model}</p>
                      <p className="text-sm text-gray-500">{repair.tracking_number}</p>
                      <p className="text-xs text-gray-400 mt-1">{repair.device_type} • {new Date(repair.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={repair.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeRepairs.length === 0 && repairHistory.length === 0 && (
          <div className="card text-center py-12">
            <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No repairs yet</p>
            <Link to="/repair/register" className="btn-primary">Register Your First Repair</Link>
          </div>
        )}
      </main>
    </div>
  );
}
