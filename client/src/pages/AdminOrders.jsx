import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Truck, Package, Clock, ShieldAlert, CheckCircle, Search, Edit } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const validStatuses = [
  { status: 'placed', label: 'Order Placed', color: 'bg-blue-100 text-blue-800' },
  { status: 'confirmed', label: 'Payment Confirmed', color: 'bg-emerald-100 text-emerald-800' },
  { status: 'packed', label: 'Packed & Sealed', color: 'bg-orange-100 text-orange-800' },
  { status: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { status: 'in_transit', label: 'In Transit', color: 'bg-indigo-100 text-indigo-800' },
  { status: 'local_hub', label: 'Reached Local Hub', color: 'bg-teal-100 text-teal-800' },
  { status: 'out_delivery', label: 'Out for Delivery', color: 'bg-yellow-100 text-yellow-800' },
  { status: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Status edit overlay modal states
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('placed');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'master', 'staff'].includes(user?.role)) {
      showToast('Unauthorized access', 'error');
      navigate('/');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accessories/admin/orders');
      if (res.success) setOrders(res.orders);
      else showToast('Error loading orders', 'error');
    } catch {
      showToast('Error loading orders', 'error');
    }
    setLoading(false);
  };

  const openStatusModal = (order) => {
    setEditingOrder(order.id);
    setSelectedStatus(order.order_status);
    setStatusNotes('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/accessories/admin/orders/${editingOrder}/status`, {
        order_status: selectedStatus,
        notes: statusNotes
      });

      if (res.success) {
        showToast('Order status updated successfully!', 'success');
        setEditingOrder(null);
        fetchOrders();
      } else {
        showToast(res.message || 'Error updating status', 'error');
      }
    } catch {
      showToast('Error updating status', 'error');
    }
    setUpdating(false);
  };

  // Filter orders by tracking, ID, or customer name
  const filteredOrders = orders.filter(o => 
    o.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(o.id).includes(searchQuery) ||
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_mobile.includes(searchQuery)
  );

  const getStatusBadgeClass = (status) => {
    const found = validStatuses.find(s => s.status === status);
    return found ? found.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const found = validStatuses.find(s => s.status === status);
    return found ? found.label : status;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <ToastContainer />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link to="/dashboard/admin" className="text-gray-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-semibold transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Dispatcher Order Manager</h1>
          </div>
          
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search by ID, Tracking # or Name" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9 py-2 text-xs w-full"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Status edit overlay modal */}
        {editingOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleUpdateStatus} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 border shadow-xl">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" /> Dispatch Delivery Status
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status Phase</label>
                  <select 
                    value={selectedStatus} 
                    onChange={e => setSelectedStatus(e.target.value)} 
                    className="select text-sm"
                  >
                    {validStatuses.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status Remarks (optional)</label>
                  <textarea 
                    placeholder="Enter short update logs..." 
                    value={statusNotes} 
                    onChange={e => setStatusNotes(e.target.value)} 
                    className="input text-sm h-20 resize-none" 
                    rows={3} 
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-3">
                <button type="submit" disabled={updating} className="flex-1 btn-primary py-2.5 disabled:opacity-50 text-sm">
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
                <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2.5 font-bold text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Orders list */}
        {loading ? (
          <Loading />
        ) : filteredOrders.length === 0 ? (
          <div className="card py-16 text-center space-y-4">
            <Package className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">No accessories orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="card border-l-4 border-emerald-600 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition">
                
                {/* Left Side: Order info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-800">Order #{order.id}</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{order.tracking_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeClass(order.order_status)}`}>
                      {getStatusLabel(order.order_status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 border-t border-b py-2">
                    <div><span className="text-gray-400">Customer:</span> <span className="font-bold">{order.customer_name}</span></div>
                    <div><span className="text-gray-400">Mobile:</span> <span className="font-semibold">{order.customer_mobile}</span></div>
                    <div><span className="text-gray-400">Total:</span> <span className="font-extrabold text-emerald-700">₹{order.total_amount}</span></div>
                    <div className="sm:col-span-3 mt-1"><span className="text-gray-400">Shipping Address:</span> <span className="font-medium text-gray-700">{order.shipping_address}</span></div>
                  </div>

                  {/* Items purchased */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items in Package</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map(item => (
                        <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border">
                          {item.product_name} <span className="text-gray-400 font-normal">x{item.quantity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Action */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:self-center">
                  <button 
                    onClick={() => openStatusModal(order)}
                    className="btn-primary py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold"
                  >
                    <Truck className="w-4 h-4" /> Dispatch Status
                  </button>
                  <Link 
                    to={`/track/${order.tracking_number}`}
                    className="border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl py-2 px-3 text-xs font-bold text-center transition"
                  >
                    Track Progress
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
