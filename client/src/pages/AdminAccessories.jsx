import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Tag, Archive, ChevronLeft, Save, Eye, EyeOff, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import ToastContainer, { showToast } from '../components/Toast';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const categories = [
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
  const [loading, setLoading] = useState(true);
  
  // Form modal states
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

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'master', 'staff'].includes(user?.role)) {
      showToast('Unauthorized access', 'error');
      navigate('/');
      return;
    }
    fetchProducts();
  }, [isAuthenticated, user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accessories/admin/products');
      if (res.success) setProducts(res.products);
      else showToast('Error loading products', 'error');
    } catch {
      showToast('Error loading products', 'error');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
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
      discount_price: p.discount_price !== null ? String(p.discount_price) : '',
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
    } catch (err) {
      showToast('Image upload failed due to server error', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return showToast('Please enter name and price', 'error');

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price.trim() ? parseFloat(formData.discount_price) : null,
        stock: parseInt(formData.stock)
      };

      let res;
      if (editingProduct) {
        res = await api.put(`/accessories/admin/products/${editingProduct}`, payload);
      } else {
        res = await api.post('/accessories/admin/products', payload);
      }

      if (res.success) {
        showToast(editingProduct ? 'Product updated!' : 'Product added!', 'success');
        setShowModal(false);
        fetchProducts();
      } else {
        showToast(res.message || 'Error saving product', 'error');
      }
    } catch {
      showToast('Error saving product', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accessory?')) return;
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
            <h1 className="text-xl font-bold text-gray-900 mt-2">Accessories Inventory</h1>
          </div>
          <button onClick={openAddModal} className="btn-primary py-2 px-4 flex items-center gap-1.5 shrink-0 text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Modal Window Form Overlay */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 border shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" /> {editingProduct ? 'Edit Accessory Details' : 'Add New Product'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Product Name</label>
                  <input type="text" required placeholder="e.g. Spigen Armor Cover" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Brand</label>
                  <input type="text" placeholder="e.g. Spigen, Samsung" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="input text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="select text-sm">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Original Price (₹)</label>
                  <input type="number" required min="0" step="0.01" placeholder="e.g. 599" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="input text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Discount Price (₹, optional)</label>
                  <input type="number" min="0" step="0.01" placeholder="e.g. 499" value={formData.discount_price} onChange={e => setFormData({ ...formData, discount_price: e.target.value })} className="input text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Stock Level</label>
                  <input type="number" required min="0" placeholder="e.g. 50" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="input text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="select text-sm">
                    <option value="enabled">Enabled (Visible)</option>
                    <option value="disabled">Disabled (Hidden)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Product Description</label>
                  <textarea placeholder="Write short product details here..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input text-sm h-16 resize-none" rows={2} />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Product Image</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="w-16 h-16 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      {formData.image_url ? (
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-gray-300 text-2xl">📷</span>
                      )}
                    </div>
                    
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 px-3 rounded-lg border border-dashed border-emerald-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition">
                          <Upload className="w-3.5 h-3.5" /> Upload File
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
                            className="bg-red-50 text-red-700 hover:bg-red-100 py-2 px-3 rounded-lg border border-red-200 font-bold text-xs flex items-center justify-center gap-1 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Or enter image URL here..." 
                        value={formData.image_url} 
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })} 
                        className="input text-xs" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t pt-3">
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-1.5 text-sm disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Product'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2.5 font-bold text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product listings */}
        {loading ? (
          <Loading />
        ) : products.length === 0 ? (
          <div className="card py-16 text-center space-y-4">
            <Archive className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">No accessories registered yet.</p>
            <button onClick={openAddModal} className="btn-primary inline-block">Create Product Listing</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-6 py-4">Item Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Original Price</th>
                    <th className="px-6 py-4">Discount Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {products.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl">📱</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate max-w-xs">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.brand || 'No Brand'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-xs text-gray-600 uppercase tracking-wider">{p.category}</td>
                        <td className="px-6 py-4 text-gray-700 font-bold">₹{p.price}</td>
                        <td className="px-6 py-4 text-emerald-700 font-bold">
                          {p.discount_price !== null ? `₹${p.discount_price}` : 'None'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${p.status === 'enabled' ? 'text-green-600' : 'text-gray-400'}`}>
                            {p.status === 'enabled' ? (
                              <><Eye className="w-3.5 h-3.5" /> Enabled</>
                            ) : (
                              <><EyeOff className="w-3.5 h-3.5" /> Disabled</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit product">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete product">
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
    </div>
  );
}
