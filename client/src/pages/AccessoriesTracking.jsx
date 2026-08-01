import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ChevronLeft, MapPin, Truck, Calendar, Package, CreditCard, Clock, ClipboardList } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';

const statusMilestones = [
  { status: 'placed', label: 'Order Placed', icon: ClipboardList, desc: 'Your order has been registered in the system.' },
  { status: 'confirmed', label: 'Payment Confirmed', icon: CreditCard, desc: 'We have verified your online payment transaction.' },
  { status: 'packed', label: 'Packed & Sealed', icon: Package, desc: 'Your accessories are securely packed and ready for dispatch.' },
  { status: 'shipped', label: 'Shipped', icon: Truck, desc: 'Item handed over to our shipping carrier partner.' },
  { status: 'in_transit', label: 'In Transit', icon: Truck, desc: 'Package is traveling between transit sorting centers.' },
  { status: 'local_hub', label: 'Reached Local Hub', icon: MapPin, desc: 'Shipment has arrived at your local delivery station.' },
  { status: 'out_delivery', label: 'Out for Delivery', icon: Truck, desc: 'Delivery executive is bringing the package to your door.' },
  { status: 'delivered', label: 'Delivered', icon: CheckCircleIcon, desc: 'Order was successfully received.' },
  { status: 'cancelled', label: 'Cancelled', icon: Clock, desc: 'This order has been cancelled.' }
];

function CheckCircleIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function AccessoriesTracking() {
  const { trackingNumber } = useParams();
  const [lookupCode, setLookupCode] = useState(trackingNumber || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (trackingNumber) {
      handleLookup(trackingNumber);
    }
  }, [trackingNumber]);

  const handleLookup = async (code) => {
    const queryCode = code || lookupCode;
    if (!queryCode.trim()) return showToast('Please enter a tracking number or Order ID', 'error');
    
    setLoading(true);
    try {
      const res = await api.get(`/accessories/track/${queryCode}`);
      if (res.success) {
        setOrder(res.order);
        setItems(res.items);
        setHistory(res.history);
      } else {
        showToast(res.message || 'Tracking code not found', 'error');
        setOrder(null);
      }
    } catch (err) {
      showToast('Error tracking order', 'error');
      setOrder(null);
    }
    setLoading(false);
  };

  const getMilestoneStatus = (statusName) => {
    // If order is cancelled and this is cancelled status
    if (order?.order_status === 'cancelled' && statusName === 'cancelled') return 'active';
    if (statusName === 'cancelled') return 'hidden';

    // Find index of current status in milestones
    const milestonesList = statusMilestones.filter(m => m.status !== 'cancelled');
    const orderStatusIdx = milestonesList.findIndex(m => m.status === order?.order_status);
    const targetStatusIdx = milestonesList.findIndex(m => m.status === statusName);

    if (orderStatusIdx === -1 || targetStatusIdx === -1) return 'pending';
    if (orderStatusIdx >= targetStatusIdx) return 'completed';
    return 'pending';
  };

  const getHistoryTime = (statusName) => {
    const event = history.find(h => h.status === statusName);
    if (!event) return null;
    return new Date(event.created_at).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <ToastContainer />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        
        {/* Back navigation and search lookup */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link to="/dashboard/customer" className="text-gray-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-semibold transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <input 
              type="text" 
              placeholder="Enter Tracking # or Order ID" 
              value={lookupCode}
              onChange={e => setLookupCode(e.target.value)}
              className="input py-2 text-sm w-full sm:w-60"
            />
            <button 
              onClick={() => handleLookup(null)}
              className="btn-primary py-2 px-4 flex items-center gap-1.5 shrink-0 text-sm"
            >
              <Search className="w-4 h-4" /> Track
            </button>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : !order ? (
          <div className="card py-16 text-center space-y-3">
            <Truck className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-semibold text-lg">Live Shipment Tracking</p>
            <p className="text-gray-400 text-sm">Enter your tracking code above (e.g. SRM-TRK-000001) to trace shipping logs.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header info card */}
            <div className="card border-l-4 border-emerald-600 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Tracking Code</p>
                <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{order.tracking_number}</p>
                <p className="text-[10px] text-gray-400">Order ID: #{order.id}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Est. Delivery Date</p>
                <p className="text-base font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  {order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString() : 'Pending'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Amount & Method</p>
                <p className="text-base font-bold text-gray-800 mt-0.5">₹{order.total_amount}</p>
                <p className="text-[10px] text-gray-400 font-medium">{order.payment_method} • Verified</p>
              </div>
            </div>

            {/* Delivery address details */}
            <div className="card space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 border-b pb-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" /> Shipping & Delivery details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Recipient Name:</span> <span className="font-semibold text-gray-700">{order.customer_name}</span></div>
                <div><span className="text-gray-400">Shipping Mobile:</span> <span className="font-semibold text-gray-700">{order.shipping_mobile}</span></div>
                <div className="md:col-span-2"><span className="text-gray-400">Address:</span> <span className="font-medium text-gray-700">{order.shipping_address}</span></div>
              </div>
            </div>

            {/* Items Purchased List */}
            <div className="card space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 border-b pb-1.5">
                <Package className="w-4 h-4 text-emerald-600" /> Items in this package
              </h3>
              <div className="divide-y">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="w-12 h-12 bg-gray-50 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">📱</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-xs truncate">{item.product_name}</p>
                      <p className="text-[10px] text-gray-400">{item.brand}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-800 text-xs">Qty: {item.quantity}</p>
                      <p className="text-[10px] text-emerald-700 font-bold">₹{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Progress */}
            <div className="card">
              <h3 className="font-bold text-gray-800 text-sm border-b pb-2 mb-6">Live Delivery Roadmap</h3>
              
              <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {statusMilestones
                  .filter(m => getMilestoneStatus(m.status) !== 'hidden')
                  .map(m => {
                    const statusClass = getMilestoneStatus(m.status); // completed, active, pending
                    const timeStr = getHistoryTime(m.status);

                    let iconColor = 'bg-gray-100 text-gray-400';
                    let titleColor = 'text-gray-400';
                    let dotBorder = 'border-gray-200';

                    if (statusClass === 'completed') {
                      iconColor = 'bg-emerald-100 text-emerald-600';
                      titleColor = 'text-gray-900 font-bold';
                      dotBorder = 'border-emerald-600';
                    } else if (statusClass === 'active') {
                      iconColor = order.order_status === 'cancelled' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600 animate-pulse';
                      titleColor = order.order_status === 'cancelled' ? 'text-red-700 font-bold' : 'text-blue-700 font-bold';
                      dotBorder = order.order_status === 'cancelled' ? 'border-red-500' : 'border-blue-500';
                    }

                    return (
                      <div key={m.status} className="relative flex gap-4 items-start">
                        {/* Bullet Icon */}
                        <div className={`absolute -left-6 w-6 h-6 rounded-full border-2 ${dotBorder} ${iconColor} flex items-center justify-center z-10 shrink-0`}>
                          <m.icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Event text details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <p className={`text-sm ${titleColor}`}>{m.label}</p>
                            {timeStr && <span className="text-[10px] text-gray-400 font-medium shrink-0">{timeStr}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
