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
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!');

    const schemaPath = path.join(__dirname, 'PROD_SCHEMA.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error('Schema file PROD_SCHEMA.sql not found');
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Creating all 41 tables and applying schema...');
    // The PROD_SCHEMA.sql uses CREATE TABLE IF NOT EXISTS and includes seed data.
    await client.query(sql);
    console.log('🎉 Schema applied successfully!');

    // Verification
    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log(`\nVerified Tables in Supabase Editor (${rows.length}):`);
    console.log(rows.map(r => r.table_name).join(', '));

    if (rows.length >= 41) {
        console.log('\n✅ All tables are now visible in your Supabase Dashboard!');
    } else {
        console.log(`\n⚠️ Only ${rows.length} tables found. Please check PROD_SCHEMA.sql for completeness.`);
    }

  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
