import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Tag, Archive, ChevronLeft, Save, Eye, EyeOff,
  Upload, Search, Filter, Layers, CheckCircle2, AlertTriangle, Box,
  Sparkles, X, FolderPlus, DollarSign, Percent
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const DEFAULT_CATEGORIES = [
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

export default function AdminAccessories() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Mobile Covers',
    description: '',
    price: '',
    discount_price: '',
    stock: 0,
    status: 'enabled',
    image_url: ''
  });
  const [saving, setSaving] = useState(false);

  // New Category Creation Inline Modal
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'master', 'staff'].includes(user?.role)) {
      showToast('Unauthorized access', 'error');
      navigate('/');
      return;
    }
    loadData();
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchCategories()]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/accessories/admin/products');
      if (res.success) setProducts(res.products || []);
      else showToast('Error loading products', 'error');
    } catch {
      showToast('Error loading products', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/accessories/categories');
      if (res.success && Array.isArray(res.categories)) {
        const catNames = res.categories.map(c => typeof c === 'string' ? c : c.name);
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...catNames]));
        setCategoriesList(merged);
      } else {
        setCategoriesList(DEFAULT_CATEGORIES);
      }
    } catch {
      setCategoriesList(DEFAULT_CATEGORIES);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatName.trim()) {
      return showToast('Please enter category name', 'error');
    }

    const cleanCatName = newCatName.trim();
    setCreatingCat(true);

    try {
      const res = await api.post('/accessories/admin/categories', { name: cleanCatName });
      if (res.success) {
        showToast(`Category "${cleanCatName}" created successfully!`, 'success');
        setCategoriesList(prev => Array.from(new Set([...prev, cleanCatName])));
        setFormData(prev => ({ ...prev, category: cleanCatName }));
        setNewCatName('');
        setShowNewCatModal(false);
      } else {
        showToast(res.message || 'Error creating category', 'error');
      }
    } catch (err) {
      showToast('Server error creating category', 'error');
    } finally {
      setCreatingCat(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      category: categoriesList[0] || 'Mobile Covers',
      description: '',
      price: '',
      discount_price: '',
      stock: 10,
      status: 'enabled',
      image_url: ''
    });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p.id);
    setFormData({
      name: p.name,
      brand: p.brand || '',
      category: p.category,
      description: p.description || '',
      price: String(p.price),
      discount_price: p.discount_price !== null && p.discount_price !== undefined ? String(p.discount_price) : '',
      stock: p.stock,
      status: p.status,
      image_url: p.image_url || ''
    });
    setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return showToast('Image file size must be less than 5MB', 'error');
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    showToast('Uploading image...', 'info');
    try {
      const res = await api.post('/accessories/admin/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.success) {
        setFormData(prev => ({ ...prev, image_url: res.fileUrl }));
        showToast('Image uploaded successfully!', 'success');
      } else {
        showToast(res.message || 'Image upload failed', 'error');
      }
    } catch {
      showToast('Image upload failed due to server error', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category) {
      return showToast('Product Name, Category, and Price are required', 'error');
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price.trim() ? parseFloat(formData.discount_price) : null,
        stock: parseInt(formData.stock) || 0
      };

      let res;
      if (editingProduct) {
        res = await api.put(`/accessories/admin/products/${editingProduct}`, payload);
      } else {
        res = await api.post('/accessories/admin/products', payload);
      }

      if (res.success) {
        showToast(editingProduct ? 'Product updated successfully!' : 'New Product added successfully!', 'success');
        setShowModal(false);
        fetchProducts();
      } else {
        showToast(res.message || 'Error saving product', 'error');
      }
    } catch {
      showToast('Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accessory product?')) return;
    try {
      const res = await api.delete(`/accessories/admin/products/${id}`);
      if (res.success) {
        showToast('Product deleted!', 'success');
        fetchProducts();
      } else {
        showToast(res.message || 'Error deleting product', 'error');
      }
    } catch {
      showToast('Error deleting product', 'error');
    }
  };

  // Filtered Products List
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'enabled' && p.status === 'enabled') ||
      (statusFilter === 'disabled' && p.status === 'disabled') ||
      (statusFilter === 'low_stock' && p.stock <= 5);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const totalProducts = products.length;
  const activeListings = products.filter(p => p.status === 'enabled').length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const totalCategoriesCount = categoriesList.length;

  // Calculate discount percentage helper
  const calcDiscountPercent = (price, discountPrice) => {
    const p = parseFloat(price);
    const d = parseFloat(discountPrice);
    if (p > 0 && d > 0 && d < p) {
      return Math.round(((p - d) / p) * 100);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Navbar />
      <ToastContainer />

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-5">
          <div>
            <Link
              to="/dashboard/admin"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 text-xs font-bold transition mb-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Box className="w-7 h-7 text-emerald-500" />
              Accessories & Products Inventory
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage store product catalog, prices, stock levels, and custom categories.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewCatModal(true)}
              className="bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <FolderPlus className="w-4 h-4" /> Create Category
            </button>

            <button
              onClick={openAddModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" /> Add New Product
            </button>
          </div>
        </div>

        {/* Dashboard Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/80 border border-gray-700/80 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Total Products</p>
              <h3 className="text-xl font-black text-white mt-1">{totalProducts}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Box className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gray-800/80 border border-gray-700/80 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Active Listings</p>
              <h3 className="text-xl font-black text-emerald-400 mt-1">{activeListings}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gray-800/80 border border-gray-700/80 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Categories</p>
              <h3 className="text-xl font-black text-sky-400 mt-1">{totalCategoriesCount}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gray-800/80 border border-gray-700/80 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Low Stock (&le; 5)</p>
              <h3 className={`text-xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                {lowStockCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-gray-800/90 border border-gray-700 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search product name, brand, or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Category Dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">All Categories ({categoriesList.length})</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
              <option value="low_stock">Low Stock Only (&le; 5)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Category Quick Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${selectedCategoryFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
          >
            All Categories ({totalProducts})
          </button>
          {categoriesList.slice(0, 10).map(cat => {
            const count = products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${selectedCategoryFilter === cat ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Main Products Table */}
        {loading ? (
          <Loading />
        ) : filteredProducts.length === 0 ? (
          <div className="bg-gray-800/60 border border-dashed border-gray-700 rounded-2xl py-16 text-center space-y-3">
            <Archive className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-300">No products match your search or filter</h3>
            <p className="text-xs text-gray-500">Try clearing your search keyword or create a new product listing.</p>
            <button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Product Listing
            </button>
          </div>
        ) : (
          <div className="bg-gray-800/90 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-gray-700 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Regular Price</th>
                    <th className="px-6 py-4">Offer Price</th>
                    <th className="px-6 py-4">Stock Status</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 text-xs">
                  {filteredProducts.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock <= 5;
                    const discountPct = calcDiscountPercent(p.price, p.discount_price);

                    return (
                      <tr key={p.id} className="hover:bg-gray-700/40 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-6 h-6 text-gray-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-white text-sm truncate max-w-xs">{p.name}</p>
                              <p className="text-[11px] text-gray-400">{p.brand || 'Generic Brand'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-[10px] font-extrabold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg inline-block">
                            {p.category}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-300">₹{p.price}</td>

                        <td className="px-6 py-4">
                          {p.discount_price !== null && p.discount_price !== undefined ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-emerald-400">₹{p.discount_price}</span>
                              {discountPct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                  {discountPct}% OFF
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-[11px]">Regular</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${isOutOfStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : isLowStock ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-900 text-gray-300 border border-gray-700'}`}>
                            {isOutOfStock ? 'Out of Stock' : `${p.stock} in stock`}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 font-bold text-xs ${p.status === 'enabled' ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {p.status === 'enabled' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {p.status === 'enabled' ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-2 bg-gray-900 hover:bg-sky-600 text-sky-400 hover:text-white border border-gray-700 rounded-xl transition"
                              title="Edit product details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 bg-gray-900 hover:bg-red-600 text-red-400 hover:text-white border border-gray-700 rounded-xl transition"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ── MODAL: ADD / EDIT PRODUCT ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                {editingProduct ? 'Edit Accessory Product' : 'Add New Product Listing'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Product Name */}
              <div className="md:col-span-2 space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spigen Tough Armor Back Cover for iPhone 15"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Spigen, Samsung, Boat"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Category with Inline "+ Create New" Button */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-400 uppercase tracking-wider">Category *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(true)}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Create Category
                  </button>
                </div>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition font-bold"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Regular Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g. 999"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition font-bold"
                />
              </div>

              {/* Discount Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-400 uppercase tracking-wider">Offer Price (₹, optional)</label>
                  {calcDiscountPercent(formData.price, formData.discount_price) > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      {calcDiscountPercent(formData.price, formData.discount_price)}% OFF
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 799"
                  value={formData.discount_price}
                  onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition font-bold"
                />
              </div>

              {/* Stock */}
              <div className="space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Stock Inventory Quantity *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 25"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition font-bold"
                />
              </div>

              {/* Visibility Status */}
              <div className="space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Product Visibility</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition font-bold"
                >
                  <option value="enabled">Enabled (Visible in Store)</option>
                  <option value="disabled">Disabled (Hidden from Store)</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2 space-y-1">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Product Specifications & Description</label>
                <textarea
                  placeholder="Enter details like compatibility, color, material, warranty..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition h-20 resize-none"
                />
              </div>

              {/* Product Image Uploader */}
              <div className="md:col-span-2 space-y-2">
                <label className="block font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                <div className="flex flex-col sm:flex-row gap-3 items-center bg-gray-950 p-3 rounded-2xl border border-gray-800">
                  <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Box className="w-6 h-6 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <label className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2 px-3 rounded-xl border border-dashed border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-4 h-4" /> Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {formData.image_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2 px-3 rounded-xl border border-red-500/30 font-bold text-xs flex items-center justify-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste direct image URL (https://...)"
                      value={formData.image_url}
                      onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-gray-800 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-lg shadow-emerald-950/40"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Product...' : editingProduct ? 'Update Product' : 'Create Product Listing'}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl transition text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: CREATE NEW CATEGORY ───────────────────────────────────────── */}
      {showNewCatModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
          <form
            onSubmit={handleCreateCategory}
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                Create Custom Product Category
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCatModal(false)}
                className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Category Name *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Wireless Chargers, Gaming Accessories"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition font-bold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creatingCat}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {creatingCat ? 'Creating...' : 'Save Category'}
              </button>

              <button
                type="button"
                onClick={() => setShowNewCatModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-xl transition text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
