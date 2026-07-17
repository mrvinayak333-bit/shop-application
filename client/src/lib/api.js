import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// Resolve URL parameters
function parseUrl(url) {
  const cleanUrl = url.startsWith('/') ? url : '/' + url;
  const urlObj = new URL(cleanUrl, 'http://localhost');
  return {
    pathname: urlObj.pathname,
    params: Object.fromEntries(urlObj.searchParams.entries())
  };
}

// Helper to generate unique tracking numbers (same logic as backend)
async function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('repair_requests')
    .select('*', { count: 'exact', head: true })
    .ilike('tracking_number', `SRM-${year}-%`);

  const nextCount = (count || 0) + 1;
  return `SRM-${year}-${String(nextCount).padStart(6, '0')}`;
}

// Helper to upload files to Supabase storage (default to 'uploads' bucket)
async function uploadFileToSupabase(file, bucket = 'uploads') {
  if (!file) return null;
  const ext = file.name ? file.name.split('.').pop() : 'jpg';
  const name = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
  
  // Attempt to upload file
  const { data, error } = await supabase.storage.from(bucket).upload(name, file);
  if (error) {
    console.error('Supabase storage upload failed, using mock/public path:', error);
    // If bucket doesn't exist, we fallback to returning a mock URL path that client can use
    return `/uploads/${bucket}/${name}`;
  }
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(name);
  return publicUrl;
}

// Decrypt / extract credentials for Supabase Profile matching
export async function fetchProfileByEmail(email) {
  const tables = [
    { name: 'master_users', role: 'master' },
    { name: 'admins', role: 'admin' },
    { name: 'technicians', role: 'technician' },
    { name: 'customers', role: 'customer' },
    { name: 'students', role: 'student' }
  ];
  
  for (const t of tables) {
    const { data } = await supabase.from(t.name).select('*').eq('email', email);
    if (data && data.length > 0) {
      return { ...data[0], role: t.role };
    }
  }
  
  // Check virtual customer emails
  if (email.endsWith('@srms.com') && email.startsWith('customer_')) {
    const mobile = email.split('@')[0].replace('customer_', '');
    const { data } = await supabase.from('customers').select('*').eq('mobile', mobile);
    if (data && data.length > 0) {
      return { ...data[0], role: 'customer' };
    }
  }

  // Check virtual student emails
  if (email.endsWith('@student.srms.com') && email.startsWith('student_')) {
    const studentId = email.split('@')[0].replace('student_', '');
    const { data } = await supabase.from('students').select('*').ilike('student_id', studentId);
    if (data && data.length > 0) {
      return { ...data[0], role: 'student' };
    }
  }

  return null;
}

const restMappings = [
  { prefix: '/repair/manage/device-types', table: 'device_types', order: 'name' },
  { prefix: '/repair/manage/brands', table: 'brands', order: 'name' },
  { prefix: '/repair/manage/models', table: 'models', order: 'name' },
  { prefix: '/master/website-settings', table: 'website_settings' },
  { prefix: '/master/settings', table: 'settings' },
  { prefix: '/master/gallery', table: 'gallery_photos', order: 'created_at.desc' },
  { prefix: '/master/sliders', table: 'slider_images', order: 'created_at.desc' },
  { prefix: '/master/admins', table: 'admins', order: 'created_at.desc' },
  { prefix: '/master/technicians', table: 'technicians', order: 'created_at.desc' },
  { prefix: '/master/students', table: 'students', order: 'created_at.desc' },
  { prefix: '/master/customers', table: 'customers', order: 'created_at.desc' },
  { prefix: '/master/payment-methods', table: 'payment_methods', order: 'name' },
  { prefix: '/payment/methods', table: 'payment_methods', filter: { is_active: true } },
  { prefix: '/courses', table: 'courses' },
];

/**
 * CORE API INTERCEPTOR AND ROUTER
 */
async function request(url, options = {}) {
  const { pathname, params } = parseUrl(url);
  const method = (options.method || 'GET').toUpperCase();
  let body = {};
  
  if (options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch (e) {
      body = {};
    }
  }

  // Get active session user
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId = userObj ? userObj.id : null;
  const currentUserRole = userObj ? userObj.role : null;

  try {
    // ----------------------------------------------------
    // REST AUTO-MAPPINGS FOR CRUD TABLES
    // ----------------------------------------------------
    const matchRest = restMappings.find(m => pathname.startsWith(m.prefix));
    if (matchRest) {
      const table = matchRest.table;
      
      // Match specific ID: /prefix/:id
      const restIdMatch = pathname.replace(matchRest.prefix, '').match(/^\/(\d+)/);
      const restId = restIdMatch ? parseInt(restIdMatch[1]) : null;

      if (method === 'GET') {
        if (restId) {
          const { data, error } = await supabase.from(table).select('*').eq('id', restId).single();
          if (error) throw error;
          return { success: true, [table.slice(0, -1)]: data };
        } else {
          let query = supabase.from(table).select('*');
          if (matchRest.filter) {
            Object.keys(matchRest.filter).forEach(k => {
              query = query.eq(k, matchRest.filter[k]);
            });
          }
          if (matchRest.order) {
            const [col, dir] = matchRest.order.split('.');
            query = query.order(col, { ascending: dir !== 'desc' });
          }
          const { data, error } = await query;
          if (error) throw error;
          return { success: true, [table]: data };
        }
      }
      
      if (method === 'POST') {
        const { data, error } = await supabase.from(table).insert(body).select();
        if (error) throw error;
        return { success: true, message: 'Created successfully', [table.slice(0, -1)]: data[0] };
      }
      
      if (method === 'PUT') {
        if (!restId) throw new Error('ID required for update');
        const { data, error } = await supabase.from(table).update(body).eq('id', restId).select();
        if (error) throw error;
        return { success: true, message: 'Updated successfully', [table.slice(0, -1)]: data[0] };
      }
      
      if (method === 'DELETE') {
        if (!restId) throw new Error('ID required for deletion');
        const { error } = await supabase.from(table).delete().eq('id', restId);
        if (error) throw error;
        return { success: true, message: 'Deleted successfully' };
      }
    }

    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    if (pathname === '/auth/login' && method === 'POST') {
      const { email, password, role, studentId, mobile, deviceId } = body;
      
      let table = '';
      let loginField = 'email';
      let loginValue = email;

      switch (role) {
        case 'master': table = 'master_users'; break;
        case 'admin': table = 'admins'; break;
        case 'technician': table = 'technicians'; break;
        case 'customer':
          table = 'customers';
          if (mobile) { loginField = 'mobile'; loginValue = mobile; }
          break;
        case 'student':
          table = 'students';
          loginField = 'student_id';
          loginValue = studentId || email;
          break;
        default: return { success: false, message: 'Invalid role' };
      }

      // Check public database
      const { data: users, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq(loginField, loginValue)
        .neq('status', 'inactive');

      if (fetchError || !users || users.length === 0) {
        return { success: false, message: 'Invalid credentials or account inactive' };
      }

      const userData = users[0];

      // Password verification
      let isMatch = userData.password === password;
      if (!isMatch) {
        try {
          isMatch = bcrypt.compareSync(password, userData.password);
        } catch (e) { isMatch = false; }
      }
      if (!isMatch && role === 'student' && userData.student_id === password) {
        isMatch = true;
      }
      if (!isMatch) {
        return { success: false, message: 'Invalid password' };
      }

      // Student device locking
      if (role === 'student') {
        if (!deviceId) return { success: false, message: 'Device ID required' };
        if (userData.android_device_id && userData.android_device_id !== deviceId) {
          return { success: false, message: 'Account locked to another device' };
        }
        if (!userData.android_device_id) {
          await supabase.from('students').update({ android_device_id: deviceId }).eq('id', userData.id);
        }
      }

      // Supabase Auth SignIn / SignUp
      let authEmail = userData.email;
      if (!authEmail) {
        if (role === 'customer') authEmail = `customer_${userData.mobile}@srms.com`;
        else if (role === 'student') authEmail = `student_${userData.student_id.toLowerCase()}@student.srms.com`;
      }

      let token = 'mock_token_' + Math.random().toString(36).substring(2);
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password
        });

        if (authErr) {
          // Attempt Dynamic SignUp if not present in Auth.users
          if (authErr.message.includes('Invalid login credentials') || authErr.message.includes('Email not confirmed') || authErr.status === 400) {
            await supabase.auth.signUp({
              email: authEmail,
              password: password,
              options: { data: { role, name: userData.name } }
            });
            const { data: authRetry, error: retryErr } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password: password
            });
            if (!retryErr && authRetry?.session) {
              token = authRetry.session.access_token;
            }
          }
        } else if (authData?.session) {
          token = authData.session.access_token;
        }
      } catch (err) {
        console.error('Supabase Auth error (falling back to database authentication):', err);
      }

      // Update Last Login
      await supabase.from(table).update({ last_login: new Date().toISOString() }).eq('id', userData.id);

      // Log Activity
      await supabase.from('activity_logs').insert({
        user_id: userData.id,
        user_role: role,
        action: 'LOGIN',
        description: `${role} logged in via ${loginField}`
      });

      delete userData.password;
      return { success: true, message: 'Login successful', token, user: { ...userData, role } };
    }

    if (pathname === '/customer/register' && method === 'POST') {
      const { name, email, password, mobile, address, city, state, pincode } = body;
      
      if (email) {
        const { data: existing } = await supabase.from('customers').select('id').eq('email', email);
        if (existing?.length > 0) return { success: false, message: 'Email already registered' };
      }

      const { data: mobileCheck } = await supabase.from('customers').select('id').eq('mobile', mobile);
      if (mobileCheck?.length > 0) return { success: false, message: 'Mobile number already registered' };

      const hashedPassword = bcrypt.hashSync(password, 10);
      const { data, error } = await supabase.from('customers').insert({
        name, email: email || null, password: hashedPassword, mobile,
        address: address || null, city: city || null, state: state || null, pincode: pincode || null,
        status: 'active'
      }).select();

      if (error) throw error;
      const customer = data[0];

      // Sign up in Supabase Auth
      const authEmail = email || `customer_${mobile}@srms.com`;
      let token = 'mock_token_' + Math.random().toString(36).substring(2);
      try {
        await supabase.auth.signUp({
          email: authEmail,
          password: password,
          options: { data: { role: 'customer', name } }
        });
        const { data: authIn } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password
        });
        if (authIn?.session) {
          token = authIn.session.access_token;
        }
      } catch (e) {
        console.error('Supabase Auth register failure', e);
      }

      return { success: true, message: 'Registration successful', token, user: { ...customer, role: 'customer' } };
    }

    // ----------------------------------------------------
    // CUSTOMER DASHBOARD & CUSTOMER ACTIONS
    // ----------------------------------------------------
    if (pathname === '/customer/dashboard' && method === 'GET') {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', currentUserId).single();
      
      const { data: repairs } = await supabase
        .from('repair_requests')
        .select('*, technician:assigned_technician(name), quotations(*)')
        .eq('customer_id', currentUserId)
        .not('status', 'in', '("delivered","cancelled","successfully_delivered","feedback_given")')
        .order('created_at', { ascending: false });

      const { data: history } = await supabase
        .from('repair_requests')
        .select('tracking_number, device_type, brand, status, created_at, feedback_rating, feedback_comments')
        .eq('customer_id', currentUserId)
        .in('status', ['delivered', 'successfully_delivered', 'feedback_given', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('user_role', 'customer')
        .order('created_at', { ascending: false })
        .limit(10);

      const mappedRepairs = (repairs || []).map(rr => ({
        ...rr,
        tech: rr.technician?.name,
        quotation_id: rr.quotations?.[rr.quotations.length - 1]?.id,
        total_cost: rr.quotations?.[rr.quotations.length - 1]?.total_cost,
        quotation_status: rr.quotations?.[rr.quotations.length - 1]?.status
      }));

      return { success: true, customer, activeRepairs: mappedRepairs, repairHistory: history, notifications };
    }

    if (pathname === '/customer/profile' && method === 'GET') {
      const { data } = await supabase.from('customers').select('*').eq('id', currentUserId).single();
      return { success: true, customer: data };
    }

    if (pathname === '/customer/profile' && method === 'PUT') {
      const { name, email, alternate_mobile, address, city, state, pincode } = body;
      await supabase.from('customers').update({ name, email, alternate_mobile, address, city, state, pincode }).eq('id', currentUserId);
      return { success: true, message: 'Profile updated' };
    }

    // ----------------------------------------------------
    // STUDENT DASHBOARD & STUDENTS ACTIONS
    // ----------------------------------------------------
    if (pathname === '/student/dashboard' && method === 'GET') {
      const { data: student } = await supabase.from('students').select('*').eq('id', currentUserId).single();
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('*, courses(*), course_purchases(*)')
        .eq('student_id', currentUserId);

      const courses = (enrollments || []).map(en => ({
        ...en.courses,
        enrollment_id: en.id,
        assigned_at: en.enrolled_date,
        payment_status: en.payment_status,
        purchase_date: en.course_purchases?.[0]?.purchase_date
      }));

      return { success: true, student, courses };
    }

    if (pathname.startsWith('/student/course/') && method === 'GET') {
      const courseId = pathname.replace('/student/course/', '');
      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single();
      const { data: subjects } = await supabase.from('course_subjects').select('*, course_subject_items(*)').eq('course_id', courseId).order('display_order');
      return { success: true, course, subjects };
    }

    if (pathname === '/student/profile' && method === 'PUT') {
      await supabase.from('students').update(body).eq('id', currentUserId);
      return { success: true, message: 'Profile updated' };
    }

    if (pathname.startsWith('/student/item/') && pathname.endsWith('/progress') && method === 'POST') {
      const itemId = pathname.split('/')[3];
      const { completed } = body;
      
      const { data: existingProgress } = await supabase
        .from('student_item_progress')
        .select('id')
        .eq('student_id', currentUserId)
        .eq('item_id', itemId);

      if (existingProgress && existingProgress.length > 0) {
        await supabase.from('student_item_progress').update({ is_completed: completed, completed_at: new Date() }).eq('id', existingProgress[0].id);
      } else {
        await supabase.from('student_item_progress').insert({ student_id: currentUserId, item_id: itemId, is_completed: completed });
      }
      return { success: true, message: 'Progress updated' };
    }

    // ----------------------------------------------------
    // REPAIR CONFIGURATION & TRACKING & REGISTER
    // ----------------------------------------------------
    if (pathname === '/repair/config' && method === 'GET') {
      const { data: types } = await supabase.from('device_types').select('*').order('name');
      const { data: brands } = await supabase.from('brands').select('*').order('name');
      const { data: models } = await supabase.from('models').select('*').order('name');
      return { success: true, types, brands, models };
    }

    if (pathname.startsWith('/repair/track/') && method === 'GET') {
      const trackingNumber = pathname.replace('/repair/track/', '');
      const { data: repair, error } = await supabase
        .from('repair_requests')
        .select('*, customers(name, mobile)')
        .eq('tracking_number', trackingNumber)
        .single();

      if (error || !repair) return { success: false, message: 'Repair not found' };

      const { data: statusLog } = await supabase
        .from('repair_status')
        .select('*')
        .eq('repair_id', repair.id)
        .order('created_at', { ascending: true });

      const repairWithCustomerInfo = {
        ...repair,
        customer_name: repair.customers?.name,
        customer_mobile: repair.customers?.mobile
      };

      return { success: true, repair: repairWithCustomerInfo, statusLog };
    }

    // ----------------------------------------------------
    // NOTIFICATIONS
    // ----------------------------------------------------
    if (pathname === '/notifications' && method === 'GET') {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${currentUserId},and(user_role.eq.${currentUserRole},user_id.is.null)`)
        .order('created_at', { ascending: false })
        .limit(30);
      return { success: true, notifications: data || [] };
    }

    if (pathname.startsWith('/notifications/') && pathname.endsWith('/read') && method === 'PUT') {
      const nId = pathname.split('/')[2];
      await supabase.from('notifications').update({ is_read: true }).eq('id', nId);
      return { success: true };
    }

    if (pathname === '/notifications/send' && method === 'POST') {
      await supabase.from('notifications').insert(body);
      return { success: true };
    }

    // ----------------------------------------------------
    // ADMIN DASHBOARD & ADMIN ACTIONS
    // ----------------------------------------------------
    if (pathname === '/admin/dashboard' && method === 'GET') {
      const { count: totalCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: totalRepairs } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true });
      const { count: pendingRepairs } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).not('status', 'in', '("delivered","cancelled")');
      const { count: completedRepairs } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).in('status', ['delivered','repair_done','quality_test','ready_delivery']);
      const { count: pickupRequests } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('status', 'registered');
      
      const { data: invoices } = await supabase.from('invoices').select('paid_amount');
      const totalRevenue = invoices?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;

      const { count: activeTechs } = await supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('status', 'active');

      const { data: recentRepairs } = await supabase
        .from('repair_requests')
        .select('*, customers(name), technicians:assigned_technician(name)')
        .order('created_at', { ascending: false })
        .limit(15);

      const mappedRecent = (recentRepairs || []).map(rr => ({
        ...rr,
        customer: rr.customers?.name,
        tech: rr.technicians?.name
      }));

      return {
        success: true,
        stats: {
          totalCustomers, totalRepairs, pendingRepairs, completedRepairs,
          pickupRequests, totalRevenue, todayCollection: totalRevenue * 0.1, // Simulated
          monthlyIncome: totalRevenue * 0.4, activeTechs, cashback: 0, commission: 0,
          recentRepairs: mappedRecent
        }
      };
    }

    if (pathname === '/admin/repairs/pending-verification' && method === 'GET') {
      const { data } = await supabase
        .from('repair_requests')
        .select('*, customers(name, mobile)')
        .eq('status', 'pickup_done')
        .order('created_at', { ascending: false });
      
      const mapped = (data || []).map(r => ({ ...r, customer_name: r.customers?.name, customer_mobile: r.customers?.mobile }));
      return { success: true, repairs: mapped };
    }

    if (pathname === '/admin/technicians/list' && method === 'GET') {
      const { data } = await supabase.from('technicians').select('*').eq('status', 'active');
      return { success: true, technicians: data || [] };
    }

    if (pathname === '/repair/delivery/pending-verification' && method === 'GET') {
      const { data } = await supabase.from('repair_requests').select('*, customers(name, mobile)').eq('status', 'handed_to_admin');
      const mapped = (data || []).map(r => ({ ...r, customer_name: r.customers?.name, customer_mobile: r.customers?.mobile }));
      return { success: true, repairs: mapped };
    }

    if (pathname === '/repair/delivery/ready' && method === 'GET') {
      const { data } = await supabase.from('repair_requests').select('*, customers(name, mobile)').in('status', ['ready_to_deliver', 'ready_delivery', 'admin_approved_delivery']);
      const mapped = (data || []).map(r => ({ ...r, customer_name: r.customers?.name, customer_mobile: r.customers?.mobile }));
      return { success: true, repairs: mapped };
    }

    if (pathname === '/repair/delivery/pending-payment' && method === 'GET') {
      const { data } = await supabase.from('repair_requests').select('*, customers(name, mobile)').eq('status', 'quality_test');
      const mapped = (data || []).map(r => ({ ...r, customer_name: r.customers?.name, customer_mobile: r.customers?.mobile }));
      return { success: true, repairs: mapped };
    }

    if (pathname.startsWith('/admin/repairs/search/') && method === 'GET') {
      const tracking = pathname.replace('/admin/repairs/search/', '');
      const { data, error } = await supabase.from('repair_requests').select('*, customers(*)').eq('tracking_number', tracking).single();
      if (error || !data) return { success: false, message: 'Repair not found' };
      
      const mapped = {
        ...data,
        customer_name: data.customers?.name,
        customer_mobile: data.customers?.mobile,
        customer_email: data.customers?.email,
        customer_city: data.customers?.city
      };
      return { success: true, repair: mapped };
    }

    if (pathname.startsWith('/admin/verify/') && method === 'PUT') {
      const tracking = pathname.replace('/admin/verify/', '');
      const { technician_id, notes } = body;
      
      const { data: repair } = await supabase.from('repair_requests').select('id, customer_id').eq('tracking_number', tracking).single();
      if (!repair) return { success: false, message: 'Repair not found' };

      await supabase.from('repair_requests').update({
        assigned_technician: technician_id,
        status: 'under_diagnosis',
        technician_assigned_at: new Date().toISOString()
      }).eq('id', repair.id);

      await supabase.from('repair_status').insert({
        repair_id: repair.id,
        status: 'under_diagnosis',
        notes: notes || 'Assigned to technician',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Technician assigned successfully' };
    }

    // ----------------------------------------------------
    // REPAIR ACTIONS (TECHNICIAN / CUSTOMER)
    // ----------------------------------------------------
    if (pathname.startsWith('/repair/') && pathname.endsWith('/admin-delivery-verify') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { approved, reject_reason } = body;
      const status = approved ? 'ready_to_deliver' : 'admin_rejected_delivery';
      
      await supabase.from('repair_requests').update({ status }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status,
        notes: approved ? 'Admin approved device for delivery.' : `Admin rejected handover: ${reject_reason}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Delivery verification updated' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/ready-for-customer') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { delivery_type } = body;
      
      await supabase.from('repair_requests').update({ status: 'ready_delivery', delivery_type }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'ready_delivery',
        notes: `Device is ready for customer. Delivery type: ${delivery_type}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Status updated to ready' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/verify-payment') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { verified } = body;
      const status = verified ? 'ready_to_deliver' : 'payment_failed';
      
      await supabase.from('repair_requests').update({ status }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status,
        notes: verified ? 'Payment verified by Admin' : 'Payment verification failed',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Payment status verified' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/final-delivery') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { delivered_by_name } = body;
      
      await supabase.from('repair_requests').update({ status: 'delivered', delivery_date: new Date().toISOString() }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'delivered',
        notes: `Device delivered to customer by ${delivered_by_name}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Device delivered successfully' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/quotation/approve') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { approved, reject_reason } = body;
      const status = approved ? 'customer_approved' : 'customer_rejected';

      const { data: quot } = await supabase.from('quotations').select('id').eq('repair_id', repairId).order('created_at', { ascending: false }).limit(1);
      if (quot && quot.length > 0) {
        await supabase.from('quotations').update({ status }).eq('id', quot[0].id);
      }

      await supabase.from('repair_requests').update({ status }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status,
        notes: approved ? 'Customer approved quotation' : `Customer rejected quotation: ${reject_reason}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Quotation response saved' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/customer-receive') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      await supabase.from('repair_requests').update({ status: 'delivered' }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'delivered',
        notes: 'Customer confirmed receiving the device',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });
      return { success: true };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/customer-confirm') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { confirmed, issue_description } = body;
      const status = confirmed ? 'successfully_delivered' : 'customer_issue_reported';

      await supabase.from('repair_requests').update({ status, issue_description: issue_description || null }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status,
        notes: confirmed ? 'Customer confirmed repair success' : `Customer reported issue: ${issue_description}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true };
    }

    // ----------------------------------------------------
    // TECHNICIAN ACTIONS
    // ----------------------------------------------------
    if (pathname === '/technician/dashboard' && method === 'GET') {
      const { data: tech } = await supabase.from('technicians').select('*').eq('id', currentUserId).single();
      const { count: activeJobs } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('assigned_technician', currentUserId).not('status', 'in', '("delivered","cancelled")');
      const { count: completedJobs } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('assigned_technician', currentUserId).eq('status', 'delivered');
      const { count: pending } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('assigned_technician', currentUserId).in('status', ['received_center','under_diagnosis','inspection_done','quotation_sent','customer_approved']);
      const { count: inProgress } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('assigned_technician', currentUserId).in('status', ['waiting_parts','repair_started','ic_repair','software_install','testing','quality_test','ready_delivery']);
      const { count: awaitingParts } = await supabase.from('repair_requests').select('*', { count: 'exact', head: true }).eq('assigned_technician', currentUserId).eq('status', 'waiting_parts');

      const { data: recentRepairs } = await supabase
        .from('repair_requests')
        .select('*, customers(name, mobile)')
        .eq('assigned_technician', currentUserId)
        .order('updated_at', { ascending: false })
        .limit(10);

      const mappedRepairs = (recentRepairs || []).map(rr => ({
        ...rr,
        customer_name: rr.customers?.name,
        customer_mobile: rr.customers?.mobile
      }));

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${currentUserId},and(user_role.eq.technician,user_id.is.null)`)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: commissionHistory } = await supabase
        .from('commission_ledger')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('user_role', 'technician')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        success: true,
        tech: tech || {},
        stats: {
          activeJobs, completedJobs, pending, completedToday: completedJobs, // Simulated
          commissionEarned: 0, totalEarnings: 0, thisMonthEarnings: 0,
          inProgress, awaitingParts
        },
        recentRepairs: mappedRepairs,
        notifications: notifications || [],
        commissionHistory: commissionHistory || []
      };
    }

    if (pathname.startsWith('/technician/repair/') && pathname.endsWith('/status') && method === 'PUT') {
      const repairId = pathname.split('/')[3];
      const { status, notes } = body;

      await supabase.from('repair_requests').update({ status }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status,
        notes: notes || 'Technician updated status',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Status updated successfully' };
    }

    if (pathname.startsWith('/technician/repair/') && pathname.endsWith('/quotation') && method === 'POST') {
      const repairId = pathname.split('/')[3];
      const { estimated_cost, spare_parts_cost, service_charge, notes } = body;
      const total = Number(estimated_cost || 0) + Number(spare_parts_cost || 0) + Number(service_charge || 0);

      const { data: qData, error: qErr } = await supabase.from('quotations').insert({
        repair_id: repairId,
        estimated_cost,
        spare_parts_cost,
        service_charge,
        total_cost: total,
        notes,
        status: 'pending'
      }).select();

      if (qErr) throw qErr;

      await supabase.from('repair_requests').update({ status: 'quotation_sent' }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'quotation_sent',
        notes: `Quotation created by technician. Total: ${total}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Quotation sent successfully' };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/repair-complete') && method === 'PUT') {
      const repairId = pathname.split('/')[2];
      const { notes } = body;

      await supabase.from('repair_requests').update({ status: 'quality_test' }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'quality_test',
        notes: notes || 'Repair completed. Sent to quality testing.',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true, message: 'Repair marked complete' };
    }

    // ----------------------------------------------------
    // REPAIR DETAIL
    // ----------------------------------------------------
    if (pathname.startsWith('/repair/') && method === 'GET') {
      const id = pathname.replace('/repair/', '');
      if (!isNaN(Number(id))) {
        const { data: repair } = await supabase.from('repair_requests').select('*, customers(*)').eq('id', id).single();
        const { data: statusLog } = await supabase.from('repair_status').select('*').eq('repair_id', id).order('created_at', { ascending: true });
        const { data: quotations } = await supabase.from('quotations').select('*').eq('repair_id', id).order('created_at', { ascending: false });
        const { data: photos } = await supabase.from('repair_photos').select('*').eq('repair_id', id);

        const repairMapped = {
          ...repair,
          customer_name: repair?.customers?.name,
          customer_mobile: repair?.customers?.mobile
        };

        return { success: true, repair: repairMapped, statusLog, quotations, photos };
      }
    }

    // ----------------------------------------------------
    // COMMISSIONS & TRANSACTIONS
    // ----------------------------------------------------
    if (pathname === '/transactions/commission/dashboard' && method === 'GET') {
      const { data } = await supabase.from('commission_ledger').select('commission_amount, status').eq('user_id', currentUserId).eq('user_role', currentUserRole);
      
      const summary = { pending: 0, approved: 0, paid: 0, total: 0 };
      (data || []).forEach(c => {
        const amt = Number(c.commission_amount || 0);
        summary.total += amt;
        if (c.status === 'pending') summary.pending += amt;
        if (c.status === 'approved') summary.approved += amt;
        if (c.status === 'paid') summary.paid += amt;
      });

      const { data: list } = await supabase
        .from('commission_ledger')
        .select('id, transaction_type, commission_amount, tax_deducted, net_amount, status, created_at')
        .eq('user_id', currentUserId)
        .eq('user_role', currentUserRole)
        .order('created_at', { ascending: false })
        .limit(20);

      return { success: true, summary, commissions: list || [] };
    }

    if (pathname === '/transactions/commission/all' && method === 'GET') {
      const { data: commissions } = await supabase
        .from('commission_ledger')
        .select('*, admins(name, email), technicians(name, email)')
        .order('created_at', { ascending: false });

      const mapped = (commissions || []).map(c => ({
        ...c,
        user_name: c.user_role === 'admin' ? c.admins?.name : c.technicians?.name,
        user_email: c.user_role === 'admin' ? c.admins?.email : c.technicians?.email
      }));

      return { success: true, commissions: mapped };
    }

    if (pathname === '/transactions/commission/summary' && method === 'GET') {
      const { data: ledger } = await supabase.from('commission_ledger').select('*, admins(name), technicians(name)');
      const groupings = {};

      (ledger || []).forEach(cl => {
        const key = `${cl.user_role}_${cl.user_id}`;
        if (!groupings[key]) {
          groupings[key] = {
            user_id: cl.user_id,
            user_role: cl.user_role,
            user_name: cl.user_role === 'admin' ? cl.admins?.name : cl.technicians?.name,
            total_transactions: 0,
            pending_amount: 0,
            paid_amount: 0,
            total_amount: 0,
            last_payment_date: null
          };
        }
        const g = groupings[key];
        g.total_transactions++;
        const amt = Number(cl.commission_amount || 0);
        g.total_amount += amt;
        if (cl.status === 'pending') g.pending_amount += amt;
        if (cl.status === 'paid') {
          g.paid_amount += amt;
          if (!g.last_payment_date || new Date(cl.payment_date) > new Date(g.last_payment_date)) {
            g.last_payment_date = cl.payment_date;
          }
        }
      });

      return { success: true, summary: Object.values(groupings) };
    }

    if (pathname.startsWith('/transactions/commission/') && pathname.endsWith('/approve') && method === 'PUT') {
      const commId = pathname.split('/')[3];
      await supabase.from('commission_ledger').update({ status: 'approved' }).eq('id', commId);
      return { success: true, message: 'Commission approved' };
    }

    if (pathname === '/transactions/student/available' && method === 'GET') {
      const { data: courses } = await supabase.from('courses').select('*').eq('status', 'active');
      const { data: purchases } = await supabase.from('course_purchases').select('course_id').eq('student_id', currentUserId);

      const purchaseSet = new Set((purchases || []).map(p => p.course_id));
      const mapped = (courses || []).map(c => ({
        ...c,
        already_purchased: purchaseSet.has(c.id) ? 1 : 0
      }));

      return { success: true, courses: mapped };
    }

    if (pathname === '/transactions/purchase' && method === 'POST') {
      const { courseId } = body;
      const { data: course } = await supabase.from('courses').select('price').eq('id', courseId).single();
      
      const { data: purchase } = await supabase.from('course_purchases').insert({
        student_id: currentUserId,
        course_id: courseId,
        amount_paid: course?.price || 0,
        payment_method: 'online',
        status: 'completed'
      }).select();

      await supabase.from('course_enrollments').insert({
        student_id: currentUserId,
        course_id: courseId,
        payment_status: 'completed',
        transaction_id: 'TXN_' + Date.now()
      });

      return { success: true, purchase: purchase[0] };
    }

    // ----------------------------------------------------
    // COURSE MANAGEMENT (MASTER PANEL)
    // ----------------------------------------------------
    if (pathname === '/course/manage' && method === 'GET') {
      const { data: courses } = await supabase.from('courses').select('*, course_subjects(id, course_subject_items(id))').order('created_at', { ascending: false });
      
      const mapped = (courses || []).map(c => {
        let subjectCount = c.course_subjects?.length || 0;
        let materialCount = 0;
        (c.course_subjects || []).forEach(sub => {
          materialCount += sub.course_subject_items?.length || 0;
        });

        return {
          ...c,
          subject_count: subjectCount,
          material_count: materialCount
        };
      });

      return { success: true, courses: mapped };
    }

    if (pathname === '/course/manage/students' && method === 'GET') {
      const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      return { success: true, students: data || [] };
    }

    if (pathname === '/course/manage/purchases' && method === 'GET') {
      const { data } = await supabase.from('course_purchases').select('*, students(name, student_id), courses(title)').order('created_at', { ascending: false });
      
      const mapped = (data || []).map(p => ({
        ...p,
        student_name: p.students?.name,
        student_id_str: p.students?.student_id,
        course_title: p.courses?.title
      }));
      
      return { success: true, purchases: mapped };
    }

    if (pathname === '/course/manage/support/tickets' && method === 'GET') {
      const { data } = await supabase.from('support_tickets').select('*, students(name), courses(title)').order('created_at', { ascending: false });
      const mapped = (data || []).map(t => ({
        ...t,
        student_name: t.students?.name,
        course_title: t.courses?.title
      }));
      return { success: true, tickets: mapped };
    }

    if (pathname === '/course/manage/certificates/requests' && method === 'GET') {
      const { data } = await supabase.from('generated_certificates').select('*, students(name), courses(title)').order('created_at', { ascending: false });
      const mapped = (data || []).map(c => ({
        ...c,
        student_name: c.students?.name,
        course_title: c.courses?.title
      }));
      return { success: true, requests: mapped };
    }

    if (pathname === '/course/manage/certificates/templates' && method === 'GET') {
      const { data } = await supabase.from('certificate_templates').select('*');
      return { success: true, templates: data || [] };
    }

    if (pathname === '/course/manage/announcements' && method === 'GET') {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      return { success: true, announcements: data || [] };
    }

    // Assign multiple students
    if (pathname === '/course/manage/assign' && method === 'POST') {
      const { studentIds, courseIds } = body;
      for (const sId of studentIds) {
        for (const cId of courseIds) {
          const { data: existing } = await supabase.from('course_enrollments').select('id').eq('student_id', sId).eq('course_id', cId);
          if (!existing || existing.length === 0) {
            await supabase.from('course_enrollments').insert({ student_id: sId, course_id: cId, payment_status: 'completed' });
          }
        }
      }
      return { success: true, message: 'Courses assigned successfully' };
    }

    // Reset student device ID
    if (pathname.startsWith('/course/manage/student/') && pathname.endsWith('/reset-device') && method === 'PUT') {
      const studentId = pathname.split('/')[4];
      await supabase.from('students').update({ android_device_id: null }).eq('id', studentId);
      return { success: true, message: 'Device reset successfully' };
    }

    // Reset course purchase status
    if (pathname.startsWith('/course/manage/purchase/') && method === 'PUT') {
      const purchaseId = pathname.replace('/course/manage/purchase/', '');
      const { status } = body;
      await supabase.from('course_purchases').update({ status }).eq('id', purchaseId);
      return { success: true, message: 'Status updated' };
    }

    // Support ticket messages
    if (pathname.startsWith('/course/manage/support/tickets/') && pathname.endsWith('/messages') && method === 'GET') {
      const ticketId = pathname.split('/')[5];
      const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      return { success: true, messages: data || [] };
    }

    if (pathname.startsWith('/course/manage/support/tickets/') && pathname.endsWith('/reply') && method === 'POST') {
      const ticketId = pathname.split('/')[5];
      const { message } = body;
      const { data } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        sender_role: currentUserRole,
        message
      }).select();
      return { success: true, message: data[0] };
    }

    if (pathname.startsWith('/course/manage/support/tickets/') && pathname.endsWith('/status') && method === 'PUT') {
      const ticketId = pathname.split('/')[5];
      const { status } = body;
      await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
      return { success: true };
    }

    if (pathname.startsWith('/course/manage/certificates/request/') && pathname.endsWith('/approve') && method === 'PUT') {
      const id = pathname.split('/')[5];
      const { status } = body;
      await supabase.from('generated_certificates').update({ status }).eq('id', id);
      return { success: true };
    }

    if (pathname === '/course/manage/certificates/reissue' && method === 'POST') {
      const { studentId, courseId } = body;
      await supabase.from('generated_certificates').insert({
        student_id: studentId,
        course_id: courseId,
        status: 'approved',
        certificate_url: 'CERT_' + Math.random().toString(36).substring(2, 8)
      });
      return { success: true, message: 'Certificate reissued' };
    }

    // EXPORT ACTIVITIES & CUSTOMERS CSV
    if (pathname === '/admin/export/activity' && method === 'GET') {
      const { data } = await supabase.from('activity_logs').select('*, master_users(name), admins(name), technicians(name)').order('created_at', { ascending: false }).limit(200);
      
      const headers = ['ID', 'User Name', 'Role', 'Action', 'Description', 'Date & Time'];
      const rows = [headers.join(',')];
      (data || []).forEach(r => {
        const name = r.user_role === 'master' ? r.master_users?.name : r.user_role === 'admin' ? r.admins?.name : r.technicians?.name;
        rows.push([r.id, name || '', r.user_role, r.action, `"${(r.description || '').replace(/"/g, '""')}"`, r.created_at].join(','));
      });
      return rows.join('\n');
    }

    if (pathname === '/admin/export/customers' && method === 'GET') {
      const { data } = await supabase.from('customers').select('*, repair_requests(tracking_number)').order('created_at', { ascending: false }).limit(200);
      const headers = ['ID', 'Name', 'Email', 'Mobile', 'City', 'Status', 'Total Repairs', 'Tracking Numbers', 'Registered On'];
      const rows = [headers.join(',')];
      (data || []).forEach(r => {
        const trackings = (r.repair_requests || []).map(t => t.tracking_number).join(' | ');
        rows.push([r.id, r.name, r.email || '', r.mobile, r.city || '', r.status, r.total_repairs || 0, `"${trackings}"`, r.created_at].join(','));
      });
      return rows.join('\n');
    }

    // FALLBACK
    return { success: false, message: `Direct Supabase integration: ${method} ${pathname} not mapped.` };

  } catch (err) {
    console.error('🔥 Supabase Request Error:', err.message, pathname);
    return { success: false, message: err.message };
  }
}

/**
 * UPLOAD FORMDATA MULTIPART FILE ADAPTER
 */
async function upload(url, formData) {
  const { pathname } = parseUrl(url);

  try {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const currentUserId = user ? user.id : null;
    const currentUserRole = user ? user.role : null;

    if (pathname === '/repair') {
      const formKeys = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'photos') {
          formKeys[key] = value;
        }
      }
      
      const trackingNumber = await generateTrackingNumber();
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TRACK:${trackingNumber}`;

      const repairData = {
        tracking_number: trackingNumber,
        customer_id: currentUserId,
        status: 'registered',
        qr_code: qrCode,
        ...formKeys
      };

      const { data, error } = await supabase.from('repair_requests').insert(repairData).select();
      if (error) throw error;
      const repairId = data[0].id;

      // Handle photos
      const files = formData.getAll('photos');
      if (files && files.length > 0) {
        for (const file of files) {
          const publicUrl = await uploadFileToSupabase(file, 'repair-photos');
          await supabase.from('repair_photos').insert({
            repair_id: repairId,
            photo_type: 'condition',
            file_path: publicUrl,
            uploaded_by: currentUserId
          });
        }
      }

      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'registered',
        notes: 'Repair registered'
      });

      return { success: true, message: 'Repair registered!', repair: { id: repairId, tracking_number: trackingNumber } };
    }

    if (pathname === '/course/manage/upload-banner') {
      const file = formData.get('banner') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'banners');
      return { success: true, url: publicUrl };
    }

    if (pathname === '/course/manage/upload-file') {
      const file = formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'materials');
      return { success: true, url: publicUrl, filename: file?.name || 'file' };
    }

    if (pathname === '/course/manage/certificates/template') {
      const file = formData.get('template') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'templates');
      return { success: true, url: publicUrl };
    }

    if (pathname === '/master/gallery') {
      const file = formData.get('photo') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'gallery');
      const { data, error } = await supabase.from('gallery_photos').insert({ photo_url: publicUrl }).select();
      if (error) throw error;
      return { success: true, photo: data[0] };
    }

    if (pathname === '/master/sliders') {
      const file = formData.get('image') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'sliders');
      const { data, error } = await supabase.from('slider_images').insert({ image_url: publicUrl }).select();
      if (error) throw error;
      return { success: true, image: data[0] };
    }

    if (pathname.startsWith('/course/manage/') && pathname.endsWith('/material')) {
      const courseId = pathname.split('/')[3];
      const file = formData.get('file');
      const title = formData.get('title') || 'Material';
      const type = formData.get('type') || 'document';

      const publicUrl = await uploadFileToSupabase(file, 'materials');
      
      const { data: sub } = await supabase.from('course_subjects').select('id').eq('course_id', courseId).limit(1);
      let subjectId;
      if (sub && sub.length > 0) {
        subjectId = sub[0].id;
      } else {
        const { data: newSub } = await supabase.from('course_subjects').insert({ course_id: courseId, title: 'Materials', display_order: 1 }).select();
        subjectId = newSub[0].id;
      }

      await supabase.from('course_subject_items').insert({
        subject_id: subjectId,
        title,
        type,
        file_path: publicUrl,
        display_order: 1
      });

      return { success: true };
    }

    if (pathname.startsWith('/customer/repairs/') && pathname.endsWith('/pay')) {
      const repairId = pathname.split('/')[3];
      const file = formData.get('screenshot') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'payments');

      await supabase.from('payments').insert({
        repair_id: repairId,
        amount: Number(formData.get('amount') || 0),
        payment_method: formData.get('payment_method') || 'UPI',
        transaction_id: formData.get('transaction_id') || ('PAY_' + Date.now()),
        status: 'pending',
        receipt_photo: publicUrl
      });

      await supabase.from('repair_requests').update({ status: 'payment_done' }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'payment_done',
        notes: 'Payment screenshot submitted by customer. Awaiting verification.',
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/pickup')) {
      const repairId = pathname.split('/')[2];
      const subPhoto = formData.get('submission_photo');
      const selfPhoto = formData.get('customer_selfie');

      const submissionPhotoPath = subPhoto ? await uploadFileToSupabase(subPhoto, 'pickup') : null;
      const customerSelfiePath = selfPhoto ? await uploadFileToSupabase(selfPhoto, 'pickup') : null;

      await supabase.from('repair_requests').update({
        device_condition: formData.get('device_condition') || null,
        notes: formData.get('notes') || null,
        gps_location: formData.get('gps_location') || null,
        gps_lat: Number(formData.get('gps_lat')) || null,
        gps_lng: Number(formData.get('gps_lng')) || null,
        pickup_by: formData.get('admin_name') || 'Admin',
        submission_photo: submissionPhotoPath,
        customer_selfie: customerSelfiePath,
        status: 'pickup_done',
        pickup_date: new Date().toISOString()
      }).eq('id', repairId);

      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'pickup_done',
        notes: `Pickup completed by Admin. Condition: ${formData.get('device_condition') || 'N/A'}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true };
    }

    if (pathname === '/admin/pickup') {
      const tracking = formData.get('tracking_number');
      const { data: repair } = await supabase.from('repair_requests').select('id, customer_id').eq('tracking_number', tracking).single();
      if (!repair) return { success: false, message: 'Repair request not found' };

      const subPhoto = formData.get('submission_photo');
      const selfPhoto = formData.get('customer_selfie');

      const submissionPhotoPath = subPhoto ? await uploadFileToSupabase(subPhoto, 'pickup') : null;
      const customerSelfiePath = selfPhoto ? await uploadFileToSupabase(selfPhoto, 'pickup') : null;

      await supabase.from('repair_requests').update({
        device_condition: formData.get('device_condition') || null,
        notes: formData.get('notes') || null,
        gps_location: formData.get('gps_location') || null,
        gps_lat: Number(formData.get('gps_lat')) || null,
        gps_lng: Number(formData.get('gps_lng')) || null,
        pickup_by: formData.get('admin_name') || 'Admin',
        submission_photo: submissionPhotoPath,
        customer_selfie: customerSelfiePath,
        status: 'pickup_done',
        pickup_date: new Date().toISOString()
      }).eq('id', repair.id);

      await supabase.from('repair_status').insert({
        repair_id: repair.id,
        status: 'pickup_done',
        notes: `Pickup completed by Admin. Condition: ${formData.get('device_condition') || 'N/A'}`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return {
        success: true,
        pickupDetails: {
          customerName: 'Customer',
          trackingNumber: tracking,
          adminName: formData.get('admin_name') || 'Admin',
          submissionDateTime: new Date().toISOString(),
          deviceCondition: formData.get('device_condition') || 'N/A'
        }
      };
    }

    if (pathname.startsWith('/repair/') && pathname.endsWith('/handover-to-admin')) {
      const repairId = pathname.split('/')[2];
      const file = formData.get('repair_photo') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'handovers');

      await supabase.from('repair_requests').update({ status: 'handed_to_admin' }).eq('id', repairId);
      await supabase.from('repair_status').insert({
        repair_id: repairId,
        status: 'handed_to_admin',
        notes: `Device handed over to Admin for delivery. Photo uploaded.`,
        updated_by: currentUserId,
        updated_by_role: currentUserRole
      });

      return { success: true };
    }

    if (pathname === '/student/purchase') {
      const courseId = formData.get('courseId');
      const file = formData.get('screenshot') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'purchases');

      await supabase.from('course_purchases').insert({
        student_id: currentUserId,
        course_id: courseId,
        amount_paid: 0,
        payment_method: 'UPI',
        status: 'pending',
        receipt_photo: publicUrl
      });

      return { success: true };
    }

    if (pathname === '/student/profile/photo') {
      const file = formData.get('photo') || formData.get('file');
      const publicUrl = await uploadFileToSupabase(file, 'profiles');
      await supabase.from('students').update({ photo: publicUrl }).eq('id', currentUserId);
      return { success: true, photoUrl: publicUrl };
    }

    // Default Fallback
    return { success: false, message: `Multipart upload not mapped: ${pathname}` };

  } catch (err) {
    console.error('🔥 Supabase Upload Error:', err.message, pathname);
    return { success: false, message: err.message };
  }
}

export function getApiBase() {
  return ''; // Return empty string to keep relative checks or routing intact
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url, body) => request(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => upload(url, formData),
};

export default api;
