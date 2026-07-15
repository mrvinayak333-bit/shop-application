import { useState, useEffect } from 'react';
import { 
  Save, Mail, Globe, Image, HelpCircle, MessageSquare, Loader, Plus, Trash2, Shield, Settings 
} from 'lucide-react';
import api from '../lib/api';
import ToastContainer, { showToast } from './Toast';

export default function MasterSettingsCenter() {
  const [activeTab, setActiveTab] = useState('general'); // general, smtp, templates, faqs, testimonials, gallery
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms states
  const [webSettings, setWebSettings] = useState({});
  const [smtpSettings, setSmtpSettings] = useState({});
  
  // Lists
  const [gallery, setGallery] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [webRes, settingsRes, galleryRes, slidersRes] = await Promise.all([
        api.get('/master/website-settings'),
        api.get('/master/settings'),
        api.get('/master/gallery'),
        api.get('/master/sliders')
      ]);

      if (webRes?.success) {
        const parsedWeb = {};
        webRes.settings.forEach(s => { parsedWeb[s.setting_key] = s.setting_value; });
        setWebSettings(parsedWeb);
        
        // Parse FAQs and Testimonials lists
        try {
          setFaqs(parsedWeb.faqs ? JSON.parse(parsedWeb.faqs) : []);
        } catch (e) { setFaqs([]); }
        try {
          setTestimonials(parsedWeb.testimonials ? JSON.parse(parsedWeb.testimonials) : []);
        } catch (e) { setTestimonials([]); }
      }

      if (settingsRes?.success) {
        const parsedSmtp = {};
        settingsRes.settings.forEach(s => { parsedSmtp[s.setting_key] = s.setting_value; });
        setSmtpSettings(parsedSmtp);
      }

      if (galleryRes?.success) setGallery(galleryRes.gallery || []);
      if (slidersRes?.success) setSliders(slidersRes.sliders || []);

    } catch (err) {
      showToast('Error loading configuration settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebSetting = async (key, val) => {
    try {
      const res = await api.put('/master/website-settings', { key, value: val });
      if (res?.success) {
        setWebSettings(prev => ({ ...prev, [key]: val }));
        return true;
      }
    } catch (e) {
      showToast(`Failed to update ${key}`, 'error');
    }
    return false;
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const keys = [
        'hero_title', 'hero_subtitle', 'theme_color', 'contact_email', 
        'contact_phone', 'contact_address', 'whatsapp', 'google_map_embed'
      ];
      
      let success = true;
      for (const k of keys) {
        if (webSettings[k] !== undefined) {
          const ok = await handleSaveWebSetting(k, webSettings[k]);
          if (!ok) success = false;
        }
      }
      if (success) showToast('General settings saved successfully!', 'success');
    } catch (err) {
      showToast('Save action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const settingsPayload = Object.keys(smtpSettings)
        .filter(key => [
          'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_sender', 
          'welcome_email_template', 'payment_email_template', 
          'course_approval_email_template', 'reset_password_email_template'
        ].includes(key))
        .map(key => ({ key, value: smtpSettings[key] }));

      const res = await api.put('/master/settings', { settings: settingsPayload });
      if (res?.success) {
        showToast('Email & SMTP Settings saved successfully!', 'success');
      } else {
        showToast(res?.message || 'Save failed', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFaqs = async () => {
    setSubmitting(true);
    const ok = await handleSaveWebSetting('faqs', JSON.stringify(faqs));
    setSubmitting(false);
    if (ok) showToast('FAQs list updated successfully!', 'success');
  };

  const handleSaveTestimonials = async () => {
    setSubmitting(true);
    const ok = await handleSaveWebSetting('testimonials', JSON.stringify(testimonials));
    setSubmitting(false);
    if (ok) showToast('Testimonials list updated successfully!', 'success');
  };

  // FAQ CRUD helpers
  const addFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
  const updateFaq = (idx, field, val) => {
    const next = [...faqs];
    next[idx][field] = val;
    setFaqs(next);
  };
  const deleteFaq = (idx) => setFaqs(faqs.filter((_, i) => i !== idx));

  // Testimonials CRUD helpers
  const addTestimonial = () => setTestimonials([...testimonials, { name: '', role: '', comment: '' }]);
  const updateTestimonial = (idx, field, val) => {
    const next = [...testimonials];
    next[idx][field] = val;
    setTestimonials(next);
  };
  const deleteTestimonial = (idx) => setTestimonials(testimonials.filter((_, i) => i !== idx));

  // Upload/delete files helpers
  const handleUploadGallery = async (file) => {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('title', 'Gallery Photo');
    try {
      const res = await api.upload('/master/gallery', fd);
      if (res?.success) {
        showToast('Gallery image uploaded!', 'success');
        loadSettings();
      }
    } catch (e) { showToast('Image upload failed', 'error'); }
  };

  const handleDeleteGallery = async (id) => {
    if (!confirm('Delete this gallery photo?')) return;
    try {
      const res = await api.delete('/master/gallery/' + id);
      if (res?.success) {
        showToast('Image deleted!', 'success');
        loadSettings();
      }
    } catch (e) { showToast('Delete action failed', 'error'); }
  };

  const handleUploadSlider = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('title', 'Slider Image');
    fd.append('display_order', sliders.length);
    try {
      const res = await api.upload('/master/sliders', fd);
      if (res?.success) {
        showToast('Slider image uploaded!', 'success');
        loadSettings();
      }
    } catch (e) { showToast('Slider upload failed', 'error'); }
  };

  const handleDeleteSlider = async (id) => {
    if (!confirm('Delete this slider image?')) return;
    try {
      const res = await api.delete('/master/sliders/' + id);
      if (res?.success) {
        showToast('Slider deleted!', 'success');
        loadSettings();
      }
    } catch (e) { showToast('Delete action failed', 'error'); }
  };

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Settings Menu bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings Configuration Center</h2>
          <p className="text-sm text-gray-500 mt-1">Configure layout visuals, dynamic sliders, FAQ answers, SMTP mailing servers, and notification templates.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'general' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <Globe className="w-4 h-4" /> General Website
          </button>
          <button 
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'smtp' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <Mail className="w-4 h-4" /> SMTP Settings
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'templates' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <Settings className="w-4 h-4" /> Email Templates
          </button>
          <button 
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'faqs' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <HelpCircle className="w-4 h-4" /> FAQs List
          </button>
          <button 
            onClick={() => setActiveTab('testimonials')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'testimonials' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <MessageSquare className="w-4 h-4" /> Testimonials
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'gallery' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-750 text-gray-600 dark:text-slate-350 hover:bg-gray-200'}`}
          >
            <Image className="w-4 h-4" /> Banners & Gallery
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: GENERAL WEBSITE */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-white border-b pb-2 flex items-center gap-1.5"><Globe className="w-4.5 h-4.5 text-emerald-600" /> Homepage Info & Typography</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Hero Title Banner</label>
                  <input 
                    type="text" 
                    value={webSettings.hero_title || ''} 
                    onChange={e => setWebSettings({ ...webSettings, hero_title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Hero Subtitle</label>
                  <input 
                    type="text" 
                    value={webSettings.hero_subtitle || ''} 
                    onChange={e => setWebSettings({ ...webSettings, hero_subtitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Contact Email</label>
                  <input 
                    type="email" 
                    value={webSettings.contact_email || ''} 
                    onChange={e => setWebSettings({ ...webSettings, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Contact Phone</label>
                  <input 
                    type="text" 
                    value={webSettings.contact_phone || ''} 
                    onChange={e => setWebSettings({ ...webSettings, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Contact Address</label>
                  <input 
                    type="text" 
                    value={webSettings.contact_address || ''} 
                    onChange={e => setWebSettings({ ...webSettings, contact_address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">WhatsApp Direct Link Number</label>
                  <input 
                    type="text" 
                    value={webSettings.whatsapp || ''} 
                    onChange={e => setWebSettings({ ...webSettings, whatsapp: e.target.value })}
                    placeholder="919552210333"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-655 dark:text-slate-300 mb-1">Google Maps Embed URL</label>
                  <input 
                    type="text" 
                    value={webSettings.google_map_embed || ''} 
                    onChange={e => setWebSettings({ ...webSettings, google_map_embed: e.target.value })}
                    placeholder="https://google.com/maps/embed/..."
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" disabled={submitting} className="btn-premium py-2.5 px-6 flex items-center gap-1.5 rounded-xl font-bold">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save General Configuration
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SMTP SETTINGS */}
          {activeTab === 'smtp' && (
            <form onSubmit={handleSaveSmtp} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-white border-b pb-2 flex items-center gap-1.5"><Mail className="w-4.5 h-4.5 text-emerald-600" /> SMTP Mailer Server Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">SMTP Server Hostname</label>
                  <input 
                    type="text" 
                    value={smtpSettings.smtp_host || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    placeholder="smtp.mailtrap.io"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">SMTP Server Port</label>
                  <input 
                    type="text" 
                    value={smtpSettings.smtp_port || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                    placeholder="2525"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">SMTP Server Username</label>
                  <input 
                    type="text" 
                    value={smtpSettings.smtp_user || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">SMTP Server Password</label>
                  <input 
                    type="password" 
                    value={smtpSettings.smtp_pass || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">System Sender Email Address</label>
                  <input 
                    type="email" 
                    value={smtpSettings.smtp_sender || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, smtp_sender: e.target.value })}
                    placeholder="no-reply@repairsystem.com"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" disabled={submitting} className="btn-premium py-2.5 px-6 flex items-center gap-1.5 rounded-xl font-bold">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save SMTP Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EMAIL TEMPLATES */}
          {activeTab === 'templates' && (
            <form onSubmit={handleSaveSmtp} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-white border-b pb-2 flex items-center gap-1.5"><Settings className="w-4.5 h-4.5 text-emerald-600" /> System Notification Email Templates</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Welcome Email Template (Variables: {'{name}'})</label>
                  <textarea 
                    value={smtpSettings.welcome_email_template || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, welcome_email_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700 font-mono text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Payment confirmation Receipt Email (Variables: {'{name}, {course_title}'})</label>
                  <textarea 
                    value={smtpSettings.payment_email_template || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, payment_email_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700 font-mono text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Course Approval Email (Variables: {'{name}, {course_title}'})</label>
                  <textarea 
                    value={smtpSettings.course_approval_email_template || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, course_approval_email_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700 font-mono text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-650 dark:text-slate-300 mb-1">Password Reset OTP Email (Variables: {'{name}, {temp_password}'})</label>
                  <textarea 
                    value={smtpSettings.reset_password_email_template || ''} 
                    onChange={e => setSmtpSettings({ ...smtpSettings, reset_password_email_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700 font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" disabled={submitting} className="btn-premium py-2.5 px-6 flex items-center gap-1.5 rounded-xl font-bold">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save Email Templates
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: FAQS */}
          {activeTab === 'faqs' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5"><HelpCircle className="w-4.5 h-4.5 text-emerald-600" /> FAQ Configuration Blocks</h3>
                <button onClick={addFaq} className="btn-premium py-1.5 px-3 flex items-center gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 border rounded-xl space-y-2 relative bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-700">
                    <button 
                      onClick={() => deleteFaq(idx)} 
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Question {idx + 1}</label>
                      <input 
                        type="text" 
                        value={faq.q} 
                        onChange={e => updateFaq(idx, 'q', e.target.value)}
                        placeholder="e.g. Do you support iMac repairs?"
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Answer</label>
                      <textarea 
                        value={faq.a} 
                        onChange={e => updateFaq(idx, 'a', e.target.value)}
                        placeholder="e.g. Yes, we support complete logic card IC replacements for iMac..."
                        rows={2}
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                      />
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && <p className="text-center text-slate-400 py-6">No FAQs configured yet.</p>}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={handleSaveFaqs} disabled={submitting} className="btn-premium py-2.5 px-6 flex items-center gap-1.5 rounded-xl font-bold">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save FAQs Configuration
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TESTIMONIALS */}
          {activeTab === 'testimonials' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5"><MessageSquare className="w-4.5 h-4.5 text-emerald-600" /> Customer Testimonials Configurations</h3>
                <button onClick={addTestimonial} className="btn-premium py-1.5 px-3 flex items-center gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Testimonial
                </button>
              </div>

              <div className="space-y-4">
                {testimonials.map((test, idx) => (
                  <div key={idx} className="p-4 border rounded-xl space-y-2 relative bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-700">
                    <button 
                      onClick={() => deleteTestimonial(idx)} 
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Author Name</label>
                        <input 
                          type="text" 
                          value={test.name} 
                          onChange={e => updateTestimonial(idx, 'name', e.target.value)}
                          placeholder="e.g. Ramesh Patil"
                          className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Role / Subtitle</label>
                        <input 
                          type="text" 
                          value={test.role} 
                          onChange={e => updateTestimonial(idx, 'role', e.target.value)}
                          placeholder="e.g. Student - Course Completed"
                          className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Review Feedback Comment</label>
                      <textarea 
                        value={test.comment} 
                        onChange={e => updateTestimonial(idx, 'comment', e.target.value)}
                        placeholder="e.g. The advanced chip soldering classes were highly informative..."
                        rows={2}
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none dark:bg-slate-900 dark:border-slate-700" 
                      />
                    </div>
                  </div>
                ))}
                {testimonials.length === 0 && <p className="text-center text-slate-400 py-6">No testimonials configured yet.</p>}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={handleSaveTestimonials} disabled={submitting} className="btn-premium py-2.5 px-6 flex items-center gap-1.5 rounded-xl font-bold">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save Testimonials
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: GALLERY & SLIDERS */}
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              
              {/* GALLERY MANAGEMENT */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5"><Image className="w-4.5 h-4.5 text-emerald-600" /> Homepage Gallery</h3>
                  <label className="btn-premium py-1.5 px-3 flex items-center gap-1 text-xs cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => { if (e.target.files[0]) handleUploadGallery(e.target.files[0]); }} 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                  {gallery.map((photo, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                      <img src={photo.photo_path} alt={photo.title} className="w-full h-24 object-cover" />
                      <button 
                        onClick={() => handleDeleteGallery(photo.id)} 
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-700 text-white rounded-full transition shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {gallery.length === 0 && <p className="text-center text-slate-450 col-span-2 py-8">No photos uploaded.</p>}
                </div>
              </div>

              {/* SLIDERS MANAGEMENT */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5"><Image className="w-4.5 h-4.5 text-emerald-600" /> Carousel Sliders</h3>
                  <label className="btn-premium py-1.5 px-3 flex items-center gap-1 text-xs cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Upload Slider
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => { if (e.target.files[0]) handleUploadSlider(e.target.files[0]); }} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {sliders.map((slider, i) => (
                    <div key={i} className="relative group border dark:border-slate-700 rounded-xl overflow-hidden flex shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
                      <img src={slider.image_path} alt={slider.title} className="w-20 h-20 object-cover" />
                      <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                        <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{slider.title || 'Slider Banner'}</p>
                        <p className="text-xs text-slate-450 dark:text-slate-450 mt-0.5 truncate">Display Order: {slider.display_order}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteSlider(slider.id)} 
                        className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-500 rounded-full transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {sliders.length === 0 && <p className="text-center text-slate-450 py-8">No banner slides created.</p>}
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
