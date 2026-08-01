import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ShoppingCart, Star, Filter, ArrowUpDown, ChevronRight, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const categories = [
  "All",
  "Mobile Covers",
  "Screen Protectors",
  "Chargers",
  "Fast Chargers",
  "Charging Cables",
  "Smart Watches",
  "Headphones",
  "Neckbands",
  "Earphones",
  "TWS Buds",
  "Bluetooth Speakers",
  "Power Banks",
  "Memory Cards",
  "OTG & Adapters",
  "Mobile Holders",
  "Car Chargers",
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
      showToast('Please login to buy accessories', 'info');
      navigate('/login/customer');
      return;
    }
    if (user?.role !== 'customer') {
      showToast('Only customers can purchase accessories.', 'error');
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

  // Filter and sort products on client side for search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
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
    return new Date(b.created_at) - new Date(a.created_at); // newest
  });

  const getDiscountPercent = (price, discountPrice) => {
    if (!discountPrice) return 0;
    const diff = price - discountPrice;
    return Math.round((diff / price) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <ToastContainer />
      
      {/* Catalog Header banner */}
      <div className="bg-emerald-800 text-white py-12 px-4 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto z-10 relative">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Accessories Store</h1>
          <p className="text-emerald-100 text-base md:text-lg mb-6">Upgrade your mobile with premium screen protectors, chargers, ear buds & holders.</p>
          
          {/* Main search and cart float */}
          <div className="flex flex-col sm:flex-row max-w-xl mx-auto gap-3 items-center">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search accessories or brands..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-none text-gray-900 focus:ring-2 focus:ring-emerald-500 shadow-lg text-sm"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
            {isAuthenticated && user?.role === 'customer' && (
              <Link to="/accessories/cart" className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg transition-transform hover:scale-105 w-full sm:w-auto shrink-0 text-sm">
                <ShoppingCart className="w-5 h-5" /> Cart ({cartCount})
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card sticky top-20">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <Filter className="w-4 h-4 text-emerald-600" /> Categories
            </h2>
            <div className="space-y-1 max-h-96 lg:max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
            <div>
              <p className="text-sm text-gray-500">Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products</p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="select py-1.5 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : filteredProducts.length === 0 ? (
            <div className="card py-16 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-1">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map(p => {
                const discPercent = getDiscountPercent(p.price, p.discount_price);
                const activePrice = p.discount_price !== null ? p.discount_price : p.price;
                const isOutOfStock = p.stock <= 0;

                return (
                  <div key={p.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1">
                    
                    {/* Image frame */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden border-b flex items-center justify-center">
                      {p.image_url ? (
                        <img 
                          src={p.image_url} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <span className="text-gray-300 text-4xl">📱</span>
                      )}
                      
                      {/* Discount Badge */}
                      {discPercent > 0 && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                          -{discPercent}% OFF
                        </span>
                      )}

                      {/* Stock overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Out of stock</span>
                        </div>
                      )}
                    </div>

                    {/* Details body */}
                    <div className="p-4 flex-1 flex flex-col space-y-2">
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{p.category}</span>
                        <span className="text-xs text-gray-400 font-medium">{p.brand}</span>
                      </div>

                      <h3 className="font-bold text-gray-800 text-sm group-hover:text-emerald-700 transition-colors line-clamp-2 h-10">{p.name}</h3>

                      <p className="text-xs text-gray-400 line-clamp-2">{p.description || 'No description available.'}</p>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{parseFloat(p.rating).toFixed(1)}</span>
                        <span className="text-[10px] text-gray-400">({p.stock} remaining)</span>
                      </div>

                      {/* Prices */}
                      <div className="flex items-baseline gap-2 pt-2 flex-1 items-end">
                        <span className="text-lg font-extrabold text-emerald-700">₹{activePrice}</span>
                        {p.discount_price !== null && (
                          <span className="text-xs text-gray-400 line-through">₹{p.price}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-3">
                        <button
                          onClick={() => handleAddToCart(p.id, false)}
                          disabled={isOutOfStock || addingToCart === p.id}
                          className="flex-1 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:hover:bg-transparent py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Cart
                        </button>
                        <button
                          onClick={() => handleAddToCart(p.id, true)}
                          disabled={isOutOfStock || addingToCart === p.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-colors"
                        >
                          Buy Now
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
