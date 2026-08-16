const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://rikdfuplqxpquzztyqwv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpa2RmdXBscXhwcXV6enR5cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzg2NDUsImV4cCI6MjA1NTc1NDY0NX0.01wM8c2N-J4XmC4zT7Jk-f57p8_z2h9kX4n59_m7L8c';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
