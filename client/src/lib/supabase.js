import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing! Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
