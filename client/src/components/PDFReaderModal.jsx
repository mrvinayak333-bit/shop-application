import { useState, useEffect } from 'react';
import {
  FileText, X, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ExternalLink, RotateCw, BookOpen, Sun, Moon, Shield,
  CheckCircle, ArrowLeft, Download, Eye, Sparkles
} from 'lucide-react';
import { getApiBase } from '../lib/api';
import ToastContainer, { showToast } from '../components/Toast';

// Helper to build clean URL for uploaded file
function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return cleanPath;
}

export default function PDFReaderModal({ pdfItem, onClose, onMarkComplete }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerTheme, setReaderTheme] = useState('dark'); // 'dark' | 'light' | 'sepia'
  const [isProtected, setIsProtected] = useState(false);

  if (!pdfItem) return null;

  const pdfUrl = getFileUrl(pdfItem.file_path || pdfItem.pdf_path || pdfItem.url);

  // Anti-Screenshot & DRM Security Hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p') ||
        (e.metaKey && e.shiftKey && ['3', '4', '5', 'S', 's'].includes(e.key))
      ) {
        e.preventDefault();
        setIsProtected(true);
        showToast('Screenshots and printing are restricted on course PDFs.', 'error');
        setTimeout(() => setIsProtected(false), 3000);
      }
    };
    const handleBlur = () => setIsProtected(true);
    const handleFocus = () => setIsProtected(false);
    const handleContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const themeStyles = {
    dark: {
      bg: 'bg-zinc-950',
      headerBg: 'bg-zinc-900 border-zinc-800 text-white',
      toolbarBg: 'bg-zinc-900/90 border-zinc-800 text-zinc-200',
      viewerBg: 'bg-zinc-900',
    },
    light: {
      bg: 'bg-slate-200',
      headerBg: 'bg-white border-slate-200 text-slate-900',
      toolbarBg: 'bg-white/90 border-slate-200 text-slate-800',
      viewerBg: 'bg-slate-100',
    },
    sepia: {
      bg: 'bg-amber-100',
      headerBg: 'bg-amber-50 border-amber-200 text-amber-950',
      toolbarBg: 'bg-amber-50/90 border-amber-200 text-amber-900',
      viewerBg: 'bg-amber-50',
    },
  }[readerTheme];

  return (
    <div className={`fixed inset-0 z-[9999] ${themeStyles.bg} flex flex-col font-sans select-none overflow-hidden`}>
      {/* DRM Protection Overlay */}
      {isProtected && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl max-w-md shadow-2xl space-y-3">
            <Shield className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-500">🚫 Protected PDF Reader</h2>
            <p className="text-zinc-300 text-xs">Screenshots, printing, and window switching are restricted while reading course PDFs.</p>
            <p className="text-[10px] text-zinc-500">Click on this window to resume reading.</p>
          </div>
        </div>
      )}

      {/* Reader Top Navigation Bar */}
      <div className={`px-4 md:px-6 py-3 border-b ${themeStyles.headerBg} flex items-center justify-between gap-4 shadow-sm shrink-0 sticky top-0 z-20`}>
        {/* Left Side: Title & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/40 text-current text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>Close Reader</span>
          </button>

          <div className="h-5 w-px bg-current/10 hidden sm:block" />

          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-black truncate">{pdfItem.title || pdfItem.course_name || 'PDF Study Material'}</h2>
            <p className="text-[11px] opacity-70 truncate">
              {pdfItem.course_name ? `${pdfItem.course_name} • ` : ''}{pdfItem.topic_name || 'Course Notes'}
            </p>
          </div>
        </div>

        {/* Right Side: Theme & Completion Controls */}
        <div className="flex items-center gap-3">
          {/* Reader Theme Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-current/5 p-1 rounded-xl border border-current/10">
            {[
              { id: 'dark', label: 'Dark' },
              { id: 'light', label: 'Light' },
              { id: 'sepia', label: 'Sepia' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setReaderTheme(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${readerTheme === t.id ? 'bg-emerald-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Mark Complete Button */}
          {onMarkComplete && (
            <button
              onClick={() => onMarkComplete(pdfItem.id, pdfItem.completed === 1)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${pdfItem.completed === 1 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{pdfItem.completed === 1 ? 'Completed' : 'Mark Completed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Reader Floating Controls Toolbar */}
      <div className={`mx-auto my-2 px-4 py-2 rounded-2xl border ${themeStyles.toolbarBg} shadow-lg flex items-center justify-between gap-6 z-10 text-xs w-11/12 max-w-2xl`}>
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Zoom:</span>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-current/5 hover:bg-current/10 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold w-12 text-center">{zoomLevel}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-current/5 hover:bg-current/10 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="text-[10px] font-bold px-2 py-1 rounded-md bg-current/10 hover:bg-current/20 transition"
          >
            Reset
          </button>
        </div>

        {/* Security Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" /> View Only DRM Protected
        </div>
      </div>

      {/* Main Interactive PDF Frame Container */}
      <div className={`flex-1 p-2 md:p-4 overflow-auto flex items-center justify-center ${themeStyles.viewerBg}`}>
        {pdfUrl ? (
          <div
            className="w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 border border-current/10"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              key={pdfUrl}
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              title={pdfItem.title || 'PDF Book'}
              className="w-full h-full bg-white"
              style={{ minHeight: 'calc(100vh - 160px)' }}
            />
          </div>
        ) : (
          <div className="text-center p-12 space-y-3">
            <FileText className="w-12 h-12 text-zinc-500 mx-auto" />
            <h3 className="text-base font-bold text-zinc-400">PDF File Unavailable</h3>
            <p className="text-xs text-zinc-500">The PDF file link for this study material could not be found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
