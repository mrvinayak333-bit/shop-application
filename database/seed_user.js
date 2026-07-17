const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const dbPassword = 'vinayak@1233';
  const config = {
    host: 'db.rikdfuplqxpquzztyqwv.supabase.co',
    port: 5432,
    user: 'postgres',
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected!');

    const email = 'vinayakk1420@gmail.com';
    const plainPassword = '123456';
    const hashedPassword = bcrypt.hashSync(plainPassword, 10);
    const userId = uuidv4();

    // 1. Insert into auth.users (Supabase Auth) if not already exists
    const checkAuth = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (checkAuth.rows.length === 0) {
      console.log('Inserting into auth.users...');
      const insertAuthQuery = `
        INSERT INTO auth.users (
          id,
          instance_id,
          email,
          encrypted_password,
          email_confirmed_at,
          role,
          aud,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        ) VALUES (
          $1,
          '00000000-0000-0000-0000-000000000000',
          $2,
          $3,
          NOW(),
          'authenticated',
          'authenticated',
          '{"provider":"email","providers":["email"]}',
          '{"role":"master","name":"Vinayak"}',
          NOW(),
          NOW()
        );
      `;
      await client.query(insertAuthQuery, [userId, email, hashedPassword]);
      console.log('✅ Inserted into auth.users!');
    } else {
      console.log('ℹ️ User already exists in auth.users');
    }

    // 2. Insert into public.master_users if not already exists
    const checkPublic = await client.query('SELECT id FROM public.master_users WHERE email = $1', [email]);
    if (checkPublic.rows.length === 0) {
      console.log('Inserting into public.master_users...');
      // Get a free ID for public.master_users
      const maxIdRes = await client.query('SELECT MAX(id) FROM public.master_users');
      const nextId = (maxIdRes.rows[0].max || 0) + 1;
      
      const insertPublicQuery = `
        INSERT INTO public.master_users (
          id,
          name,
          email,
          password,
          mobile
        ) VALUES ($1, $2, $3, $4, $5);
      `;
      await client.query(insertPublicQuery, [nextId, 'Vinayak', email, hashedPassword, '919552210333']);
      console.log('✅ Inserted into public.master_users!');
    } else {
      console.log('ℹ️ User already exists in public.master_users');
      
      // Update password hash in case it was changed
      console.log('Updating password hash in public.master_users...');
      await client.query('UPDATE public.master_users SET password = $1 WHERE email = $2', [hashedPassword, email]);
      
      // Also update in auth.users
      console.log('Updating password hash in auth.users...');
      await client.query('UPDATE auth.users SET encrypted_password = $1 WHERE email = $2', [hashedPassword, email]);
      console.log('✅ Updated password hashes!');
    }

  } catch (err) {
    console.error('❌ Error during seeding:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
