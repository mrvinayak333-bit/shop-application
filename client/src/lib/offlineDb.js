/**
 * SRM MOBILE FIXIT - STANDALONE OFFLINE DATABASE ENGINE
 * 100% Local Storage & Persistence Engine for Android APK
 */

const STORAGE_KEYS = {
  USERS: 'srm_offline_users',
  REPAIRS: 'srm_offline_repairs',
  LAPTOP_REPAIRS: 'srm_offline_laptop_repairs',
  CUSTOMERS: 'srm_offline_customers',
  INVENTORY: 'srm_offline_inventory',
  BRANDS: 'srm_offline_brands',
  MODELS: 'srm_offline_models',
  COURSES: 'srm_offline_courses',
  CERTIFICATES: 'srm_offline_certificates',
  INVOICES: 'srm_offline_invoices',
  QUOTATIONS: 'srm_offline_quotations',
  SETTINGS: 'srm_offline_settings',
  NOTIFICATIONS: 'srm_offline_notifications',
  TECHNICIANS: 'srm_offline_technicians',
  COMMISSIONS: 'srm_offline_commissions',
};

// Seed initial data if first launch
function initDb() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const seedUsers = [
      { id: 1, full_name: 'VINAYAK SANJAY KUMBHAR', email: 'mr.vinayak333@gmail.com', phone: '9130521333', role: 'master', password: 'VINAYAK@333', status: 'active', created_at: new Date().toISOString() },
      { id: 2, full_name: 'Shop Admin', email: 'admin@repairsystem.com', phone: '9876543210', role: 'admin', password: 'master123', status: 'active', created_at: new Date().toISOString() },
      { id: 3, full_name: 'Lead Technician', email: 'tech@shop.com', phone: '9876543211', role: 'technician', password: 'tech123', status: 'active', created_at: new Date().toISOString() },
      { id: 4, full_name: 'Student User', email: 'student@shop.com', phone: '9876543212', student_id: 'SRMS-2026-4364', role: 'student', password: 'student123', status: 'active', created_at: new Date().toISOString() },
      { id: 5, full_name: 'Customer User', email: 'customer@shop.com', phone: '9876543213', role: 'customer', password: 'customer123', status: 'active', created_at: new Date().toISOString() },
      { id: 6, full_name: 'Staff Member', email: 'staff@shop.com', phone: '9876543214', role: 'staff', password: 'staff123', status: 'active', created_at: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seedUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.REPAIRS)) {
    const seedRepairs = [
      {
        id: 1,
        repair_token: 'SRM-2026-000001',
        customer_name: 'Rahul Sharma',
        customer_phone: '9876543213',
        customer_email: 'customer@shop.com',
        device_brand: 'Samsung',
        device_model: 'Galaxy S21 Ultra',
        problem_description: 'Display cracked & battery draining fast',
        status: 'in_progress',
        estimated_cost: 4500,
        final_cost: 4500,
        advance_paid: 1000,
        assigned_technician_id: 3,
        technician_name: 'Lead Technician',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(seedRepairs));
  }

  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    const seedCourses = [
      { id: 1, title: 'Master IC Level Mobile Repairing', code: 'SRM-CR01', duration: '30 Days', price: 15000, description: 'Complete Hardware, CPU reballing & schematic diagnosis' },
      { id: 2, title: 'Advanced Motherboard Diagnostic', code: 'SRM-CR02', duration: '15 Days', price: 10000, description: 'Short finding, Power IC repair & software flashing' }
    ];
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(seedCourses));
  }

  if (!localStorage.getItem(STORAGE_KEYS.BRANDS)) {
    const seedBrands = ['Samsung', 'Apple', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'OnePlus', 'Motorola', 'Google'];
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(seedBrands));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    const seedSettings = {
      app_name: 'SRM MOBAILE FIXIT',
      contact_phone: '+91 91305 21333',
      contact_whatsapp: '919130521333',
      address: 'Solapur, Maharashtra – 413002',
      founder: 'VINAYAK SANJAY KUMBHAR'
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seedSettings));
  }
}

// Helper getter/setter
function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Generate unique local token
function generateToken(prefix = 'SRM-2026-') {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export function handleOfflineRequest(path, method = 'GET', body = null, headers = {}) {
  initDb();
  const cleanPath = path.replace(/^\/api/, '');
  console.log(`[Offline Engine] ${method} ${cleanPath}`);

  // 1. AUTHENTICATION
  if (cleanPath.startsWith('/auth/login') && method === 'POST') {
    const { email, username, phone, student_id, password } = body || {};
    const input = (email || username || phone || student_id || '').toLowerCase().trim();
    const users = getStore(STORAGE_KEYS.USERS);

    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === input) ||
      (u.phone && u.phone === input) ||
      (u.student_id && u.student_id.toLowerCase() === input)
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials or user not found' };
    }

    if (user.password && user.password !== password) {
      return { success: false, message: 'Incorrect password' };
    }

    if (user.status && user.status !== 'active') {
      return { success: false, message: 'Account is inactive. Please contact admin.' };
    }

    const token = `offline_jwt_token_${user.id}_${Date.now()}`;
    const safeUser = { ...user };
    delete safeUser.password;

    return {
      success: true,
      token,
      user: safeUser,
      message: 'Login successful'
    };
  }

  if (cleanPath.startsWith('/auth/register') && method === 'POST') {
    const { full_name, email, phone, password, role = 'customer' } = body || {};
    const users = getStore(STORAGE_KEYS.USERS);

    if (users.some(u => u.email && u.email.toLowerCase() === (email || '').toLowerCase())) {
      return { success: false, message: 'Email is already registered' };
    }

    const newUser = {
      id: users.length + 1,
      full_name,
      email,
      phone,
      role,
      password,
      status: 'active',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    setStore(STORAGE_KEYS.USERS, users);

    const safeUser = { ...newUser };
    delete safeUser.password;
    const token = `offline_jwt_token_${newUser.id}_${Date.now()}`;

    return { success: true, token, user: safeUser, message: 'Registration successful' };
  }

  if (cleanPath.startsWith('/auth/me')) {
    const token = headers['Authorization'] || localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
      const users = getStore(STORAGE_KEYS.USERS);
      user = users[0] || { id: 1, full_name: 'VINAYAK SANJAY KUMBHAR', role: 'master' };
    }

    return { success: true, user };
  }

  // 2. REPAIR TRACKING & MANAGEMENT
  if (cleanPath.startsWith('/repairs/track/') || cleanPath.startsWith('/laptop-repair/track/')) {
    const tokenParam = cleanPath.split('/track/')[1];
    const repairs = getStore(STORAGE_KEYS.REPAIRS).concat(getStore(STORAGE_KEYS.LAPTOP_REPAIRS));
    
    const repair = repairs.find(r => 
      (r.repair_token && r.repair_token.toLowerCase() === tokenParam.toLowerCase()) ||
      (r.customer_phone && r.customer_phone === tokenParam)
    );

    if (repair) {
      return { success: true, data: repair, repair };
    }
    return { success: false, message: 'No repair ticket found for this token or phone number' };
  }

  if ((cleanPath === '/repairs' || cleanPath === '/laptop-repair') && method === 'GET') {
    const repairs = getStore(STORAGE_KEYS.REPAIRS);
    return { success: true, data: repairs, repairs };
  }

  if ((cleanPath === '/repairs' || cleanPath === '/laptop-repair') && method === 'POST') {
    const repairs = getStore(STORAGE_KEYS.REPAIRS);
    const newRepair = {
      id: repairs.length + 1,
      repair_token: generateToken(cleanPath.includes('laptop') ? 'SRM-LAP-2026-' : 'SRM-2026-'),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(body || {})
    };
    repairs.unshift(newRepair);
    setStore(STORAGE_KEYS.REPAIRS, repairs);
    return { success: true, data: newRepair, repair_token: newRepair.repair_token, message: 'Repair request created successfully' };
  }

  if (cleanPath.match(/\/repairs\/\d+\/status/) && method === 'PUT') {
    const id = parseInt(cleanPath.split('/')[2]);
    const repairs = getStore(STORAGE_KEYS.REPAIRS);
    const index = repairs.findIndex(r => r.id === id);

    if (index !== -1) {
      repairs[index] = { ...repairs[index], ...(body || {}), updated_at: new Date().toISOString() };
      setStore(STORAGE_KEYS.REPAIRS, repairs);
      return { success: true, message: 'Repair status updated successfully', data: repairs[index] };
    }
    return { success: false, message: 'Repair record not found' };
  }

  // 3. DASHBOARD STATS
  if (cleanPath.includes('/dashboard')) {
    const repairs = getStore(STORAGE_KEYS.REPAIRS);
    const users = getStore(STORAGE_KEYS.USERS);
    const total_repairs = repairs.length;
    const pending_repairs = repairs.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    const completed_repairs = repairs.filter(r => r.status === 'completed' || r.status === 'delivered').length;
    const total_customers = users.filter(u => u.role === 'customer').length;
    const total_revenue = repairs.reduce((acc, r) => acc + (parseFloat(r.final_cost) || parseFloat(r.estimated_cost) || 0), 0);

    return {
      success: true,
      stats: {
        total_repairs,
        pending_repairs,
        completed_repairs,
        total_customers,
        total_revenue,
        recent_repairs: repairs.slice(0, 5)
      },
      data: {
        total_repairs,
        pending_repairs,
        completed_repairs,
        total_customers,
        total_revenue,
        recent_repairs: repairs.slice(0, 5)
      }
    };
  }

  // 4. COURSES & CERTIFICATES
  if (cleanPath.startsWith('/courses')) {
    const courses = getStore(STORAGE_KEYS.COURSES);
    return { success: true, data: courses, courses };
  }

  if (cleanPath.startsWith('/certificate/pending')) {
    const certs = getStore(STORAGE_KEYS.CERTIFICATES);
    return { success: true, data: certs };
  }

  if (cleanPath.startsWith('/certificate/generate') && method === 'POST') {
    const certs = getStore(STORAGE_KEYS.CERTIFICATES);
    const newCert = {
      id: certs.length + 1,
      certificate_number: `SRM-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      issue_date: new Date().toISOString(),
      ...(body || {})
    };
    certs.push(newCert);
    setStore(STORAGE_KEYS.CERTIFICATES, certs);
    return { success: true, message: 'Certificate generated successfully', data: newCert };
  }

  // 5. CUSTOMERS & INVENTORY
  if (cleanPath.startsWith('/customers')) {
    const users = getStore(STORAGE_KEYS.USERS).filter(u => u.role === 'customer');
    return { success: true, data: users, customers: users };
  }

  if (cleanPath.startsWith('/inventory') || cleanPath.startsWith('/brands') || cleanPath.startsWith('/models')) {
    const items = getStore(STORAGE_KEYS.INVENTORY);
    const brands = getStore(STORAGE_KEYS.BRANDS);
    return { success: true, data: items, items, brands };
  }

  if (cleanPath.startsWith('/website-settings') || cleanPath.startsWith('/settings')) {
    const settings = getStore(STORAGE_KEYS.SETTINGS);
    return { success: true, data: settings, settings };
  }

  // Generic Offline Success Fallback
  return {
    success: true,
    message: 'Operation completed successfully (Offline Engine)',
    data: []
  };
}
