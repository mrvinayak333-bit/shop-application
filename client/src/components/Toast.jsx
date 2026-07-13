import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in ${t.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {t.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}
