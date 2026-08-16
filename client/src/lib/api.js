import { Capacitor } from '@capacitor/core';
import { handleOfflineRequest } from './offlineDb';

export function getApiBase() {
  const configuredBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (configuredBase) {
    let base = configuredBase.trim().replace(/\/$/, '');
    if (!base.endsWith('/api') && !base.includes('/api/')) {
      base += '/api';
    }
    return base;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (Capacitor.isNativePlatform()) {
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'capacitor') {
        return 'http://10.0.2.2:5000/api';
      }
      return `http://${host}:5000/api`;
    }
    if (host.includes('pages.dev') || host.includes('cloudflare') || host.includes('onrender.com') || host.includes('vercel.app') || host.includes('netlify.app')) {
      if (!host.startsWith('srm-mobaile-fixit.')) {
        return 'https://srm-mobaile-fixit.onrender.com/api';
      }
    }
  }

  return '/api';
}

const API_BASE = getApiBase();

async function executeFetch(targetUrl, options, headers) {
  const res = await fetch(targetUrl, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let data;

  const text = await res.text();
  const trimmed = (text || '').trim();

  if (!trimmed) {
    data = {};
  } else if (contentType.includes('application/json')) {
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      data = { success: false, message: 'Invalid JSON response from server' };
    }
  } else {
    data = { success: false, message: `Server error (${res.status}). Received non-JSON response.` };
  }

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined' && window.location.pathname !== '/' && !window.location.pathname.startsWith('/login/')) {
      window.location.href = '/';
    }
  }

  if (typeof data === 'object' && data !== null) {
    if (data.success === undefined) {
      data.success = res.status >= 200 && res.status < 300;
    }
  }

  return data;
}

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const parseBody = () => {
    if (!options.body) return null;
    if (typeof options.body === 'string') {
      try { return JSON.parse(options.body); } catch (e) { return options.body; }
    }
    return options.body;
  };

  // Standalone Native APK OR Offline -> Serve 100% locally from Offline DB
  if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && !window.navigator.onLine)) {
    return handleOfflineRequest(url, options.method || 'GET', parseBody(), headers);
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const primaryUrl = `${API_BASE}${cleanPath}`;

  try {
    const res = await executeFetch(primaryUrl, options, headers);
    if (!res.success && res.message && (res.message.includes('Network error') || res.message.includes('Failed to fetch') || res.message.includes('Server error'))) {
      return handleOfflineRequest(url, options.method || 'GET', parseBody(), headers);
    }
    return res;
  } catch (error) {
    console.warn(`API request to ${primaryUrl} failed. Switching to Standalone Offline DB Engine:`, error.message);
    return handleOfflineRequest(url, options.method || 'GET', parseBody(), headers);
  }
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined }),
  put: (url, body) => request(url, { method: 'PUT', body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};

export default api;
