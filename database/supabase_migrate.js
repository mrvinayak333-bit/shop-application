const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * SUPABASE SCHEMA MIGRATOR
 * Connects directly to Supabase PostgreSQL and applies the schema.
 */
async function migrate() {
  const dbConfig = {
    host: process.env.DB_HOST || 'db.rikdfuplqxpquzztyqwv.supabase.co',
    port: 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'VINAYAK@333',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  console.log('--- 🚀 SUPABASE DATABASE MIGRATION ---');
  console.log('Target Host:', dbConfig.host);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL!');

    const schemaPath = path.join(__dirname, 'PROD_SCHEMA.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('PROD_SCHEMA.sql not found in database/ folder');
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Applying schema (41 tables + seed data)...');
    // Split by semicolon but handle potential issues with stored procedures or complex statements
    // For simplicity and robustness, we run it as one large block if PostgreSQL supports it (it does)
    await client.query(sql);

    console.log('🎉 Migration successful! All tables created.');

    // List tables for verification
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\nVerified Tables (${rows.length}):`);
    console.log(rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.log('HINT: Please set the correct DB_PASSWORD in your .env file.');
    }
  } finally {
    await client.end();
    process.exit();
  }
}

migrate();
