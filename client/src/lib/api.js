import { Capacitor } from '@capacitor/core';

/**
 * RESOLVE API BASE URL
 * Intelligently determines the API endpoint based on platform and environment
 */
export function getApiBase() {
  // 1. Check if explicitly defined in VITE environment
  const configuredBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  // 2. Handle Native Android/iOS (Capacitor)
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    const host = window.location.hostname;
    // Android Emulator special host for localhost
    if (host === 'localhost' || host === '127.0.0.1' || host === 'capacitor') {
      return 'http://10.0.2.2:5000/api';
    }
    // Network deployment
    return `http://${host}:5000/api`;
  }

  // 3. Web Deployment (Render/Vercel/Cloudflare)
  // If we are on the same domain as the backend, use relative path
  if (typeof window !== 'undefined' && (window.location.hostname.includes('render.com') || window.location.hostname.includes('vercel.app'))) {
    return '/api';
  }

  // Default fallback for development
  return '/api';
};

const API_BASE = getApiBase();

/**
 * GENERIC REQUEST WRAPPER
 * Handles Authorization headers, JSON parsing, and automatic Logout on 401
 */
async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  // Attach JWT if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Default to JSON Content-Type
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Standardize URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;

  try {
    const res = await fetch(fullUrl, { ...options, headers });

    // Auto-Logout on Authorization failure
    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'AUTH_INVALID' || data.code === 'AUTH_REQUIRED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login only if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login/customer';
        }
      }
    }

    const contentType = res.headers.get('content-type') || '';

    // Parse Response
    if (contentType.includes('application/json')) {
      return await res.json();
    }

    return await res.text();

  } catch (error) {
    console.error('API Request Failure:', error);
    return {
      success: false,
      message: 'Connection failed. Please check if the server is running and try again.'
    };
  }
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url, body) => request(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};

export default api;
