const db = require('../config/db');

async function test() {
  console.log('--- 🧪 SRM SUPABASE ADAPTER TEST ---');
  try {
    console.log('Testing SELECT on master_users...');
    const [rows] = await db.query('SELECT * FROM master_users WHERE email = ?', ['mr.vinayak333@gmail.com']);

    if (rows && rows.length > 0) {
      console.log('✅ Success! Found Master User:', rows[0].name);
    } else {
      console.log('❌ Failed: Master User not found in database.');
    }

    console.log('\nTesting table count...');
    const [settings] = await db.query('SELECT COUNT(*) as count FROM settings');
    console.log('✅ Settings table count retrieved:', settings[0]?.count);

  } catch (err) {
    console.error('❌ Adapter Test Failed:', err.message);
  } finally {
    process.exit();
  }
}

test();
