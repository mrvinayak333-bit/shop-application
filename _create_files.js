const fs = require("fs");
const path = require("path");
const base = "C:\\Users\\New\\shop application\\client\\src";

const files = {};

// ===== lib/api.js =====
files[path.join(base, "lib", "api.js")] = `const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API_BASE + url, { ...options, headers });
  const data = await res.json();

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/') {
      window.location.href = '/login/technician';
    }
  }

  return data;
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url, body) => request(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};

export default api;
`;

// ===== lib/AuthContext.jsx =====
files[path.join(base, "lib", "AuthContext.jsx")] = `import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const res = await api.post('/auth/login', { email, password, role });
    if (res.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
`;

for (const [fp, content] of Object.entries(files)) {
  fs.writeFileSync(fp, content, "utf8");
  console.log("Written:", path.relative(base, fp));
}

console.log("\\nBatch 1 done. " + Object.keys(files).length + " files created.");
