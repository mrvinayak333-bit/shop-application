import { createContext, useContext, useState, useEffect } from 'react';
import { fetchProfileByEmail } from './api';
import { supabase } from './supabase';
import { Device } from '@capacitor/device';
import bcrypt from 'bcryptjs';

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
    let authEmail = email;
    
    // Resolve email for customer/student
    if (role === 'customer' && mobileOrStudentId) {
      authEmail = `customer_${mobileOrStudentId}@srms.com`;
      const { data: cData } = await supabase.from('customers').select('email').eq('mobile', mobileOrStudentId);
      if (cData && cData[0]?.email) {
        authEmail = cData[0].email;
      }
    } else if (role === 'student' && mobileOrStudentId) {
      authEmail = `student_${mobileOrStudentId.toLowerCase()}@student.srms.com`;
      const { data: sData } = await supabase.from('students').select('email').eq('student_id', mobileOrStudentId);
      if (sData && sData[0]?.email) {
        authEmail = sData[0].email;
      }
    }

    try {
      console.log(`[Auth] Attempting login for ${authEmail} (Role: ${role})`);
      
      // Check status of user in public profile first
      const profile = await fetchProfileByEmail(authEmail);
      if (!profile) {
        return { success: false, message: 'Invalid credentials or account inactive' };
      }

      if (profile.role !== role) {
        console.warn(`[Auth] Role mismatch for login: expected ${role}, got ${profile.role}`);
        return { success: false, message: 'Invalid credentials or role mismatch' };
      }

      if (profile.status === 'inactive') {
        console.warn(`[Auth] Inactive account tried to login: ${authEmail}`);
        return { success: false, message: 'Account is inactive' };
      }

      // If it's a student, perform device binding check
      let deviceId = null;
      if (role === 'student') {
        try {
          const info = await Device.getId();
          deviceId = info.identifier;
        } catch (e) {
          deviceId = localStorage.getItem('srms_device_id');
          if (!deviceId) {
            deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
            localStorage.setItem('srms_device_id', deviceId);
          }
        }

        if (profile) {
          if (profile.device_id && profile.device_id !== deviceId) {
            console.warn(`[Auth] Device ID mismatch for student: ${profile.student_id}`);
            return { success: false, message: 'This account is bound to another device.' };
          }
        }
      }

      // Try signing in using Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password
      });

      if (error) {
        console.error('[Auth] Supabase Auth signInWithPassword error:', error.message);

        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'Email verification required. Please verify your email before logging in.' };
        }

        // FALLBACK FOR DISABLED EMAIL LOGIN PROVIDER:
        if (error.message.includes('Email logins are disabled') || error.message.includes('Email provider is disabled')) {
          console.warn('[Auth] Supabase Email provider is disabled. Falling back to local database credential check...');
          
          let isMatch = profile.password === password;
          if (!isMatch) {
            try {
              isMatch = bcrypt.compareSync(password, profile.password);
            } catch (err) {
              isMatch = false;
            }
          }
          // Special fallback for students where initial password is their student ID
          if (!isMatch && role === 'student' && profile.student_id === password) {
            isMatch = true;
          }

          if (isMatch) {
            console.log('[Auth] Local credential verification successful! Logging user in...');
            
            // Set mock token and user details locally
            const token = 'local_fallback_token_' + Math.random().toString(36).substring(2) + '_' + Date.now();
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(profile));
            setUser(profile);
            
            // Log login activity
            try {
              const table = role === 'master' ? 'master_users' : role === 'admin' ? 'admins' : role === 'technician' ? 'technicians' : role === 'student' ? 'students' : 'customers';
              await supabase.from(table).update({ last_login: new Date().toISOString() }).eq('id', profile.id);
              
              await supabase.from('activity_logs').insert({
                user_id: profile.id,
                user_role: role,
                action: 'LOGIN',
                description: `${role} logged in (local fallback due to disabled provider)`
              });
            } catch (err) {
              console.warn('Logging login activity failed:', err);
            }

            return { success: true, user: profile, token };
          } else {
            return { success: false, message: 'Invalid login credentials' };
          }
        }

        // DYNAMIC SIGNUP FALLBACK:
        // If the user exists in our public DB tables but not in Supabase Auth, dynamically sign them up
        if (profile && (error.message.includes('Invalid login credentials') || error.status === 400)) {
          console.log('[Auth] User exists in DB but not in Supabase Auth. Checking password...');
          
          let isMatch = profile.password === password;
          if (!isMatch) {
            try {
              isMatch = bcrypt.compareSync(password, profile.password);
            } catch (err) {
              isMatch = false;
            }
          }
          // Special fallback for students where initial password is their student ID
          if (!isMatch && role === 'student' && profile.student_id === password) {
            isMatch = true;
          }

          if (isMatch) {
            console.log('[Auth] Password verified successfully. Registering in Supabase Auth...');
            
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email: authEmail,
              password: password,
              options: {
                data: { role, name: profile.name }
              }
            });

            if (signUpErr) {
              console.error('[Auth] Dynamic signup error:', signUpErr.message);
              return { success: false, message: signUpErr.message };
            }

            // Bind student device ID if needed
            if (role === 'student' && !profile.device_id && deviceId) {
              await supabase.from('students').update({ device_id: deviceId }).eq('id', profile.id);
              profile.device_id = deviceId;
            }

            // Check if email confirmation is required
            if (signUpData.user && !signUpData.session) {
              return { success: false, message: 'Account registered in Supabase. Email verification is required. Please check your email to verify before logging in.' };
            }

            if (signUpData.session) {
              localStorage.setItem('token', signUpData.session.access_token);
              localStorage.setItem('user', JSON.stringify(profile));
              setUser(profile);
              return { success: true, user: profile, token: signUpData.session.access_token };
            }
          }
        }

        return { success: false, message: error.message };
      }

      // If signin is successful
      if (role === 'student' && !profile.device_id && deviceId) {
        // Bind the device ID now
        await supabase.from('students').update({ device_id: deviceId }).eq('id', profile.id);
        profile.device_id = deviceId;
      }

      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify(profile));
      setUser(profile);

      // Log login activity
      try {
        const table = role === 'master' ? 'master_users' : role === 'admin' ? 'admins' : role === 'technician' ? 'technicians' : role === 'student' ? 'students' : 'customers';
        await supabase.from(table).update({ last_login: new Date().toISOString() }).eq('id', profile.id);
        
        await supabase.from('activity_logs').insert({
          user_id: profile.id,
          user_role: role,
          action: 'LOGIN',
          description: `${role} logged in`
        });
      } catch (err) {
        console.warn('Logging login activity failed:', err);
      }

      return { success: true, user: profile, token: data.session.access_token };
    } catch (err) {
      console.error('[Auth] Unexpected login error:', err);
      return { success: false, message: err.message || 'An unexpected error occurred.' };
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
