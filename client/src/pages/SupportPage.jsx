import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, MessageSquare, Loader, AlertCircle, ArrowLeft, Check, Clock, Plus, HelpCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function SupportPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);

  // New Ticket Form State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketFile, setTicketFile] = useState(null);
  const [ticketFilePreview, setTicketFilePreview] = useState('');

  // Reply Form State
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [replyFilePreview, setReplyFilePreview] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadTickets();
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadTickets = async () => {
    try {
      const res = await api.get('/student/support/tickets');
      if (res && res.success) {
        setTickets(res.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/student/support/tickets/${ticket.id}`);
      if (res && res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      showToast('Error loading ticket thread', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) {
      return showToast('Subject and Message are required', 'error');
    }
    setCreatingTicket(true);

    try {
      const formData = new FormData();
      formData.append('subject', ticketSubject);
      formData.append('message', ticketMessage);
      if (ticketFile) {
        formData.append('screenshot', ticketFile);
      }

      const res = await api.upload('/student/support/ticket', formData);
      if (res && res.success) {
        showToast('Support ticket raised successfully!', 'success');
        setTicketSubject('');
        setTicketMessage('');
        setTicketFile(null);
        setTicketFilePreview('');
        setShowNewTicketModal(false);
        await loadTickets();
        
        // Auto select new ticket
        if (res.ticketId) {
          const newTicket = { id: res.ticketId, subject: ticketSubject, status: 'open', created_at: new Date().toISOString() };
          handleSelectTicket(newTicket);
        }
      } else {
        showToast(res?.message || 'Failed to open ticket', 'error');
      }
    } catch (err) {
      showToast('Error sending ticket', 'error');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() && !replyFile) return;
    setSendingReply(true);

    try {
      const formData = new FormData();
      formData.append('message', replyMessage);
      if (replyFile) {
        formData.append('screenshot', replyFile);
      }

      const res = await api.upload(`/student/support/tickets/${selectedTicket.id}/reply`, formData);
      if (res && res.success) {
        setReplyMessage('');
        setReplyFile(null);
        setReplyFilePreview('');
        // Reload messages
        const threadRes = await api.get(`/student/support/tickets/${selectedTicket.id}`);
        if (threadRes && threadRes.success) {
          setMessages(threadRes.messages || []);
        }
      } else {
        showToast(res?.message || 'Failed to send reply', 'error');
      }
    } catch (err) {
      showToast('Error sending reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col h-screen">
      <Navbar className="flex-shrink-0" />
      <ToastContainer />
      
      <div className="flex-1 flex overflow-hidden max-w-6xl w-full mx-auto p-4 gap-4">
        {/* Left Side: Tickets List */}
        <div className={`w-full md:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden flex-shrink-0 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> Help & Support
            </h2>
            <button 
              onClick={() => setShowNewTicketModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition"
              title="Raise support ticket"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-300" />
                <p className="text-sm">Need help? Raise a support ticket using the button above.</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition select-none ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">{ticket.subject}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Opened: {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread */}
        <div className={`flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${!selectedTicket ? 'hidden md:flex items-center justify-center p-8' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition md:hidden text-gray-600"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getStatusBadgeClass(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                      <span className="text-[10px] text-gray-400">ID: #{selectedTicket.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  messages.map(msg => {
                    const isStudent = msg.sender_role === 'student';
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-xl p-3.5 shadow-sm border ${
                          isStudent 
                            ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' 
                            : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-line leading-relaxed">{msg.message}</p>
                          {msg.attachment_path && (
                            <div className="mt-3.5 rounded overflow-hidden max-h-48 border border-white/20">
                              <img src={msg.attachment_path} alt="Attachment" className="object-cover w-full h-full cursor-zoom-in" onClick={() => window.open(msg.attachment_path)} />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1">
                          {isStudent ? 'You' : 'Master'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Box input */}
              {selectedTicket.status !== 'resolved' ? (
                <form onSubmit={handleReplySubmit} className="p-3 border-t border-gray-200 bg-white flex flex-col gap-2 flex-shrink-0">
                  {replyFilePreview && (
                    <div className="relative w-20 h-20 border rounded overflow-hidden">
                      <img src={replyFilePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setReplyFile(null); setReplyFilePreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2 items-center">
                    <label className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-emerald-700 cursor-pointer transition">
                      <Image className="w-5 h-5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleFileChange(e, setReplyFile, setReplyFilePreview)}
                        className="hidden" 
                      />
                    </label>
                    <input 
                      type="text" 
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Type your support reply here..."
                      className="input rounded-lg flex-1 border-gray-200"
                    />
                    <button 
                      type="submit"
                      disabled={sendingReply || (!replyMessage.trim() && !replyFile)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition disabled:opacity-50"
                    >
                      {sendingReply ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400 font-bold flex items-center justify-center gap-1">
                  <Check className="w-4 h-4 text-emerald-500" /> Ticket marked as Resolved.
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30 text-gray-400" />
              <h3 className="font-bold text-gray-700 text-base">Select a Ticket</h3>
              <p className="text-xs text-gray-500 mt-1">Select a ticket from the left panel to view correspondence with the Master.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideIn">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
              <h3 className="font-black text-lg">Raise Support Ticket</h3>
              <p className="opacity-80 text-xs mt-0.5">Submit your issue to the Master Admin for resolution.</p>
            </div>
            
            <form onSubmit={handleCreateTicketSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Ticket Subject *</label>
                <input 
                  type="text"
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="e.g. Course Video not loading"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Detailed Message *</label>
                <textarea 
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  className="input h-28 resize-none py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Attach Screenshot/Photo (Optional)</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="border border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-4 w-20 h-20 flex flex-col items-center justify-center cursor-pointer transition text-gray-400 hover:text-emerald-600">
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Add Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => handleFileChange(e, setTicketFile, setTicketFilePreview)}
                      className="hidden" 
                    />
                  </label>
                  {ticketFilePreview && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={ticketFilePreview} alt="Screenshot" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setTicketFile(null); setTicketFilePreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-600 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creatingTicket}
                  className="btn-primary py-2 px-6 flex items-center gap-1.5"
                >
                  {creatingTicket ? <Loader className="w-4 h-4 animate-spin" /> : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
