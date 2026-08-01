import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Smartphone, Shield, Clock, Wrench, Phone, MessageCircle, MapPin, Mail, ChevronRight, Star, CheckCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [trackingId, setTrackingId] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const res = await api.get('/accessories/products');
        if (res.success) {
          setProducts((res.products || []).slice(0, 8)); // Top 8 products
        }
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return showToast('Enter tracking number', 'error');
    navigate('/track/' + trackingId.trim());
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    if (!mobile || !password) return showToast('Mobile and password required', 'error');
    setLoading(true);
    const res = await api.post('/auth/login', { mobile, password, role: 'customer' });
    setLoading(false);
    if (res.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      window.location.reload();
      showToast('Login successful!');
    } else {
      showToast(res.message || 'Login failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">SHREE RAAM MOBILE</h1>
              <p className="text-xl mb-6 text-emerald-100">Professional Mobile Repair Services</p>
              <p className="text-lg mb-8 text-emerald-50">Expert technicians, genuine parts, and real-time tracking for all your mobile repair needs</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/repair/register" className="bg-white text-emerald-700 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition flex items-center gap-2">
                  <Wrench className="w-5 h-5" /> Book Repair
                </Link>
                <a href="#tracking" className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-400 transition flex items-center gap-2">
                  <Search className="w-5 h-5" /> Track Repair
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <Smartphone className="w-32 h-32 mx-auto text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">100%</h3>
            <p className="text-gray-600">Secure Service</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">24/7</h3>
            <p className="text-gray-600">Support</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">5000+</h3>
            <p className="text-gray-600">Repairs Done</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">100%</h3>
            <p className="text-gray-600">Satisfaction</p>
          </div>
        </div>
      </section>

      {/* Live Tracking Section */}
      <section id="tracking" className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Repair Tracking</h2>
            <p className="text-gray-600">Enter your tracking number to get real-time updates</p>
          </div>
          <form onSubmit={handleTrack} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex gap-3">
              <input
                value={trackingId}
                onChange={e => setTrackingId(e.target.value)}
                placeholder="SRM-2026-000001"
                className="input flex-1 text-lg"
              />
              <button type="submit" className="btn-primary flex items-center gap-2 px-6">
                <Search className="w-5 h-5" /> Track
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Customer Login Panel */}
      {!isAuthenticated && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Login</h2>
              <p className="text-gray-600">Access your repair dashboard</p>
            </div>
            <form onSubmit={handleCustomerLogin} className="bg-gray-50 rounded-xl shadow-lg p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  New customer? <Link to="/register/customer" className="text-emerald-600 hover:underline font-medium">Register here</Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Logged In Customer Panel */}
      {isAuthenticated && user?.role === 'customer' && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user.name}!</h2>
              <p className="text-gray-600 mb-6">Manage your repairs and track status</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/dashboard/customer" className="btn-secondary flex items-center gap-2">
                  <Clock className="w-5 h-5" /> My Repairs
                </Link>
                <Link to="/repair/register" className="btn-primary flex items-center gap-2">
                  <Wrench className="w-5 h-5" /> New Repair
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services Overview */}
      <section id="services" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
            <p className="text-gray-600">Professional mobile repair services for all brands</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
              <div className="bg-emerald-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Screen Replacement</h3>
              <p className="text-gray-600 mb-4">High-quality screen replacements for all mobile brands with warranty</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Original parts</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> 6 months warranty</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Same day service</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
              <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Wrench className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Hardware Repair</h3>
              <p className="text-gray-600 mb-4">Expert hardware repair services including motherboard and IC level repairs</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> IC level repair</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Motherboard repair</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Battery replacement</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
              <div className="bg-purple-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Software Solutions</h3>
              <p className="text-gray-600 mb-4">Complete software solutions including OS installation and data recovery</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> OS installation</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Data recovery</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Virus removal</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Accessories Section */}
      <section className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Accessories</h2>
              <p className="text-gray-600">Genuine mobile accessories, chargers, covers and more</p>
            </div>
            <Link to="/accessories" className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 transition">
              View All Store <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No products available in the store right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {products.map(p => {
                const discount = p.discount_price ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
                const activePrice = p.discount_price !== null ? p.discount_price : p.price;
                const isOutOfStock = p.stock <= 0;

                return (
                  <div key={p.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">
                    <div className="aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center border-b">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <span className="text-gray-300 text-4xl">📱</span>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          -{discount}% OFF
                        </span>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase mb-1">
                          <span>{p.category}</span>
                          <span>{p.brand}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm group-hover:text-emerald-700 transition-colors line-clamp-2 h-10">{p.name}</h3>
                      </div>

                      <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          {p.discount_price !== null ? (
                            <>
                              <span className="text-emerald-600 font-bold text-base">₹{p.discount_price}</span>
                              <span className="text-gray-400 line-through text-xs">₹{p.price}</span>
                            </>
                          ) : (
                            <span className="text-gray-900 font-bold text-base">₹{p.price}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            if (!isAuthenticated) {
                              showToast('Please login to buy accessories', 'info');
                              navigate('/login/customer');
                            } else if (user?.role !== 'customer') {
                              showToast('Only customers can purchase accessories.', 'error');
                            } else {
                              navigate('/accessories');
                            }
                          }}
                          className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white p-2 rounded-xl transition duration-300"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Book Repair CTA at bottom of Featured Accessories */}
          <div className="mt-12 text-center bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-8 border border-emerald-100/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Need your device repaired by experts?</h3>
              <p className="text-sm text-gray-600">Get genuine parts, 100% warranty, and real-time live status tracking for your mobile or laptop repair.</p>
            </div>
            <Link 
              to="/repair/register" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 whitespace-nowrap text-sm"
            >
              <Wrench className="w-5 h-5" /> Book Repair Now
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h2>
            <p className="text-gray-600">Get in touch for any queries or support</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="bg-emerald-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">+91 95522 10333</p>
              <a href="tel:+919552210333" className="btn-primary inline-flex items-center gap-2">
                <Phone className="w-4 h-4" /> Call Now
              </a>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <p className="text-gray-600 mb-4">Chat with us</p>
              <a href="https://wa.me/919552210333" target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600 mb-4">Solapur, Maharashtra</p>
              <a href="#" className="btn-secondary inline-flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Get Directions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-8 h-8 text-emerald-400" />
                <span className="text-xl font-bold">SHREE RAAM MOBILE</span>
              </div>
              <p className="text-gray-400 text-sm">Professional mobile repair services with expert technicians and genuine parts</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" className="hover:text-emerald-400">Home</Link></li>
                <li><a href="#services" className="hover:text-emerald-400">Services</a></li>
                <li><Link to="/repair/register" className="hover:text-emerald-400">Book Repair</Link></li>
                <li><a href="#tracking" className="hover:text-emerald-400">Track Repair</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#contact" className="hover:text-emerald-400">Contact Us</a></li>
                <li><Link to="/login/customer" className="hover:text-emerald-400">Customer Login</Link></li>
                <li><Link to="/login/student" className="hover:text-emerald-400">Student Login</Link></li>
                <li><Link to="/login/staff" className="hover:text-emerald-400">Staff Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 95522 10333</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@shreeraammobile.com</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Solapur, Maharashtra</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 SHREE RAAM MOBILE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
