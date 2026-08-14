import { Capacitor } from '@capacitor/core';

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
    // Native Capacitor mobile app host
    if (Capacitor.isNativePlatform()) {
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'capacitor') {
        return 'http://10.0.2.2:5000/api';
      }
      return `http://${host}:5000/api`;
    }
    // Render / Cloud static site fallback when VITE_API_URL is omitted
    if (host.includes('onrender.com') || host.includes('vercel.app') || host.includes('netlify.app')) {
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

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const primaryUrl = `${API_BASE}${cleanPath}`;

  try {
    return await executeFetch(primaryUrl, options, headers);
  } catch (error) {
    console.warn(`Primary API request to ${primaryUrl} failed:`, error.message);
    
    // Automatic fallback for local browser development if primary proxy/base fails
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      const fallbackUrl = primaryUrl.startsWith('/api') 
        ? `http://127.0.0.1:5000${cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`}`
        : `/api${cleanPath}`;

      try {
        console.log(`Retrying API call with fallback: ${fallbackUrl}`);
        return await executeFetch(fallbackUrl, options, headers);
      } catch (fallbackError) {
        console.error('Fallback API request failed:', fallbackError);
      }
    }

    return { success: false, message: 'Network error. Please check the server connection and try again.' };
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
