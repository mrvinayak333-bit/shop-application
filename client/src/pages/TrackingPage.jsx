import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Calendar, User, Phone, Package, AlertCircle, 
  Camera, Navigation, PackageCheck, FileCheck, Box, Truck, 
  CheckCircle2, Check, Clock, Sparkles
} from 'lucide-react';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Timeline from '../components/Timeline';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';

export default function TrackingPage() {
  const { trackingNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackingNumber) return;
    api.get('/repair/track/' + trackingNumber).then(res => {
      if (res.success) setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [trackingNumber]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading text="Tracking order..." /></div>;
  if (!data) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tracking Record Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">No active repair or accessory order matching "{trackingNumber}".</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );

  // =========================================================
  // 📦 LIVE ACCESSORIES ORDER TRACKING VIEW
  // =========================================================
  if (data.isAccessory && data.accessoryOrder) {
    const { accessoryOrder: order, history = [] } = data;
    const items = order.items || [];

    const accessoryPhases = [
      { key: 'placed', step: 1, label: 'Order Placed', icon: PackageCheck, desc: 'Order received & payment confirmed' },
      { key: 'confirmed', step: 2, label: 'Order Confirmed', icon: FileCheck, desc: 'Inventory allocated & verified' },
      { key: 'packed', step: 3, label: 'Packed & Ready', icon: Box, desc: 'Item packed safely in ESD box' },
      { key: 'shipped', step: 4, label: 'Shipped / In Transit', icon: Truck, desc: 'Handed over to courier partner' },
      { key: 'delivered', step: 5, label: 'Delivered', icon: CheckCircle2, desc: 'Package delivered to address' }
    ];

    const phaseOrder = {
      placed: 1,
      confirmed: 2,
      packed: 3,
      shipped: 4,
      in_transit: 4,
      local_hub: 4,
      out_delivery: 4,
      delivered: 5,
      cancelled: 0
    };

    const currentStep = phaseOrder[order.order_status] || 1;
    const progressPct = Math.round((currentStep / 5) * 100);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Link to="/customer/dashboard" className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold hover:underline text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to My Orders
          </Link>

          {/* 📦 ACCESSORY ORDER HEADER CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE ACCESSORY TRACKING
                  </span>
                </div>
                <h1 className="text-2xl font-bold font-mono tracking-wide">{order.tracking_number}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  order.order_status === 'delivered' ? 'bg-emerald-500 text-slate-950' :
                  order.order_status === 'cancelled' ? 'bg-red-500 text-white' :
                  'bg-amber-400 text-slate-950'
                }`}>
                  {order.order_status.replace('_', ' ')}
                </span>
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 font-mono mt-1">
                  ₹{parseFloat(order.total_amount).toFixed(2)}
                </p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden mt-4 p-0.5 border border-slate-700/50">
              <div 
                className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>Order Placed</span>
              <span>{progressPct}% Completed</span>
              <span>Delivered</span>
            </div>
          </div>

          {/* 🛍️ ORDERED ITEMS BREAKDOWN CARD */}
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" /> Accessory Items ({items.length})
            </h2>
            <div className="divide-y">
              {items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden border flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{item.product_name}</h3>
                    <p className="text-xs text-gray-500">{item.brand || 'Accessories'} • Qty: {item.quantity}</p>
                    <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">₹{parseFloat(item.price).toFixed(2)} each</p>
                  </div>
                  <div className="text-right font-mono font-bold text-sm text-gray-900">
                    ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mt-2 grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-400 block">Payment Method</span>
                <span className="font-semibold text-gray-800 capitalize">{order.payment_method || 'Online'}</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold bg-green-100 text-green-800 uppercase">
                  {order.payment_status || 'Paid'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Estimated Delivery</span>
                <span className="font-semibold text-gray-800">
                  {order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString() : '3-5 Business Days'}
                </span>
              </div>
            </div>
          </div>

          {/* 🚚 LIVE SHIPPING STEPPER */}
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" /> Shipment Progress Tracker
            </h2>

            <div className="relative pl-3 sm:pl-6 space-y-3.5 before:absolute before:left-7 sm:before:left-10 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
              {accessoryPhases.map((phase) => {
                const done = phase.step <= currentStep;
                const active = phase.step === currentStep;
                const IconComp = phase.icon;

                return (
                  <div key={phase.key} className={`relative flex items-start gap-4 p-3.5 rounded-xl transition ${
                    active ? 'bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/80 border-2 border-indigo-500 shadow-md ring-4 ring-indigo-500/10' :
                    done ? 'bg-white border border-slate-200 shadow-sm' : 'bg-slate-50 opacity-60 border border-slate-200/50'
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      done ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-100' :
                      active ? 'bg-indigo-600 text-white shadow-md animate-pulse ring-4 ring-indigo-200' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {done ? <Check className="w-5 h-5 stroke-[3]" /> : <IconComp className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold ${active ? 'text-indigo-950 text-base' : done ? 'text-slate-900' : 'text-slate-400'}`}>
                          {phase.label}
                        </h4>
                        {active && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 animate-bounce">
                            CURRENT STATUS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{phase.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 📍 DELIVERY ADDRESS */}
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" /> Delivery Address & Receiver
            </h2>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-1">
              <p className="font-bold text-gray-900 text-sm capitalize">{order.customer_name}</p>
              <p className="text-gray-600 font-mono">📱 Mobile: {order.shipping_mobile || 'N/A'}</p>
              <p className="text-gray-700 whitespace-pre-line mt-1">📍 {order.shipping_address}</p>
            </div>
          </div>

          {/* 📜 LIVE TIMELINE HISTORY LOGS */}
          {history.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Live Tracking Log
              </h2>
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 capitalize block">{h.status.replace('_', ' ')}</span>
                      <p className="text-gray-600 text-[11px] mt-0.5">{h.notes || 'Status updated.'}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================
  // 🔧 LIVE REPAIR REQUEST TRACKING VIEW
  // =========================================================
  const { repair, statusLog } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link to="/customer/dashboard" className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Main Device Info */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{repair.brand} {repair.model}</h1>
              <p className="text-sm text-gray-500 font-mono">{repair.tracking_number}</p>
            </div>
            <StatusBadge status={repair.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Device:</span> <span className="font-medium">{repair.device_type}</span></div>
            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{repair.customer}</span></div>
            <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{repair.customer_mobile || 'N/A'}</span></div>
            <div><span className="text-gray-500">Registered:</span> <span className="font-medium">{new Date(repair.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Live Tracking Data */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" /> Live Tracking Data
          </h2>
          <div className="space-y-4">
            {/* Device Condition */}
            {repair.device_condition && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">Device Condition</p>
                  <p className="font-semibold text-amber-900">{repair.device_condition}</p>
                </div>
              </div>
            )}

            {/* GPS Location */}
            {repair.gps_location && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium">GPS Location</p>
                  <p className="font-semibold text-blue-900">{repair.gps_location}</p>
                  {repair.gps_lat && repair.gps_lng && (
                    <a 
                      href={`https://www.google.com/maps?q=${repair.gps_lat},${repair.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Details */}
            {repair.pickup_by && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Package className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Pickup Details</p>
                  <p className="font-semibold text-green-900">Picked up by: {repair.pickup_by}</p>
                  {repair.pickup_date && (
                    <p className="text-sm text-green-700">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(repair.pickup_date).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Problem Notes */}
            {repair.notes && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Problem Notes</p>
                  <p className="text-sm text-gray-900">{repair.notes}</p>
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="grid grid-cols-2 gap-4">
              {repair.submission_photo && (
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-2 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Device Photo
                  </p>
                  <img 
                    src={repair.submission_photo} 
                    alt="Device" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              {repair.customer_selfie && (
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> Customer Selfie
                  </p>
                  <img 
                    src={repair.customer_selfie} 
                    alt="Customer" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repair Timeline */}
        <div className="card p-6">
          <Timeline currentStatus={repair.status} statusLog={statusLog} />
        </div>
      </main>
    </div>
  );
}
