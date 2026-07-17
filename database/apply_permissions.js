const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
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
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!');

    const sqlPath = path.join(__dirname, 'fix_permissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Granting permissions to anon/authenticated roles...');
    await client.query(sql);
    console.log('🎉 Permissions granted successfully!');

  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
