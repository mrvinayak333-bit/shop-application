const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

/**
 * 🚀 SUPABASE INITIALIZATION & VERIFICATION
 */
async function checkSupabase() {
  console.log('\n--- 🛠️ SRM SUPABASE DATABASE VERIFICATION ---');

  const tables = [
    'master_users', 'admins', 'technicians', 'customers', 'students',
    'repair_requests', 'repair_status', 'quotations', 'invoices',
    'courses', 'course_enrollments', 'settings', 'notifications',
    'laptop_repairs', 'commission_ledger', 'activity_logs'
  ];

  let missingTables = [];

  console.log(`⏳ Checking ${tables.length} tables in public schema...`);

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
        missingTables.push(table);
      }
    } catch (e) {
      missingTables.push(table);
    }
  }

  if (missingTables.length === 0) {
    console.log('✅ ALL TABLES DETECTED! Database is ready.');
  } else {
    console.log(`\n⚠️ Missing Tables (${missingTables.length}):`);
    console.log(missingTables.join(', '));
    console.log('\n--- 📋 NEXT STEPS (ACTION REQUIRED) ---');
    console.log('1. Go to: https://supabase.com/dashboard/project/rikdfuplqxpquzztyqwv/sql');
    console.log('2. Click "New Query"');
    console.log('3. Open your local file: database/PROD_SCHEMA.sql');
    console.log('4. Copy ALL content and paste it into the Supabase SQL Editor');
    console.log('5. Click "RUN"');
    console.log('6. Refresh this script to verify.');
  }

  // Check Master Admin
  try {
    const { data: master } = await supabase.from('master_users').select('id').eq('email', 'mr.vinayak333@gmail.com');
    if (!master?.length) {
      console.log('\n👤 Master Account: Not found (Will be auto-created on server start)');
    } else {
      console.log('\n👤 Master Account: Verified (mr.vinayak333@gmail.com)');
    }
  } catch (e) {}

  console.log('\n------------------------------------------\n');
  process.exit(0);
}

checkSupabase().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
