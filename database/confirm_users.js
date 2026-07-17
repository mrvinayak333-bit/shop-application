const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const password = 'vinayak@1233';
  const config = {
    host: 'db.rikdfuplqxpquzztyqwv.supabase.co',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);
  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('⏳ Confirming users in auth.users...');
    const res = await client.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL");
    console.log(`🎉 Done! Confirmed ${res.rowCount} users in auth.users.`);

    const { rows } = await client.query("SELECT id, email, email_confirmed_at FROM auth.users");
    console.log('\nCurrent Auth Users:');
    console.log(rows);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
