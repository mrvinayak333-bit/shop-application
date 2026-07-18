const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://rikdfuplqxpquzztyqwv.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_nMyeGHQc5hsvc3DrInvrJQ_-AWGv_Yf';

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Testing Supabase signInWithPassword for: vinayakk1420@gmail.com...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'vinayakk1420@gmail.com',
      password: '123456'
    });

    if (error) {
      console.error('❌ Auth Login Failed:', error.message);
    } else {
      console.log('✅ Auth Login Successful!');
      console.log('User ID:', data.user.id);
      console.log('Session Access Token:', data.session.access_token.substring(0, 15) + '...');
    }
  } catch (err) {
    console.error('🔥 Unexpected error during login test:', err.message);
  }
  process.exit();
}

run();
