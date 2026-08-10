import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, ShoppingCart, Star, ArrowUpDown, 
  Eye, Package, X, Sparkles, ShoppingBag
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const categories = [
  "All",
  "Chargers",
  "Fast Chargers",
  "Charging Cables",
  "Mobile Covers",
  "Screen Protectors",
  "Headphones",
  "TWS Buds",
  "Power Banks",
  "Memory Cards",
  "Smart Watches",
  "Bluetooth Speakers",
  "OTG & Adapters",
  "Tempered Glass",
  "Other Accessories"
];

export default function AccessoriesStore() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState(null);
  
  // Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    if (isAuthenticated && user?.role === 'customer') {
      fetchCartCount();
    }
  }, [selectedCategory, isAuthenticated, user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/accessories/products';
      const params = [];
      if (selectedCategory !== 'All') {
        params.push(`category=${encodeURIComponent(selectedCategory)}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      const res = await api.get(url);
      if (res.success) {
        setProducts(res.products);
      } else {
        showToast('Error loading products', 'error');
      }
    } catch (err) {
      showToast('Error loading products', 'error');
    }
    setLoading(false);
  };

  const fetchCartCount = async () => {
    try {
      const res = await api.get('/accessories/cart');
      if (res.success) {
        const count = res.cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async (productId, redirect = false) => {
    if (!isAuthenticated) {
      showToast('Please login to buy accessories & tools', 'info');
      navigate('/login/customer');
      return;
    }
    if (user?.role !== 'customer') {
      showToast('Only customers can purchase items.', 'error');
      return;
    }

    setAddingToCart(productId);
    try {
      const res = await api.post('/accessories/cart', { product_id: productId, quantity: 1 });
      if (res.success) {
        showToast('Item added to cart!', 'success');
        fetchCartCount();
        if (redirect) {
          navigate('/accessories/cart');
        }
      } else {
        showToast(res.message || 'Failed to add item', 'error');
      }
    } catch (err) {
      showToast('Failed to add item', 'error');
    }
    setAddingToCart(null);
  };

  // Filter and sort products on client side
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'price-low') {
      const priceA = a.discount_price !== null ? a.discount_price : a.price;
      const priceB = b.discount_price !== null ? b.discount_price : b.price;
      return priceA - priceB;
    }
    if (sortBy === 'price-high') {
      const priceA = a.discount_price !== null ? a.discount_price : a.price;
      const priceB = b.discount_price !== null ? b.discount_price : b.price;
      return priceB - priceA;
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getDiscountPercent = (price, discountPrice) => {
    if (!discountPrice) return 0;
    const diff = price - discountPrice;
    return Math.round((diff / price) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <ToastContainer />

      {/* 🛍️ STORE HERO BANNER */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white py-14 px-4 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto z-10 relative text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            100% GENUINE MOBILE ACCESSORIES
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-white">
            Accessories & Spares <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Store</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto mb-6 leading-relaxed">
            Fast chargers, original USB cables, tempered glass, memory cards, back covers, and premium audio accessories.
          </p>

          {/* SEARCH & QUICK CART BAR */}
          <div className="flex flex-col sm:flex-row max-w-2xl mx-auto gap-3 items-center">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search tools, displays, ICs, chargers or brands..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 text-white placeholder-slate-400 border border-slate-700 text-xs focus:outline-none focus:border-emerald-400 shadow-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            </div>

            {isAuthenticated && user?.role === 'customer' && (
              <Link 
                to="/accessories/cart" 
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition shrink-0 text-xs w-full sm:w-auto"
              >
                <ShoppingCart className="w-4 h-4" /> My Cart ({cartCount})
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 🏷️ CATEGORY SLIDER PILLS */}
      <section className="bg-white border-b border-slate-200/80 py-3 px-4 sticky top-16 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 border ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 📦 STORE CONTENT GRID */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        
        {/* FILTER & COUNT TOOLBAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80">
          <div>
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900 font-extrabold">{filteredProducts.length}</strong> items for category <strong className="text-emerald-700 font-bold">"{selectedCategory}"</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Sort:</span>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        {loading ? (
          <Loading />
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs max-w-lg mx-auto my-8 space-y-3">
            <Package className="w-14 h-14 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No accessories found</h3>
            <p className="text-xs text-slate-500">No items match your selected category or search query.</p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="btn-primary py-2.5 px-6 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(p => {
              const discPercent = getDiscountPercent(p.price, p.discount_price);
              const activePrice = p.discount_price !== null ? p.discount_price : p.price;
              const isOutOfStock = p.stock <= 0;
              const savings = p.discount_price !== null ? (p.price - p.discount_price) : 0;

              return (
                <div 
                  key={p.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1"
                >
                  
                  {/* PRODUCT IMAGE & BADGES */}
                  <div className="aspect-square bg-slate-50 relative overflow-hidden border-b border-slate-100 flex items-center justify-center">
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <span className="text-slate-300 text-5xl">📦</span>
                    )}

                    {/* Discount Badge */}
                    {discPercent > 0 && (
                      <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                        -{discPercent}% OFF
                      </span>
                    )}

                    {/* Stock Status Badge */}
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setQuickViewProduct(p)}
                        className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-xl shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* PRODUCT DETAILS */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-left">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md">{p.category}</span>
                        <span>{p.brand}</span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-xs line-clamp-2 group-hover:text-emerald-700 transition-colors h-9">
                        {p.name}
                      </h3>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {p.description || 'Professional grade repairing equipment.'}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-2">
                      {/* Rating & Stock */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-slate-800">{parseFloat(p.rating).toFixed(1)}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${p.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>

                      {/* Prices */}
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-emerald-600">₹{parseFloat(activePrice).toFixed(2)}</span>
                          {p.discount_price !== null && (
                            <span className="text-[11px] text-slate-400 line-through">₹{parseFloat(p.price).toFixed(2)}</span>
                          )}
                        </div>
                        {savings > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Save ₹{savings}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleAddToCart(p.id, false)}
                          disabled={isOutOfStock || addingToCart === p.id}
                          className="flex-1 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Cart
                        </button>
                        <button
                          onClick={() => handleAddToCart(p.id, true)}
                          disabled={isOutOfStock || addingToCart === p.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition shadow-xs"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔍 QUICK VIEW PRODUCT MODAL */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                {quickViewProduct.image_url ? (
                  <img src={quickViewProduct.image_url} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-300 text-6xl">📦</span>
                )}
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                    {quickViewProduct.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    {quickViewProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">Brand: {quickViewProduct.brand}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {quickViewProduct.description || 'Genuine original accessory with warranty.'}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600">
                    ₹{quickViewProduct.discount_price !== null ? parseFloat(quickViewProduct.discount_price).toFixed(2) : parseFloat(quickViewProduct.price).toFixed(2)}
                  </span>
                  {quickViewProduct.discount_price !== null && (
                    <span className="text-xs text-slate-400 line-through">₹{parseFloat(quickViewProduct.price).toFixed(2)}</span>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      handleAddToCart(quickViewProduct.id, true);
                      setQuickViewProduct(null);
                    }}
                    className="btn-primary w-full py-3 text-xs font-extrabold"
                  >
                    Instant Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
