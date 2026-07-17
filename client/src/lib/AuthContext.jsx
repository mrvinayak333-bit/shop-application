import { createContext, useContext, useState, useEffect } from 'react';
import api, { fetchProfileByEmail } from './api';
import { supabase } from './supabase';
import { Device } from '@capacitor/device';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Supabase Auth Session
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await fetchProfileByEmail(session.user.email);
          if (profile) {
            setUser(profile);
            localStorage.setItem('token', session.access_token);
            localStorage.setItem('user', JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        setLoading(false);
      }
    }
    
    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await fetchProfileByEmail(session.user.email);
        if (profile) {
          setUser(profile);
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } else {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password, role, mobileOrStudentId = null) => {
    let loginData = { password, role };
    
    if (role === 'customer' && mobileOrStudentId) {
      loginData.mobile = mobileOrStudentId;
    } else if (role === 'student' && mobileOrStudentId) {
      loginData.studentId = mobileOrStudentId;
      
      // Course Security: Get Android device ID, fall back to persistent browser UUID
      let deviceId = null;
      try {
        const info = await Device.getId();
        deviceId = info.identifier;
      } catch (e) {
        // Fallback for web browser testing
        deviceId = localStorage.getItem('srms_device_id');
        if (!deviceId) {
          deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
          localStorage.setItem('srms_device_id', deviceId);
        }
      }
      loginData.deviceId = deviceId;
    } else if (email) {
      loginData.email = email;
    }
    
    try {
      const res = await api.post('/auth/login', loginData);
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setUser(res.user);
      }
      return res;
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase signout failed', e);
    }
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
