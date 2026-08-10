import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, RotateCw, CheckCircle, Loader, RefreshCw,
  Shield, User, BookOpen, AlertCircle, Eye
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useAuth } from '../lib/AuthContext';
import api, { getApiBase } from '../lib/api';
import Navbar from '../components/Navbar';
import ToastContainer, { showToast } from '../components/Toast';

// Configure local worker bundled by Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Helper to format clean relative URL for in-app serving
function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return cleanPath;
}

export default function PDFReaderPage() {
  const { bookId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [useFallbackObject, setUseFallbackObject] = useState(false);
  
  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Security & Anti-Screenshot DRM
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

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'student') {
      navigate('/login/student');
      return;
    }
    loadBookDetails();
  }, [authLoading, isAuthenticated, user, bookId]);

  const loadBookDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    setUseFallbackObject(false);

    try {
      const res = await api.get(`/student/pdf-reader/${bookId}`);
      if (res && res.success && res.book) {
        setBook(res.book);
        loadPdfArrayBuffer(getFileUrl(res.book.file_path));
      } else {
        setErrorMsg(res?.message || 'PDF file is unavailable.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch book error:', err);
      setErrorMsg('Unable to open this PDF. Please try again.');
      setLoading(false);
    }
  };

  const loadPdfArrayBuffer = async (url) => {
    if (!url) {
      setErrorMsg('PDF file path is missing.');
      setLoading(false);
      return;
    }

    try {
      // Fetch PDF binary data directly to eliminate CORS/worker file load restrictions
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setPageNum(1);
      setLoading(false);
    } catch (err) {
      console.warn('PDF.js ArrayBuffer parse failed, attempting in-app fallback viewer:', err);
      // Fallback to in-app object element inside the page
      setUseFallbackObject(true);
      setLoading(false);
    }
  };

  // Render Current Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || useFallbackObject) return;
    let isCancelled = false;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Page render error:', err);
      } finally {
        if (!isCancelled) setRendering(false);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum, scale, rotation, useFallbackObject]);

  const handlePrevPage = () => setPageNum(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => {
    if (pageNum < totalPages) {
      const nextPage = pageNum + 1;
      setPageNum(nextPage);
      if (nextPage === totalPages && book && book.completed !== 1) {
        handleToggleComplete(true);
      }
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.2);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 60;
      setScale(Math.max(containerWidth / 600, 0.8));
    }
  };

  const handleToggleComplete = async (targetState) => {
    if (!book || savingProgress) return;
    const nextState = targetState !== undefined ? targetState : book.completed !== 1;
    setSavingProgress(true);

    try {
      const res = await api.post(`/student/course-item/${book.id}/complete`, { completed: nextState });
      if (res && res.success) {
        setBook(prev => ({ ...prev, completed: nextState ? 1 : 0 }));
        showToast(nextState ? 'PDF Book Completed! 🎉' : 'Marked incomplete', nextState ? 'success' : 'info');
      }
    } catch {
      showToast('Error updating progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm font-bold">Loading PDF Document in Application...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">{errorMsg}</h2>
            <p className="text-xs text-zinc-400">The PDF file URL may be unavailable or invalid.</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard/student')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={loadBookDetails}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pdfUrl = getFileUrl(book?.file_path);

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* DRM Protection Overlay */}
      {isProtected && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl max-w-md shadow-2xl space-y-3">
            <Shield className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-500">🚫 Content Protected</h2>
            <p className="text-zinc-300 text-xs">Screenshots, printing, and screen recording are disabled for course PDFs.</p>
            <p className="text-[10px] text-zinc-500">Click this window to resume study mode.</p>
          </div>
        </div>
      )}

      {/* Reader Header Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0">
        {/* Left Side: Back & Book Details */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard/student')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            title="Back to Student Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to Dashboard</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-black text-white truncate max-w-xs md:max-w-md flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">{book?.title}</span>
            </h1>
            <p className="text-[11px] text-zinc-400 truncate">
              {book?.course_name} • {book?.topic_name}
            </p>
          </div>
        </div>

        {/* Right Side: Student Info & Completion */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-zinc-200">{user?.name || 'Student'}</span>
          </div>

          <button
            onClick={() => handleToggleComplete()}
            disabled={savingProgress}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${book?.completed === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{book?.completed === 1 ? 'Read & Done' : 'Mark as Completed'}</span>
          </button>
        </div>
      </div>

      {/* Reader Controls Toolbar */}
      {!useFallbackObject && (
        <div className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-10">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pageNum <= 1}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs text-zinc-300 font-bold bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
              Page {pageNum} / {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={pageNum >= totalPages}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-bold text-zinc-300 w-12 text-center bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              {Math.round(scale * 100)}%
            </span>

            <button onClick={handleZoomIn} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>

            <button onClick={handleResetZoom} className="text-[10px] font-bold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition">
              100%
            </button>

            <button onClick={handleFitWidth} className="text-[10px] font-bold px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-sky-400 rounded-lg transition">
              Fit Width
            </button>

            <button onClick={handleRotate} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition" title="Rotate Page">
              <RotateCw className="w-4 h-4" />
            </button>

            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition" title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Main PDF Workspace Container */}
      <div className="flex-1 p-4 md:p-6 overflow-auto flex justify-center items-start bg-zinc-950 relative min-h-[calc(100vh-140px)]">
        {rendering && !useFallbackObject && (
          <div className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 shadow-lg z-20">
            <Loader className="w-3.5 h-3.5 animate-spin" /> Rendering Page...
          </div>
        )}

        {!useFallbackObject ? (
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-800 overflow-hidden transition-all duration-200 max-w-full">
            <canvas ref={canvasRef} className="block mx-auto" />
          </div>
        ) : (
          /* Fallback In-App Object Container */
          <div className="w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="bg-zinc-950 px-4 py-2 text-xs font-bold text-sky-400 border-b border-zinc-800 flex items-center gap-2">
              <Eye className="w-4 h-4" /> In-App PDF View Mode
            </div>
            <object
              data={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              type="application/pdf"
              className="w-full flex-1 min-h-[75vh]"
            >
              <div className="p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-400">PDF Reader container ready.</p>
              </div>
            </object>
          </div>
        )}
      </div>
    </div>
  );
}
