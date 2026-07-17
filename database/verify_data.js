const supabase = require('../config/supabase');

async function verify() {
  console.log('--- 📊 SUPABASE DATA VERIFICATION ---');

  const tables = ['master_users', 'admins', 'technicians', 'customers', 'students', 'courses', 'settings'];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  }

  console.log('\n--- 🔑 MASTER ADMIN CHECK ---');
  const { data: masters } = await supabase.from('master_users').select('name, email').eq('email', 'mr.vinayak333@gmail.com');
  if (masters?.length) {
    console.log(`✅ Master Admin Found: ${masters[0].name} (${masters[0].email})`);
  } else {
    console.log('❌ Master Admin NOT FOUND');
  }

  process.exit();
}

verify();
