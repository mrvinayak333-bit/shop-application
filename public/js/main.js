// =====================================================
// API Service
// =====================================================
const API = {
  base: '/api',

  setToken(token) {
    localStorage.setItem('token', token);
  },

  getToken() {
    return localStorage.getItem('token');
  },

  clearToken() {
    localStorage.removeItem('token');
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },

  clearUser() {
    localStorage.removeItem('user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { ...options.headers };

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${this.base}${endpoint}`, config);
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      if (window.location.pathname.includes('/dashboard/')) {
        API.clearToken();
        API.clearUser();
        window.location.href = '/';
      }
    }

    return data;
  },

  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// =====================================================
// Auth Functions
// =====================================================
const Auth = {
  isLoggedIn() {
    return !!API.getToken();
  },

  getRole() {
    const user = API.getUser();
    return user ? user.role : null;
  },

  async login(email, password, role, studentId, extra = {}) {
    const body = { email, password, role, studentId, ...extra };
    const res = await API.post('/auth/login', body);
    if (res.success) {
      API.setToken(res.token);
      API.setUser(res.user);
    }
    return res;
  },

  logout() {
    API.clearToken();
    API.clearUser();
    window.location.href = '/';
  },

  redirectToDashboard() {
    const role = this.getRole();
    if (role) {
      window.location.href = `/dashboard/${role}`;
    }
  }
};

// =====================================================
// UI Utilities
// =====================================================
const UI = {
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showLoading(container) {
    container.innerHTML = '<div class="spinner"></div>';
  },

  showAlert(container, message, type = 'danger') {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  getStatusBadge(status) {
    const badges = {
      // Repair statuses
      registered: 'badge-pending', pickup_done: 'badge-info', admin_verified: 'badge-info',
      received_center: 'badge-info', under_diagnosis: 'badge-warning', under_repair: 'badge-warning',
      waiting_parts: 'badge-warning', repair_done: 'badge-success', quality_test: 'badge-info',
      ready_delivery: 'badge-info', out_delivery: 'badge-warning', delivered: 'badge-success',
      cancelled: 'badge-cancelled', rejected: 'badge-cancelled',
      // General statuses
      pending: 'badge-pending', accepted: 'badge-info', diagnosing: 'badge-info',
      waiting_approval: 'badge-warning', repairing: 'badge-warning', repaired: 'badge-success',
      active: 'badge-active', inactive: 'badge-inactive', completed: 'badge-completed',
      // Payment statuses
      paid: 'badge-success', unpaid: 'badge-danger', partial: 'badge-warning',
      // Quotation
      approved: 'badge-success', sent: 'badge-info'
    };
    return `<span class="badge ${badges[status] || 'badge-secondary'}">${status.replace(/_/g, ' ')}</span>`;
  }
};

// =====================================================
// Gallery Slider
// =====================================================
const Gallery = {
  async initSlider(container, page = 'home') {
    try {
      const res = await API.get(`/gallery/public?page=${page}`);
      if (!res.success || !res.images || res.images.length === 0) {
        // Show placeholder if no images
        if (container) {
          container.innerHTML = `<div style="text-align:center;padding:2rem;color:#999;">No images in gallery</div>`;
        }
        return;
      }

      const images = res.images;
      let currentIndex = 0;
      let interval;

      // Build slider HTML
      let html = '<div class="slider-images">';
      images.forEach((img, i) => {
        html += `<img src="${img.image_path}" alt="${img.alt_text || ''}" class="${i === 0 ? 'active' : ''}">`;
      });
      html += '</div>';

      if (images.length > 1) {
        html += '<div class="slider-dots">';
        images.forEach((_, i) => {
          html += `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="Gallery.goTo(${i})"></button>`;
        });
        html += '</div>';
      }

      container.innerHTML = html;

      const imgElements = container.querySelectorAll('.slider-images img');
      const dotElements = container.querySelectorAll('.slider-dot');

      this.goTo = (index) => {
        imgElements.forEach(img => img.classList.remove('active'));
        dotElements.forEach(dot => dot.classList.remove('active'));
        imgElements[index].classList.add('active');
        dotElements[index].classList.add('active');
        currentIndex = index;
      };

      this.next = () => {
        currentIndex = (currentIndex + 1) % images.length;
        this.goTo(currentIndex);
      };

      this.prev = () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        this.goTo(currentIndex);
      };

      if (images.length > 1) {
        interval = setInterval(() => this.next(), 4000);
      }

      // Store for cleanup
      container._galleryInterval = interval;
    } catch (err) {
      console.error('Gallery error:', err);
    }
  }
};

// =====================================================
// Menu Toggle
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const menuDropdown = document.querySelector('.menu-dropdown');

  if (menuToggle && menuDropdown) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menuDropdown.classList.remove('show');
    });
  }

  // Check auth state
  const user = API.getUser();
  const isDashboard = window.location.pathname.includes('/dashboard/');

  if (isDashboard && !API.getToken()) {
    window.location.href = '/';
    return;
  }

  // Update UI for logged-in users
  if (user && !isDashboard) {
    const navMenu = document.querySelector('.navbar-menu');
    if (navMenu) {
      navMenu.innerHTML = `
        <span class="me-2">👋 ${user.name}</span>
        <a href="/dashboard/${user.role}" class="btn btn-sm btn-primary">Dashboard</a>
        <button class="btn btn-sm btn-secondary" onclick="Auth.logout()">Logout</button>
      `;
    }
  }
});

// Guest tracking
async function trackRepair() {
  const trackingNumber = document.getElementById('trackInput')?.value?.trim();
  if (!trackingNumber) {
    UI.showToast('Please enter a tracking number', 'error');
    return;
  }
  try {
    const res = await API.get(`/repair/customer/${trackingNumber}`);
    if (res.success) {
      const r = res.repair;
      document.getElementById('trackResult').innerHTML = `
        <div class="alert alert-info">
          <strong>Status:</strong> ${UI.getStatusBadge(r.status)}<br>
          <strong>Device:</strong> ${r.device_type} - ${r.brand} ${r.model || ''}<br>
          <strong>Date:</strong> ${UI.formatDate(r.created_at)}
        </div>
        ${res.quotation ? `<p><strong>Quotation:</strong> ${UI.formatCurrency(res.quotation.total_cost)}</p>` : ''}
        <div class="mt-2">
          <h6>Status Timeline:</h6>
          ${res.statusLog?.map(s => `<div>• ${s.status} - ${UI.formatDate(s.created_at)}</div>`).join('') || ''}
        </div>
      `;
    } else {
      UI.showToast('Tracking number not found', 'error');
    }
  } catch (err) {
    UI.showToast('Error tracking repair', 'error');
  }
}
