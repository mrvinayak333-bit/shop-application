import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Smartphone, Loader, Check, X, ShieldAlert, Layers } from 'lucide-react';
import api from '../lib/api';
import ToastContainer, { showToast } from './Toast';

export default function DeviceConfigManager() {
  const [activeSubTab, setActiveSubTab] = useState('types'); // types, brands, models
  
  // Dynamic lists from DB
  const [types, setTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit
  const [editingItem, setEditingItem] = useState(null);

  // Forms states
  const [typeForm, setTypeForm] = useState({ name: '', is_active: 1 });
  const [brandForm, setBrandForm] = useState({ device_type_id: '', name: '', is_active: 1 });
  const [modelForm, setModelForm] = useState({ brand_id: '', name: '', is_active: 1 });

  // Filters for search/list
  const [filterType, setFilterType] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'types') {
        const res = await api.get('/repair/manage/device-types');
        if (res?.success) setTypes(res.types || []);
      } else if (activeSubTab === 'brands') {
        const [brandsRes, typesRes] = await Promise.all([
          api.get('/repair/manage/brands'),
          api.get('/repair/manage/device-types')
        ]);
        if (brandsRes?.success) setBrands(brandsRes.brands || []);
        if (typesRes?.success) setTypes(typesRes.types || []);
      } else if (activeSubTab === 'models') {
        const [modelsRes, brandsRes] = await Promise.all([
          api.get('/repair/manage/models'),
          api.get('/repair/manage/brands')
        ]);
        if (modelsRes?.success) setModels(modelsRes.models || []);
        if (brandsRes?.success) setBrands(brandsRes.brands || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading device configuration details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingItem(null);
    if (activeSubTab === 'types') {
      setTypeForm({ name: '', is_active: 1 });
    } else if (activeSubTab === 'brands') {
      setBrandForm({ device_type_id: '', name: '', is_active: 1 });
    } else if (activeSubTab === 'models') {
      setModelForm({ brand_id: '', name: '', is_active: 1 });
    }
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    if (activeSubTab === 'types') {
      setTypeForm({ name: item.name, is_active: item.is_active });
    } else if (activeSubTab === 'brands') {
      setBrandForm({ device_type_id: item.device_type_id, name: item.name, is_active: item.is_active });
    } else if (activeSubTab === 'models') {
      setModelForm({ brand_id: item.brand_id, name: item.name, is_active: item.is_active });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (activeSubTab === 'types') {
        if (!typeForm.name.trim()) return showToast('Name is required', 'warning');
        res = modalMode === 'add' 
          ? await api.post('/repair/manage/device-types', typeForm)
          : await api.put(`/repair/manage/device-types/${editingItem.id}`, typeForm);
      } else if (activeSubTab === 'brands') {
        if (!brandForm.device_type_id || !brandForm.name.trim()) {
          return showToast('Device type and brand name are required', 'warning');
        }
        res = modalMode === 'add'
          ? await api.post('/repair/manage/brands', brandForm)
          : await api.put(`/repair/manage/brands/${editingItem.id}`, brandForm);
      } else if (activeSubTab === 'models') {
        if (!modelForm.brand_id || !modelForm.name.trim()) {
          return showToast('Brand and model name are required', 'warning');
        }
        res = modalMode === 'add'
          ? await api.post('/repair/manage/models', modelForm)
          : await api.put(`/repair/manage/models/${editingItem.id}`, modelForm);
      }

      if (res?.success) {
        showToast(modalMode === 'add' ? 'Added successfully' : 'Updated successfully', 'success');
        setModalOpen(false);
        loadData();
      } else {
        showToast(res?.message || 'Action failed', 'error');
      }
    } catch (err) {
      showToast('Server connection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this config? Deleting will remove children records.')) return;
    try {
      let res;
      if (activeSubTab === 'types') {
        res = await api.delete(`/repair/manage/device-types/${id}`);
      } else if (activeSubTab === 'brands') {
        res = await api.delete(`/repair/manage/brands/${id}`);
      } else if (activeSubTab === 'models') {
        res = await api.delete(`/repair/manage/models/${id}`);
      }
      if (res?.success) {
        showToast('Deleted successfully', 'success');
        loadData();
      }
    } catch (err) {
      showToast('Deletion failed', 'error');
    }
  };

  const handleToggleState = async (item) => {
    const nextState = item.is_active === 1 ? 0 : 1;
    try {
      let res;
      if (activeSubTab === 'types') {
        res = await api.put(`/repair/manage/device-types/${item.id}`, { name: item.name, is_active: nextState });
      } else if (activeSubTab === 'brands') {
        res = await api.put(`/repair/manage/brands/${item.id}`, { device_type_id: item.device_type_id, name: item.name, is_active: nextState });
      } else if (activeSubTab === 'models') {
        res = await api.put(`/repair/manage/models/${item.id}`, { brand_id: item.brand_id, name: item.name, is_active: nextState });
      }
      if (res?.success) {
        showToast(`Item status ${nextState === 1 ? 'Enabled' : 'Disabled'}`, 'success');
        loadData();
      }
    } catch (e) {
      showToast('State update failed', 'error');
    }
  };

  // Filters search lists
  const filteredTypes = types.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBrands = brands.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.device_type_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || b.device_type_id.toString() === filterType;
    return matchesSearch && matchesType;
  });
  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || m.device_type_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = !filterBrand || m.brand_id.toString() === filterBrand;
    const matchesType = !filterType || m.device_type_id.toString() === filterType;
    return matchesSearch && matchesBrand && matchesType;
  });

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      {/* Category Manager controls header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Device Categories Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Configure dynamic categories, brands dropdown options, and specific model choices.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => { setActiveSubTab('types'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeSubTab === 'types' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Device Types
          </button>
          <button 
            onClick={() => { setActiveSubTab('brands'); setSearchQuery(''); setFilterType(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeSubTab === 'brands' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Brand Lists
          </button>
          <button 
            onClick={() => { setActiveSubTab('models'); setSearchQuery(''); setFilterType(''); setFilterBrand(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeSubTab === 'models' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Model Lists
          </button>
        </div>
      </div>

      {/* Action panel & search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input 
            type="text" 
            placeholder="Search entries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
          />

          {/* Type filters for Brands & Models */}
          {activeSubTab !== 'types' && (
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Device Types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          {/* Brand filters for Models */}
          {activeSubTab === 'models' && (
            <select 
              value={filterBrand} 
              onChange={e => setFilterBrand(e.target.value)}
              className="px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        <button 
          onClick={openAddModal}
          className="btn-primary py-2.5 px-4 flex items-center gap-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow"
        >
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          
          {/* TAB 1: DEVICE TYPES TABLE */}
          {activeSubTab === 'types' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600 font-semibold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Device Category Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTypes.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleState(t)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${t.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {t.is_active === 1 ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(t)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-650" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filteredTypes.length === 0 && <tr><td colSpan="4" className="text-center py-12 text-gray-500">No device types found.</td></tr>}
              </tbody>
            </table>
          )}

          {/* TAB 2: BRANDS TABLE */}
          {activeSubTab === 'brands' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600 font-semibold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Device Category</th>
                  <th className="px-6 py-4">Manufacturer Brand</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBrands.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-xs">{b.id}</td>
                    <td className="px-6 py-4 text-gray-500">{b.device_type_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{b.name}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleState(b)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${b.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {b.is_active === 1 ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(b)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-650" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filteredBrands.length === 0 && <tr><td colSpan="5" className="text-center py-12 text-gray-500">No brand choices matching.</td></tr>}
              </tbody>
            </table>
          )}

          {/* TAB 3: MODELS TABLE */}
          {activeSubTab === 'models' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600 font-semibold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Model Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredModels.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-xs">{m.id}</td>
                    <td className="px-6 py-4 text-gray-500">{m.device_type_name}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{m.brand_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleState(m)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${m.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {m.is_active === 1 ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(m)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-650" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filteredModels.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-gray-500">No models matching search filters.</td></tr>}
              </tbody>
            </table>
          )}

        </div>
      )}

      {/* =====================================================
          DYNAMIC CONFIG CRUD MODAL (Types / Brands / Models)
          ===================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="text-base font-bold text-gray-900">
                {modalMode === 'add' ? 'Add New' : 'Edit'} {activeSubTab.slice(0, -1).toUpperCase()}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-sm text-gray-700">
              
              {/* FORM: TYPE BUILDER */}
              {activeSubTab === 'types' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Device Category Name *</label>
                  <input 
                    type="text" 
                    value={typeForm.name} 
                    onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                    placeholder="e.g. Smartphone"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              )}

              {/* FORM: BRAND BUILDER */}
              {activeSubTab === 'brands' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Select Parent Device Category *</label>
                    <select 
                      value={brandForm.device_type_id} 
                      onChange={e => setBrandForm({ ...brandForm, device_type_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">Select Category</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Brand Manufacturer Name *</label>
                    <input 
                      type="text" 
                      value={brandForm.name} 
                      onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                      placeholder="e.g. Apple (iPhone)"
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </>
              )}

              {/* FORM: MODEL BUILDER */}
              {activeSubTab === 'models' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Select Parent Manufacturer Brand *</label>
                    <select 
                      value={modelForm.brand_id} 
                      onChange={e => setModelForm({ ...modelForm, brand_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">Select Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.device_type_name} &rarr; {b.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Model Name *</label>
                    <input 
                      type="text" 
                      value={modelForm.name} 
                      onChange={e => setModelForm({ ...modelForm, name: e.target.value })}
                      placeholder="e.g. iPhone 15 Pro Max"
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t flex gap-3">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 btn-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
