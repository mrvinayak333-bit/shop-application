import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ArrowLeft, ShieldCheck, MapPin, Phone, CreditCard, ShoppingBag, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function AccessoriesCart() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingMobile, setShippingMobile] = useState('');
  
  // Checkout flow states
  const [paymentMode, setPaymentMode] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null); // stores { orderId, trackingNumber }

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') {
      showToast('Please login to view cart', 'info');
      navigate('/login/customer');
      return;
    }
    fetchCart();
  }, [isAuthenticated, user]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accessories/cart');
      if (res.success) {
        setCart(res.cart);
        // Autofill mobile if customer has one
        if (res.cart.length > 0 && user?.mobile) {
          setShippingMobile(user.mobile);
        }
      } else {
        showToast('Error loading cart', 'error');
      }
    } catch (err) {
      showToast('Error loading cart', 'error');
    }
    setLoading(false);
  };

  const handleQtyChange = async (itemId, currentQty, stock, increment) => {
    const newQty = increment ? currentQty + 1 : currentQty - 1;
    if (newQty < 1) return;
    if (newQty > stock) {
      return showToast(`Only ${stock} items available in stock.`, 'error');
    }

    try {
      const res = await api.put(`/accessories/cart/${itemId}`, { quantity: newQty });
      if (res.success) {
        // Update local state directly
        setCart(cart.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
      } else {
        showToast(res.message || 'Error updating quantity', 'error');
      }
    } catch (err) {
      showToast('Error updating quantity', 'error');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const res = await api.delete(`/accessories/cart/${itemId}`);
      if (res.success) {
        showToast('Item removed', 'success');
        setCart(cart.filter(item => item.id !== itemId));
      } else {
        showToast(res.message || 'Error removing item', 'error');
      }
    } catch (err) {
      showToast('Error removing item', 'error');
    }
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.discount_price !== null ? item.discount_price : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const startPayment = (e) => {
    e.preventDefault();
    if (!shippingAddress.trim() || !shippingMobile.trim()) {
      return showToast('Shipping details are required', 'error');
    }
    setPaymentMode(true);
  };

  const executeCheckout = async () => {
    setPaying(true);
    // Simulate gateway delay
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await api.post('/accessories/checkout', {
        shipping_address: shippingAddress,
        shipping_mobile: shippingMobile,
        payment_method: 'Online Payment'
      });

      if (res.success) {
        setOrderSuccess({
          orderId: res.orderId,
          trackingNumber: res.trackingNumber
        });
        setCart([]);
      } else {
        showToast(res.message || 'Checkout failed', 'error');
        setPaymentMode(false);
      }
    } catch (err) {
      showToast('Checkout failed due to server error', 'error');
      setPaymentMode(false);
    }
    setPaying(false);
  };

  if (loading) return <div className="min-h-screen"><Navbar /><Loading /></div>;

  // Order Success Screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 flex-1 flex flex-col justify-center items-center text-center">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Successful!</h1>
          <p className="text-gray-500 mb-6">Thank you for your purchase. Your payment was verified and the order is created.</p>

          <div className="bg-white rounded-2xl border p-6 w-full space-y-4 shadow-sm mb-8 text-left">
            <div className="flex justify-between border-b pb-2 text-sm">
              <span className="text-gray-400">Order ID:</span>
              <span className="font-semibold text-gray-800">#{orderSuccess.orderId}</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm">
              <span className="text-gray-400">Tracking Code:</span>
              <span className="font-mono font-bold text-emerald-700">{orderSuccess.trackingNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className="font-semibold text-amber-600 uppercase text-xs tracking-wider">Order Placed</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link to={`/track/${orderSuccess.trackingNumber}`} className="btn-primary py-3 block">
              Track Order Live
            </Link>
            <Link to="/dashboard/customer" className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <ToastContainer />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cart Item Listing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/courses" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Your Shopping Cart</h1>
          </div>

          {cart.length === 0 ? (
            <div className="card py-16 text-center space-y-4">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto" />
              <p className="text-gray-500 font-medium">Your cart is currently empty</p>
              <Link to="/courses" className="btn-primary inline-block">Browse Accessories</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => {
                const activePrice = item.discount_price !== null ? item.discount_price : item.price;
                return (
                  <div key={item.id} className="card flex flex-col sm:flex-row items-center gap-4 relative">
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">📱</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-8 text-center sm:text-left">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{item.category}</span>
                      <h3 className="font-bold text-gray-800 text-sm mt-1 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{item.brand}</p>
                      
                      {/* Price */}
                      <p className="font-extrabold text-emerald-700 text-sm mt-1">
                        ₹{activePrice} {item.discount_price && <span className="text-xs text-gray-400 font-normal line-through">₹{item.price}</span>}
                      </p>
                    </div>

                    {/* Quantity selectors */}
                    <div className="flex items-center border rounded-xl overflow-hidden shrink-0 bg-white">
                      <button 
                        onClick={() => handleQtyChange(item.id, item.quantity, item.stock, false)}
                        className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 font-bold"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-sm font-semibold text-gray-800 border-x bg-gray-50">{item.quantity}</span>
                      <button 
                        onClick={() => handleQtyChange(item.id, item.quantity, item.stock, true)}
                        className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 font-bold"
                      >
                        +
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shipping details and summary */}
        {cart.length > 0 && (
          <div className="lg:col-span-1 space-y-6">
            
            {/* Payment Mode Overlay Modal */}
            {paymentMode && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-5 border text-center animate-in zoom-in-95 duration-200">
                  <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Online Payment Gateway</h3>
                    <p className="text-xs text-gray-400 mt-1">Simulating a secure UPI / Debit Card transaction</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-xl space-y-1 text-sm text-left">
                    <div className="flex justify-between"><span className="text-gray-500">Total Payable:</span><span className="font-bold text-emerald-700">₹{cartTotal}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Method:</span><span className="font-medium">Direct Gateway</span></div>
                  </div>

                  <button 
                    onClick={executeCheckout}
                    disabled={paying}
                    className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paying ? 'Processing Gateway...' : `Pay & Confirm ₹${cartTotal}`}
                  </button>
                  <button 
                    onClick={() => setPaymentMode(false)}
                    disabled={paying}
                    className="text-sm text-gray-400 hover:text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="card space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2">Order Summary</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping Fee</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-gray-500 border-b pb-2">
                  <span>Taxes</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2">
                  <span>Total amount</span>
                  <span className="text-emerald-700">₹{cartTotal}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info Form */}
            <form onSubmit={startPayment} className="card space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Shipping Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Shipping Mobile</label>
                  <div className="relative">
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. +91 95522 10333" 
                      value={shippingMobile}
                      onChange={e => setShippingMobile(e.target.value)}
                      className="input pl-9 text-sm"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Shipping Address</label>
                  <textarea 
                    required
                    placeholder="Enter street, locality, city, state and pincode..." 
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    className="input text-sm h-24 resize-none"
                    rows={3}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" /> Proceed to Online Payment
                </button>
              </div>

              <div className="pt-2 border-t flex items-center justify-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure SSL Encryption Enabled
              </div>
            </form>

          </div>
        )}
      </main>
    </div>
  );
}
