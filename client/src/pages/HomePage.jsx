import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Smartphone, Wrench, Search, Phone, MessageCircle, MapPin, 
  ChevronRight, ShoppingCart, ShieldCheck, Laptop, Cpu, 
  ArrowRight, UserCheck, CheckCircle, Sparkles, Users, CheckCircle2, ShoppingBag
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [trackingId, setTrackingId] = useState('');

  // Featured Products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Live Statistics (Starting Base: 516 Customers, 1633 Repairs Delivered, 2502 Accessories Delivered)
  const [stats, setStats] = useState({ totalCustomers: 516, totalRepairs: 1633, totalAccessories: 2502 });

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const res = await api.get('/accessories/products');
        if (res.success && res.products) {
          setProducts(res.products.slice(0, 4));
        }
      } catch (err) {
        console.error('Error loading products for homepage:', err);
      } finally {
        setProductsLoading(false);
      }
    };

    const fetchPublicStats = async () => {
      try {
        const res = await api.get('/repair/public-stats');
        if (res && res.success) {
          setStats({
            totalCustomers: res.totalCustomers || 516,
            totalRepairs: res.totalRepairs || 1633,
            totalAccessories: res.totalAccessories || 2502
          });
        }
      } catch (err) {
        console.error('Error loading public stats:', err);
      }
    };

    fetchFeaturedProducts();
    fetchPublicStats();
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return showToast('Please enter your tracking number', 'error');
    navigate('/track/' + trackingId.trim());
  };

  const displayCustomers = stats.totalCustomers < 1000 ? `0${stats.totalCustomers}` : `${stats.totalCustomers.toLocaleString()}+`;
  const displayRepairs = `${stats.totalRepairs.toLocaleString()}+`;
  const displayAccessories = `${stats.totalAccessories.toLocaleString()}+`;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <ToastContainer />

      {/* 🌿 HERO BANNER WITH SOFT EYE-SOOTHING GRADIENT */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white py-20 px-4 overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            
            {/* LEFT HERO CONTENT */}
            <div className="md:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold tracking-wide backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                PREMIUM REPAIR CARE & SPARES CENTER
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white">
                SRM MOBAILE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">FIXIT</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Professional smartphone & laptop repair services, chip-level diagnosis, original parts, and real-time live tracking.
              </p>

              {/* LIVE TRACKING SEARCH BAR */}
              <div className="bg-white/10 backdrop-blur-lg p-3 rounded-2xl border border-white/15 shadow-2xl max-w-lg">
                <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={trackingId}
                      onChange={e => setTrackingId(e.target.value)}
                      placeholder="Enter Tracking No. (e.g. SRM-2026-000001)"
                      className="w-full bg-slate-900/90 text-white placeholder-slate-400 pl-11 pr-4 py-3 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                  <button type="submit" className="btn-primary py-3 px-6 text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-500/20">
                    Track Live <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/repair/register" className="btn-primary py-3 px-6 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                  <Wrench className="w-4 h-4" /> Book Repair Service
                </Link>
                <Link to="/accessories" className="py-3 px-6 text-xs font-extrabold flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition backdrop-blur-md">
                  <ShoppingCart className="w-4 h-4 text-emerald-300" /> Accessories Store
                </Link>
              </div>
            </div>

            {/* RIGHT HERO BRANDING CARD WITH IMAGE */}
            <div className="md:col-span-5 hidden md:block">
              <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-4 border border-emerald-500/30 shadow-2xl text-center space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-slate-950 flex items-center justify-center p-2">
                  <img
                    src="/srm_mobile_fixit_cropped.png"
                    alt="SRM MOBAILE FIXIT - IC Level Repairing Specialist"
                    className="w-full h-auto max-h-[360px] object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-3 text-center">
                    <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase block">
                      REPAIR • TRUST • CARE
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🔬 SRM MOBAILE FIXIT SPECIALIZATION BADGES RIBBON */}
      <section className="py-6 px-4 bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-md hover:border-emerald-500 transition">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-lg font-bold">🔬</div>
            <div>
              <h4 className="text-xs font-extrabold text-white">IC Level Repairing</h4>
              <p className="text-[10px] text-slate-400">Micro-Soldering & Chip Swap</p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-md hover:border-emerald-500 transition">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-lg font-bold">🛠️</div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Expert Service</h4>
              <p className="text-[10px] text-slate-400">Fast Master Diagnosis</p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-md hover:border-emerald-500 transition">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-lg font-bold">🛡️</div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Trusted Care</h4>
              <p className="text-[10px] text-slate-400">100% Genuine Spares</p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-md hover:border-emerald-500 transition">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-lg font-bold">🤖</div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Android Expert Care</h4>
              <p className="text-[10px] text-slate-400">Samsung, OnePlus, Vivo, Oppo</p>
            </div>
          </div>
        </div>
      </section>

      {/* 👤 CUSTOMER LOGGED IN QUICK ACCESS BAR */}
      {isAuthenticated && user?.role === 'customer' && (
        <section className="py-4 px-4 bg-emerald-50 border-b border-emerald-100">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Welcome back, {user.name}!</h3>
                <p className="text-[11px] text-slate-600">Quick access to your repair requests and orders</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/customer/dashboard" className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Go to My Dashboard
              </Link>
              <Link to="/repair/register" className="btn-secondary text-xs py-2 px-4 font-bold flex items-center gap-1.5">
                <Wrench className="w-4 h-4" /> Book Repair
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 🛍️ FEATURED ACCESSORIES STORE PREVIEW */}
      <section className="py-16 px-4 bg-white border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                Store Preview
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">Featured Accessories</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fast chargers, USB cables, cases, memory cards and premium audio gear</p>
            </div>
            <Link to="/accessories" className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1 transition">
              Explore All Accessories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-slate-500 py-12 text-xs">No products available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {products.map(p => {
                const discount = p.discount_price ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
                    <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <span className="text-slate-300 text-4xl">📦</span>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          -{discount}% OFF
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                          <span>{p.category}</span>
                          <span>{p.brand}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors line-clamp-2 h-9">{p.name}</h3>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          {p.discount_price !== null ? (
                            <>
                              <span className="text-emerald-600 font-extrabold text-sm">₹{parseFloat(p.discount_price).toFixed(2)}</span>
                              <span className="text-slate-400 line-through text-[10px]">₹{parseFloat(p.price).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-slate-900 font-extrabold text-sm">₹{parseFloat(p.price).toFixed(2)}</span>
                          )}
                        </div>
                        <Link 
                          to="/accessories"
                          className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white p-2 rounded-xl transition duration-300"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 🔧 REPAIR SERVICES GRID */}
      <section id="services" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              Expert Repairs
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Professional Repair Services
            </h2>
            <p className="text-xs text-slate-500 mt-1">High quality display replacements, chip-level IC soldering, and software solutions</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Display & Glass Fitting</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">Original display panels for iPhone, Samsung, Vivo, Oppo, Xiaomi, RealMe & IQOO with warranty.</p>
              <ul className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Genuine display panels</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Touch sensitivity test</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Express fitting</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Motherboard & IC Repair</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">Advanced micro-soldering, Power IC replacement, CPU BGA reballing, and charging port IC fixes.</p>
              <ul className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Dead phone recovery</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Charging IC repair</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> ESD protected lab</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Laptop & Computer Repair</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">Complete laptop service, keyboard replacement, SSD upgrades, OS flashing, and hinge repair.</p>
              <ul className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> All Laptop Brands</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Thermal servicing</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> OS & Software setup</li>
              </ul>
            </div>
          </div>

          {/* 📊 LIVE PERFORMANCE & CUSTOMER IMPACT COUNTER (3 Metric Grid) */}
          <div className="mt-12 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/90 rounded-3xl p-6 sm:p-10 border border-emerald-200/80 shadow-md text-slate-800 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
              <div className="text-left max-w-md space-y-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider font-mono bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    LIVE PERFORMANCE METRICS
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Trusted by Thousands of Happy Customers</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time live tally of customers, completed repairs, and delivered accessories across our service network.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto shrink-0">
                {/* CARD 1: TOTAL CUSTOMERS */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm text-center min-w-[130px]">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 block tracking-tight">
                    {displayCustomers}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wider mt-0.5">
                    Happy Customers
                  </span>
                </div>

                {/* CARD 2: TOTAL REPAIRS COMPLETED */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm text-center min-w-[130px]">
                  <div className="w-9 h-9 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center mx-auto mb-2 border border-teal-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-teal-600 block tracking-tight">
                    {displayRepairs}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wider mt-0.5">
                    Repairs Delivered
                  </span>
                </div>

                {/* CARD 3: TOTAL ACCESSORIES DELIVERED */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm text-center min-w-[130px]">
                  <div className="w-9 h-9 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mx-auto mb-2 border border-green-200">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-green-600 block tracking-tight">
                    {displayAccessories}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wider mt-0.5">
                    Accessories Delivered
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📞 CONTACT & LOCATION SECTION */}
      <section id="contact" className="py-16 px-4 bg-slate-50/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              Get In Touch
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">Contact & Support</h2>
            <p className="text-xs text-slate-500 mt-0.5">Reach out for instant repair quotes or visit our Solapur center</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-2xs">
              <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Direct Call Support</h3>
              <p className="text-xs text-slate-500 mb-4">+91 91305 21333</p>
              <a href="tel:+919130521333" className="btn-primary inline-flex items-center gap-2 py-2 px-5 text-xs font-extrabold">
                <Phone className="w-3.5 h-3.5" /> Call Technician
              </a>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-2xs">
              <div className="bg-green-50 text-green-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">WhatsApp Chat</h3>
              <p className="text-xs text-slate-500 mb-4">Instant support on WhatsApp</p>
              <a href="https://wa.me/919130521333" target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white py-2 px-5 rounded-xl text-xs font-extrabold transition inline-flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" /> Chat on WhatsApp
              </a>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-2xs">
              <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Visit Service Center</h3>
              <p className="text-xs text-slate-500 mb-4">Solapur, Maharashtra – 413002</p>
              <a href="https://maps.google.com/?q=Solapur" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 py-2 px-5 text-xs font-extrabold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Open Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white py-12 px-4 border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8 text-left">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-7 h-7 text-emerald-400" />
                <span className="text-base font-bold tracking-wide">SRM MOBAILE FIXIT</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">Official Mobile & Laptop Repairing & Accessories Store System.</p>
            </div>
            <div>
              <h4 className="font-bold text-xs mb-3 text-slate-200 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><Link to="/" className="hover:text-emerald-400">Home</Link></li>
                <li><a href="#services" className="hover:text-emerald-400">Services</a></li>
                <li><Link to="/repair/register" className="hover:text-emerald-400">Book Repair</Link></li>
                <li><Link to="/accessories" className="hover:text-emerald-400">Accessories Store</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs mb-3 text-slate-200 uppercase tracking-wider">Portal Logins</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><Link to="/login/customer" className="hover:text-emerald-400">Customer Login</Link></li>
                <li><Link to="/login/student" className="hover:text-emerald-400">Student Login</Link></li>
                <li><Link to="/login/staff" className="hover:text-emerald-400">Staff Login</Link></li>
                <li><Link to="/login/technician" className="hover:text-emerald-400">Technician Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs mb-3 text-slate-200 uppercase tracking-wider">Store Info</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /> +91 91305 21333</li>
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> Solapur, Maharashtra</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-6 text-center text-xs text-slate-500 font-mono">
            &copy; 2026 SRM MOBAILE FIXIT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
