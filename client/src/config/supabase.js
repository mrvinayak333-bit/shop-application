import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rikdfuplqxpquzztyqwv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpa2RmdXBscXhwcXV6enR5cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzg2NDUsImV4cCI6MjA1NTc1NDY0NX0.01wM8c2N-J4XmC4zT7Jk-f57p8_z2h9kX4n59_m7L8c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
