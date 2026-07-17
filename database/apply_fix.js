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

    const sqlPath = path.join(__dirname, 'fix_postgres_triggers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Applying Postgres Triggers for updated_at...');
    await client.query(sql);
    console.log('🎉 Triggers applied successfully!');

  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
