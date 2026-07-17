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

    const sql = `
      -- 1. Create or replace the password synchronization trigger function
      CREATE OR REPLACE FUNCTION public.sync_auth_password()
      RETURNS TRIGGER AS $$
      DECLARE
        target_email VARCHAR;
      BEGIN
        IF OLD.password IS DISTINCT FROM NEW.password THEN
          target_email := NEW.email;
          
          -- Resolve virtual emails if the table is customers/students and email is null
          IF target_email IS NULL OR target_email = '' THEN
            IF TG_TABLE_NAME = 'customers' THEN
              target_email := 'customer_' || NEW.mobile || '@srms.com';
            ELSIF TG_TABLE_NAME = 'students' THEN
              target_email := 'student_' || LOWER(NEW.student_id) || '@student.srms.com';
            END IF;
          END IF;

          IF target_email IS NOT NULL AND target_email <> '' THEN
            UPDATE auth.users 
            SET encrypted_password = NEW.password 
            WHERE email = target_email;
            
            RAISE NOTICE 'Synchronized password for email: %', target_email;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- 2. Drop existing triggers and create new ones
      DROP TRIGGER IF EXISTS sync_customers_password ON public.customers;
      CREATE TRIGGER sync_customers_password
        AFTER UPDATE ON public.customers
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_password();

      DROP TRIGGER IF EXISTS sync_admins_password ON public.admins;
      CREATE TRIGGER sync_admins_password
        AFTER UPDATE ON public.admins
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_password();

      DROP TRIGGER IF EXISTS sync_technicians_password ON public.technicians;
      CREATE TRIGGER sync_technicians_password
        AFTER UPDATE ON public.technicians
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_password();

      DROP TRIGGER IF EXISTS sync_students_password ON public.students;
      CREATE TRIGGER sync_students_password
        AFTER UPDATE ON public.students
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_password();

      DROP TRIGGER IF EXISTS sync_master_password ON public.master_users;
      CREATE TRIGGER sync_master_password
        AFTER UPDATE ON public.master_users
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_password();
    `;

    console.log('⏳ Creating password synchronization triggers...');
    await client.query(sql);
    console.log('🎉 Password synchronization triggers successfully set up!');

  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

run();
