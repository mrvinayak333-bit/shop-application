import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rikdfuplqxpquzztyqwv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nMyeGHQc5hsvc3DrInvrJQ_-AWGv_Yf';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing! Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
