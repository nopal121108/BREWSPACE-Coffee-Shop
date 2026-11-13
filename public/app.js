// public/app.js - BREWSPACE Coffee Shop Management System
// Minimalist Modern Coffee Shop POS Architecture
(function() {
  'use strict';

  // Application State
  const state = {
    token: localStorage.getItem('brewspace_token') || null,
    user: JSON.parse(localStorage.getItem('brewspace_user') || 'null'),
    activeView: 'dashboard', // dashboard, pos, products, transactions, reports, users, settings
    productActiveTab: 'list', // list, categories, stocks
    cart: [],
    posProducts: [],
    posCategories: [],
    posFilterCat: 'all',
    posSearchQuery: '',
    selectedPaymentMethod: 'cash', // cash, qris, transfer
    trxFilterDate: '',
    trxFilterStatus: '',
    trxSearchQuery: '',
    reportPeriod: '7days', // today, yesterday, 7days, this_month
    settings: {
      store_name: 'BREWSPACE Coffee & Roastery',
      store_tagline: 'Crafted Coffee & Artisan Bakery',
      store_address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
      store_phone: '+62 812-3456-7890',
      receipt_footer: 'Terima kasih telah berkunjung ke BREWSPACE!',
      currency_symbol: 'Rp',
      tax_percentage: '0'
    },
    isSubmitting: false
  };

  // Helper: Format Rupiah (IDR)
  function formatRupiah(amount) {
    const num = parseInt(amount || 0, 10);
    return 'Rp ' + num.toLocaleString('id-ID');
  }

  // Helper: Format Date & Time
  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper: Format Date Only
  function formatDateOnly(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.15rem; line-height: 1;">${icon}</span>
      <span style="flex:1; font-weight: 500; font-size: 0.875rem;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // API Request Wrapper
  async function api(endpoint, options = {}) {
    const headers = options.headers || {};
    headers['Content-Type'] = 'application/json';

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));
      
      if (res.status === 401) {
        logout(false);
        showToast('Sesi masuk telah berakhir. Silakan login kembali.', 'warning');
        return null;
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      showToast(err.message, 'error');
      return null;
    }
  }

  // Fetch Store Settings
  async function loadSettings() {
    const res = await api('/api/settings');
    if (res && res.settings) {
      state.settings = { ...state.settings, ...res.settings };
    }
  }

  // Authentication: Login
  async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const btn = document.getElementById('btn-login-submit');
    const errorBanner = document.getElementById('login-error-banner');

    if (errorBanner) errorBanner.style.display = 'none';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      if (errorBanner) {
        errorBanner.textContent = 'Harap masukkan username dan kata sandi.';
        errorBanner.style.display = 'block';
      }
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memproses Masuk...';

    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    btn.disabled = false;
    btn.innerHTML = 'Masuk ke Sistem';

    if (res && res.success) {
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('brewspace_token', res.token);
      localStorage.setItem('brewspace_user', JSON.stringify(res.user));

      showToast(`Selamat datang kembali, ${res.user.fullName}!`, 'success');

      if (res.user.role === 'admin') {
        state.activeView = 'dashboard';
      } else {
        state.activeView = 'pos';
      }

      renderApp();
    } else {
      if (errorBanner) {
        errorBanner.textContent = 'Username atau kata sandi yang Anda masukkan salah.';
        errorBanner.style.display = 'block';
      }
    }
  }

  // Authentication: Logout
  async function logout(callApi = true) {
    if (callApi && state.token) {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    state.token = null;
    state.user = null;
    state.cart = [];
    localStorage.removeItem('brewspace_token');
    localStorage.removeItem('brewspace_user');
    renderApp();
  }

  // Switch Active View
  function navigateTo(view, subTab = null) {
    // Role-based route protection
    if (state.user && state.user.role === 'kasir') {
      if (view !== 'pos' && view !== 'transactions') {
        showToast('Akses dibatasi: Kasir hanya dapat mengakses kasir dan riwayat transaksi.', 'warning');
        view = 'pos';
      }
    }

    state.activeView = view;
    if (subTab) {
      state.productActiveTab = subTab;
    }

    renderApp();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
  }

  // ==========================================
  // VIEW 1: LOGIN (Minimalist Warm Modern POS)
  // ==========================================
  function renderLogin() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: var(--color-bg); padding: 1.5rem;">
        <div style="background: var(--color-card); border-radius: var(--radius-lg); max-width: 420px; width: 100%; box-shadow: var(--shadow-lg); border: 1px solid var(--color-border); overflow: hidden;">
          
          <!-- Brand Header -->
          <div style="padding: 2.25rem 2rem 1.5rem; text-align: center; border-bottom: 1px solid var(--color-border-subtle);">
            <div style="width: 52px; height: 52px; margin: 0 auto 0.85rem; background: var(--color-primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #FFFFFF; box-shadow: 0 4px 10px rgba(111,78,55,0.25);">
              ☕
            </div>
            <h1 style="font-size: 1.5rem; font-weight: 800; letter-spacing: 0.04em; color: var(--color-text); margin-bottom: 0.25rem;">BREWSPACE</h1>
            <p style="font-size: 0.8125rem; color: var(--color-text-muted); font-weight: 500;">Coffee Shop Management System</p>
          </div>

          <!-- Form Area -->
          <div style="padding: 1.75rem 2rem 2rem;">
            <div id="login-error-banner" style="display: none; background: #FDEDEC; border: 1px solid #FFCDD2; color: #C62828; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 500; margin-bottom: 1.25rem; text-align: center;">
            </div>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="login-username">Username</label>
                <input type="text" id="login-username" class="form-control" placeholder="admin atau kasir" required autofocus>
              </div>

              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" for="login-password">Kata Sandi</label>
                <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
              </div>

              <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700; font-size: 0.9375rem;">
                Masuk ke Sistem
              </button>
            </form>

            <!-- Quick Demo Accounts -->
            <div style="margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                Masuk Cepat Demo:
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-admin" style="font-weight: 600;">
                  👤 Akun Admin
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-kasir" style="font-weight: 600;">
                  ☕ Akun Kasir
                </button>
              </div>
              <div style="font-size: 0.75rem; color: var(--color-text-subtle); margin-top: 0.65rem;">
                Admin: <code>admin123</code> | Kasir: <code>kasir123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    document.getElementById('btn-quick-admin').addEventListener('click', () => {
      document.getElementById('login-username').value = 'admin';
      document.getElementById('login-password').value = 'admin123';
      document.getElementById('btn-login-submit').click();
    });

    document.getElementById('btn-quick-kasir').addEventListener('click', () => {
      document.getElementById('login-username').value = 'kasir';
      document.getElementById('login-password').value = 'kasir123';
      document.getElementById('btn-login-submit').click();
    });
  }

  // ==========================================
  // VIEW 2: SHELL LAYOUT (Sidebar & Topbar)
  // Section 6:
  // Admin: Dashboard, Produk, Transaksi, Laporan, Logout (plus secondary settings)
  // Kasir: Kasir, Riwayat Transaksi, Logout
  // ==========================================
  function renderShell(contentHtml, pageTitle, pageSubtitle) {
    const isAdmin = state.user && state.user.role === 'admin';
    const roleBadge = isAdmin 
      ? '<span class="user-role-badge badge-admin">Admin</span>' 
      : '<span class="user-role-badge badge-kasir">Kasir</span>';

    let navItems = '';
    if (isAdmin) {
      navItems = `
        <div class="nav-section-title">Menu Utama</div>
        <div class="nav-item ${state.activeView === 'dashboard' ? 'active' : ''}" data-nav="dashboard">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </div>
        <div class="nav-item ${state.activeView === 'pos' ? 'active' : ''}" data-nav="pos">
          <span class="nav-icon">☕</span>
          <span>Kasir (POS)</span>
        </div>
        <div class="nav-item ${state.activeView === 'products' ? 'active' : ''}" data-nav="products">
          <span class="nav-icon">📦</span>
          <span>Produk</span>
        </div>
        <div class="nav-item ${state.activeView === 'transactions' ? 'active' : ''}" data-nav="transactions">
          <span class="nav-icon">🧾</span>
          <span>Transaksi</span>
        </div>
        <div class="nav-item ${state.activeView === 'reports' ? 'active' : ''}" data-nav="reports">
          <span class="nav-icon">💰</span>
          <span>Laporan</span>
        </div>

        <div class="nav-section-title">Konfigurasi</div>
        <div class="nav-item ${state.activeView === 'users' ? 'active' : ''}" data-nav="users">
          <span class="nav-icon">👥</span>
          <span>Pengguna</span>
        </div>
        <div class="nav-item ${state.activeView === 'settings' ? 'active' : ''}" data-nav="settings">
          <span class="nav-icon">⚙️</span>
          <span>Pengaturan</span>
        </div>
      `;
    } else {
      navItems = `
        <div class="nav-section-title">Operasional</div>
        <div class="nav-item ${state.activeView === 'pos' ? 'active' : ''}" data-nav="pos">
          <span class="nav-icon">☕</span>
          <span>Kasir</span>
        </div>
        <div class="nav-item ${state.activeView === 'transactions' ? 'active' : ''}" data-nav="transactions">
          <span class="nav-icon">🧾</span>
          <span>Riwayat Transaksi</span>
        </div>
      `;
    }

    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-header">
            <a href="#" class="brand-logo" onclick="event.preventDefault();">
              <div class="brand-icon">☕</div>
              <div class="brand-text">
                <span class="brand-title">BREWSPACE</span>
                <span class="brand-subtitle">Coffee POS</span>
              </div>
            </a>
          </div>

          <div class="sidebar-user">
            <div class="user-avatar">${(state.user?.fullName || 'U').charAt(0).toUpperCase()}</div>
            <div class="user-info">
              <div class="user-name" title="${escapeHtml(state.user?.fullName)}">${escapeHtml(state.user?.fullName)}</div>
              ${roleBadge}
            </div>
          </div>

          <nav class="sidebar-nav">
            ${navItems}
          </nav>

          <div class="sidebar-footer">
            <button class="btn-logout" id="btn-logout">
              <span>🚪</span>
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <div class="main-wrapper">
          <header class="top-bar">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <button class="menu-toggle" id="menu-toggle" title="Menu Sidebar">☰</button>
              <div class="page-header-title">
                <h1>${escapeHtml(pageTitle)}</h1>
                <p>${escapeHtml(pageSubtitle || '')}</p>
              </div>
            </div>

            <div class="top-bar-actions">
              <div class="system-status">
                <span class="status-dot"></span>
                <span>Database Siap</span>
              </div>
              <div class="live-clock" id="live-clock">--:--:--</div>
            </div>
          </header>

          <main class="page-content" id="page-content">
            ${contentHtml}
          </main>
        </div>
      </div>
    `;

    // Live clock
    function updateClock() {
      const clockEl = document.getElementById('live-clock');
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Sidebar navigation clicks
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        navigateTo(el.getAttribute('data-nav'));
      });
    });

    // Logout click with confirmation
    document.getElementById('btn-logout').addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar dari sistem BREWSPACE?')) {
        logout(true);
      }
    });

    // Mobile menu toggle
    const toggleBtn = document.getElementById('menu-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('app-sidebar').classList.toggle('mobile-open');
      });
    }
  }

  // ==========================================
  // VIEW 3: ADMIN DASHBOARD (W8)
  // Omzet, Transaksi, 5 Produk Terlaris, Stok Menipis, Tren Penjualan
  // ==========================================
  async function renderDashboardView() {
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat ringkasan dashboard...</div>', 'Dashboard Admin', 'Ringkasan performa penjualan dan operasional kedai');

    const res = await api('/api/admin/dashboard');
    if (!res || !res.success) return;

    const s = res.stats;

    const contentHtml = `
      <!-- Stats Metric Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-primary-light); color: var(--color-primary);">💰</div>
          <div class="stat-info">
            <div class="stat-label">Total Omzet Bersih</div>
            <div class="stat-value">${formatRupiah(s.totalRevenue)}</div>
            <div class="stat-subtext">Dari transaksi yang selesai</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #E8F4FD; color: #0D47A1;">🧾</div>
          <div class="stat-info">
            <div class="stat-label">Jumlah Transaksi</div>
            <div class="stat-value">${s.totalTransactions}</div>
            <div class="stat-subtext">Pesanan terlayani</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #EDF7EE; color: #1B5E20;">📦</div>
          <div class="stat-info">
            <div class="stat-label">Produk Aktif</div>
            <div class="stat-value">${s.activeProducts}</div>
            <div class="stat-subtext">${s.activeCategories} kategori menu</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: ${s.lowStockCount > 0 ? '#FFF8E1' : '#EDF7EE'}; color: ${s.lowStockCount > 0 ? '#B78103' : '#1B5E20'};">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">Stok Menipis</div>
            <div class="stat-value" style="color: ${s.lowStockCount > 0 ? '#B78103' : '#1B5E20'};">${s.lowStockCount}</div>
            <div class="stat-subtext">Perlu restock segera</div>
          </div>
        </div>
      </div>

      <!-- Charts & Top Products -->
      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem; margin-bottom: 1.75rem;" class="dashboard-grid">
        <!-- Sales Trend SVG Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Tren Penjualan 7 Hari Terakhir</h3>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Real-time dari database</span>
          </div>
          <div style="height: 230px; display: flex; align-items: center; justify-content: center;">
            ${renderSalesChartSvg(s.salesChart7Days)}
          </div>
        </div>

        <!-- 5 Produk Terlaris (W8) -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">5 Produk Terlaris</h3>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Berdasarkan porsi</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${s.topProducts.length === 0 ? '<div style="color: var(--color-text-subtle); text-align: center; padding: 2rem 0;">Belum ada penjualan tercatat.</div>' :
              s.topProducts.slice(0, 5).map((p, idx) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.65rem; border-bottom: 1px dashed var(--color-border-subtle);">
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <span style="width: 24px; height: 24px; border-radius: 50%; background: ${idx === 0 ? 'var(--color-primary)' : 'var(--color-bg)'}; color: ${idx === 0 ? '#FFF' : 'var(--color-text)'}; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">
                      ${idx + 1}
                    </span>
                    <div>
                      <div style="font-weight: 600; font-size: 0.875rem; color: var(--color-text);">${escapeHtml(p.product_name)}</div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted);">${escapeHtml(p.category_name)}</div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 0.875rem; color: var(--color-primary);">${p.total_sold} terjual</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted);">${formatRupiah(p.total_revenue)}</div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>

      <!-- Low Stock Warning & Recent Transactions Table -->
      <div style="display: grid; grid-template-columns: ${s.lowStockProducts.length > 0 ? '1fr 2fr' : '1fr'}; gap: 1.5rem;">
        ${s.lowStockProducts.length > 0 ? `
          <div class="card" style="border-left: 4px solid var(--status-warning-text);">
            <div class="card-header">
              <h3 class="card-title" style="color: var(--status-warning-text); display: flex; align-items: center; gap: 0.4rem;">
                <span>⚠️</span> Peringatan Stok
              </h3>
              <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.navigateTo('products', 'stocks')">Kelola Stok</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${s.lowStockProducts.slice(0, 6).map(p => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--status-warning-bg); border-radius: var(--radius-sm); border: 1px solid var(--status-warning-border);">
                  <div>
                    <div style="font-weight: 600; font-size: 0.8125rem; color: var(--color-text);">${escapeHtml(p.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--status-warning-text);">Min: ${p.min_stock} unit</div>
                  </div>
                  <span class="status-badge badge-warning" style="font-weight: 700;">
                    Sisa ${p.stock}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Transaksi Selesai Terbaru</h3>
            <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.navigateTo('transactions')">Lihat Semua</button>
          </div>
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Kasir</th>
                  <th>Item</th>
                  <th>Total</th>
                  <th>Waktu</th>
                  <th style="text-align: right;">Struk</th>
                </tr>
              </thead>
              <tbody>
                ${s.recentTransactions.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.75rem; color: var(--color-text-muted);">Belum ada transaksi</td></tr>' :
                  s.recentTransactions.map(t => `
                    <tr>
                      <td style="font-weight: 700; font-family: var(--font-mono); font-size: 0.8125rem;">${escapeHtml(t.invoice_number)}</td>
                      <td>${escapeHtml(t.cashier_name)}</td>
                      <td>${t.total_items} menu</td>
                      <td style="font-weight: 700; color: var(--color-primary);">${formatRupiah(t.total_amount)}</td>
                      <td style="font-size: 0.8125rem; color: var(--color-text-muted);">${formatDateTime(t.created_at)}</td>
                      <td style="text-align: right;">
                        <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.showReceiptModal('${t.invoice_number}')">
                          🧾 Struk
                        </button>
                      </td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    renderShell(contentHtml, 'Dashboard Admin', 'Ringkasan performa penjualan dan operasional kedai');
  }

  // Render SVG Sales Bar Chart (Clean Coffee Brown #6F4E37)
  function renderSalesChartSvg(data) {
    if (!data || data.length === 0) {
      return '<div style="color: var(--color-text-subtle); font-size: 0.875rem;">Belum ada riwayat omzet 7 hari terakhir.</div>';
    }

    const maxVal = Math.max(...data.map(d => d.daily_revenue), 50000);
    const width = 500;
    const height = 180;
    const padding = 35;

    const barWidth = 36;
    const availableWidth = width - padding * 2;
    const gap = (availableWidth - data.length * barWidth) / Math.max(data.length - 1, 1);

    const bars = data.map((d, i) => {
      const h = Math.max(8, Math.round((d.daily_revenue / maxVal) * (height - padding * 2)));
      const x = padding + i * (barWidth + gap);
      const y = height - padding - h;
      const dateLabel = d.date.substring(5);

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="5" fill="#6F4E37" opacity="0.9">
          <title>${d.date}: ${formatRupiah(d.daily_revenue)} (${d.transaction_count} pesanan)</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#282522">
          ${Math.round(d.daily_revenue / 1000)}k
        </text>
        <text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#6B645D" font-weight="500">
          ${dateLabel}
        </text>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding + 10}" y2="${height - padding}" stroke="#E8E0D5" stroke-width="1.5" />
        ${bars}
      </svg>
    `;
  }

  // ==========================================
  // VIEW 4: KASIR POS (Point of Sale) - (W3, W4, W6)
  // Alur Kasir, Keranjang, Metode Bayar, Anti-Stok Minus, Anti-Double Submit
  // ==========================================
  async function renderPosView() {
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat katalog produk kasir...</div>', 'Kasir POS', 'Pencatatan pesanan dan transaksi kasir');

    const res = await api('/api/pos/products');
    if (!res || !res.success) return;

    state.posProducts = res.products || [];
    state.posCategories = res.categories || [];

    updatePosDom();
  }

  function updatePosDom() {
    // Filter products
    const filtered = state.posProducts.filter(p => {
      const matchesCat = state.posFilterCat === 'all' || String(p.category_id) === String(state.posFilterCat);
      const matchesSearch = !state.posSearchQuery || p.name.toLowerCase().includes(state.posSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });

    // Category pills HTML
    const catPillsHtml = `
      <div class="category-pill ${state.posFilterCat === 'all' ? 'active' : ''}" data-cat-id="all">
        Semua Menu (${state.posProducts.length})
      </div>
      ${state.posCategories.map(c => `
        <div class="category-pill ${String(state.posFilterCat) === String(c.id) ? 'active' : ''}" data-cat-id="${c.id}">
          ${escapeHtml(c.name)}
        </div>
      `).join('')}
    `;

    // Products grid HTML
    const productsHtml = filtered.length === 0 ? `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--color-text-muted);">
        <div style="font-size: 2.25rem; margin-bottom: 0.5rem;">🔍</div>
        <div style="font-weight: 700; font-size: 1rem; color: var(--color-text);">Menu tidak ditemukan</div>
        <div style="font-size: 0.8125rem; margin-top: 0.25rem;">Coba ganti kata kunci pencarian atau pilih kategori Semua Menu.</div>
      </div>
    ` : filtered.map(p => {
      const isOutOfStock = p.stock <= 0;
      let stockTag = `<span class="stock-tag tag-instock">Stok: ${p.stock}</span>`;
      if (p.stock <= 0) {
        stockTag = `<span class="stock-tag tag-outstock">Habis</span>`;
      } else if (p.stock <= p.min_stock) {
        stockTag = `<span class="stock-tag tag-lowstock">Sisa ${p.stock}</span>`;
      }

      const imgUri = window.CoffeeImages.getImage(p.image_url, p.name, p.category_slug);

      return `
        <div class="product-pos-card ${isOutOfStock ? 'out-of-stock' : ''}" data-prod-id="${p.id}">
          <div class="product-pos-img-wrapper">
            <img src="${imgUri}" alt="${escapeHtml(p.name)}" class="product-pos-img" loading="lazy">
            ${stockTag}
          </div>
          <div class="product-pos-info">
            <span class="product-pos-cat">${escapeHtml(p.category_name)}</span>
            <h4 class="product-pos-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h4>
            <div class="product-pos-footer">
              <span class="product-pos-price">${formatRupiah(p.price)}</span>
              <button class="btn-add-cart-mini" ${isOutOfStock ? 'disabled' : ''} title="${isOutOfStock ? 'Stok habis' : 'Tambah ke pesanan'}">
                +
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Cart calculations
    const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const taxPct = parseFloat(state.settings.tax_percentage || '0') || 0;
    const taxAmount = Math.round((subtotal * taxPct) / 100);
    const grandTotal = subtotal + taxAmount;

    const contentHtml = `
      <div class="pos-container">
        <!-- Catalog Pane (Left) -->
        <div class="pos-catalog-pane">
          <div class="pos-controls">
            <div class="pos-search-box">
              <span class="pos-search-icon">🔍</span>
              <input type="text" id="pos-search-input" class="pos-search-input" placeholder="Cari kopi, pastry, camilan..." value="${escapeHtml(state.posSearchQuery)}">
            </div>
            <div class="category-pills">
              ${catPillsHtml}
            </div>
          </div>

          <div class="pos-products-grid">
            ${productsHtml}
          </div>
        </div>

        <!-- Cart & Checkout Pane (Right) -->
        <div class="pos-cart-pane">
          <div class="pos-cart-header">
            <div class="cart-title">
              <span>🛒</span>
              <span>Pesanan Kasir</span>
              <span class="cart-items-count">${state.cart.reduce((sum, i) => sum + i.quantity, 0)} item</span>
            </div>
            ${state.cart.length > 0 ? `<button class="btn-clear-cart" id="btn-clear-cart">Kosongkan</button>` : ''}
          </div>

          <div class="pos-cart-items" id="pos-cart-items">
            ${state.cart.length === 0 ? `
              <div class="cart-empty-state">
                <div style="font-size: 2.75rem; opacity: 0.35;">☕</div>
                <div style="font-weight: 700; color: var(--color-text);">Keranjang Kasir Kosong</div>
                <div style="font-size: 0.8125rem;">Klik menu di sebelah kiri untuk memasukkan pesanan pelanggan.</div>
              </div>
            ` : state.cart.map((item) => `
              <div class="cart-item-row">
                <div class="cart-item-info">
                  <div class="cart-item-name">${escapeHtml(item.product.name)}</div>
                  <div class="cart-item-price">${formatRupiah(item.product.price)}</div>
                </div>
                <div class="cart-item-controls">
                  <button class="btn-qty" onclick="window.BrewApp.updateCartQty(${item.product.id}, -1)">-</button>
                  <span class="cart-item-qty">${item.quantity}</span>
                  <button class="btn-qty" onclick="window.BrewApp.updateCartQty(${item.product.id}, 1)">+</button>
                </div>
                <div class="cart-item-subtotal">${formatRupiah(item.product.price * item.quantity)}</div>
                <button class="btn-remove-item" onclick="window.BrewApp.removeCartItem(${item.product.id})" title="Hapus">✕</button>
              </div>
            `).join('')}
          </div>

          <!-- Checkout & Payment Details -->
          <div class="pos-cart-footer">
            <div style="margin-bottom: 0.5rem;">
              <input type="text" id="pos-customer-name" class="form-control" placeholder="Nama Pelanggan (Opsional / Tamu)" style="padding: 0.45rem 0.75rem; font-size: 0.8125rem;">
            </div>

            <div class="summary-line">
              <span>Subtotal:</span>
              <span>${formatRupiah(subtotal)}</span>
            </div>
            ${taxPct > 0 ? `
              <div class="summary-line">
                <span>Pajak (${taxPct}%):</span>
                <span>${formatRupiah(taxAmount)}</span>
              </div>
            ` : ''}
            <div class="summary-line total">
              <span>Total Tagihan:</span>
              <span id="pos-grand-total" style="color: var(--color-primary);">${formatRupiah(grandTotal)}</span>
            </div>

            <!-- Payment Methods (W4) -->
            <div class="payment-section">
              <label class="form-label" style="margin-bottom: 0.4rem; font-size: 0.75rem; font-weight: 600;">Metode Pembayaran:</label>
              
              <div class="payment-methods-selector">
                <button type="button" class="payment-method-btn ${state.selectedPaymentMethod === 'cash' ? 'active' : ''}" onclick="window.BrewApp.setPaymentMethod('cash')">
                  <span class="pm-icon">💵</span>
                  <span>Tunai</span>
                </button>
                <button type="button" class="payment-method-btn ${state.selectedPaymentMethod === 'qris' ? 'active' : ''}" onclick="window.BrewApp.setPaymentMethod('qris')">
                  <span class="pm-icon">📱</span>
                  <span>QRIS</span>
                </button>
                <button type="button" class="payment-method-btn ${state.selectedPaymentMethod === 'transfer' ? 'active' : ''}" onclick="window.BrewApp.setPaymentMethod('transfer')">
                  <span class="pm-icon">🏦</span>
                  <span>Transfer</span>
                </button>
              </div>

              <!-- Cash Mode -->
              ${state.selectedPaymentMethod === 'cash' ? `
                <div class="quick-cash-row">
                  <button type="button" class="btn-quick-cash" onclick="window.BrewApp.setQuickCash(${grandTotal})">Uang Pas</button>
                  <button type="button" class="btn-quick-cash" onclick="window.BrewApp.setQuickCash(50000)">Rp 50.000</button>
                  <button type="button" class="btn-quick-cash" onclick="window.BrewApp.setQuickCash(100000)">Rp 100.000</button>
                </div>

                <div class="cash-input-group">
                  <span class="cash-input-prefix">Rp</span>
                  <input type="number" id="pos-cash-input" class="cash-input" placeholder="0" min="${grandTotal}" step="1000">
                </div>

                <div class="change-display">
                  <span style="font-weight: 500;">Kembalian:</span>
                  <span class="change-amount" id="pos-change-display">Rp 0</span>
                </div>
              ` : state.selectedPaymentMethod === 'qris' ? `
                <!-- QRIS Mode -->
                <div class="non-cash-box">
                  <div class="qris-display-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px dashed var(--color-border); padding-bottom: 0.35rem;">
                      <span style="font-weight: 700; color: #096DD9; font-size: 0.8125rem;">QRIS DINAMIS</span>
                      <span style="font-size: 0.6875rem; background: #E6F7FF; color: #096DD9; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">NMID: ID1029384756</span>
                    </div>
                    <div style="background: #FFF; padding: 0.4rem; border: 1.5px solid #282522; border-radius: 8px; margin: 0.35rem 0; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center;">
                      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
                        <rect width="100" height="100" fill="#FFF"/>
                        <rect x="6" y="6" width="28" height="28" fill="#282522"/>
                        <rect x="10" y="10" width="20" height="20" fill="#FFF"/>
                        <rect x="14" y="14" width="12" height="12" fill="#282522"/>
                        <rect x="66" y="6" width="28" height="28" fill="#282522"/>
                        <rect x="70" y="10" width="20" height="20" fill="#FFF"/>
                        <rect x="74" y="14" width="12" height="12" fill="#282522"/>
                        <rect x="6" y="66" width="28" height="28" fill="#282522"/>
                        <rect x="10" y="70" width="20" height="20" fill="#FFF"/>
                        <rect x="14" y="74" width="12" height="12" fill="#282522"/>
                        <rect x="38" y="12" width="6" height="6" fill="#282522"/>
                        <rect x="50" y="18" width="8" height="8" fill="#282522"/>
                        <rect x="38" y="38" width="24" height="24" fill="#6F4E37"/>
                        <rect x="44" y="44" width="12" height="12" fill="#FFF"/>
                        <circle cx="50" cy="50" r="3" fill="#6F4E37"/>
                        <rect x="70" y="42" width="8" height="8" fill="#282522"/>
                        <rect x="38" y="72" width="10" height="10" fill="#282522"/>
                        <rect x="58" y="68" width="8" height="8" fill="#282522"/>
                        <rect x="74" y="74" width="14" height="14" fill="#282522"/>
                      </svg>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted);">BCA, Mandiri, GoPay, OVO, Dana, ShopeePay</div>
                    <div style="font-weight: 700; color: #1B5E20; font-size: 0.875rem;">Tagihan Pas: ${formatRupiah(grandTotal)}</div>
                  </div>
                </div>
              ` : `
                <!-- Bank Transfer Mode -->
                <div class="non-cash-box">
                  <div class="transfer-bank-card">
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">REKENING RESMI KEDAI:</div>
                    <div class="bank-row">
                      <div>
                        <div style="font-weight: 700; color: #00529C;">BCA: 8820-1234-5678</div>
                        <div style="font-size: 0.6875rem; color: #666;">a.n BREWSPACE NUSANTARA</div>
                      </div>
                      <button type="button" class="copy-btn" onclick="navigator.clipboard.writeText('882012345678'); window.BrewApp.showToast('No. Rekening BCA disalin!', 'success');">Salin</button>
                    </div>
                    <div class="bank-row">
                      <div>
                        <div style="font-weight: 700; color: #E58300;">Mandiri: 137-00-9876543-2</div>
                        <div style="font-size: 0.6875rem; color: #666;">a.n BREWSPACE NUSANTARA</div>
                      </div>
                      <button type="button" class="copy-btn" onclick="navigator.clipboard.writeText('1370098765432'); window.BrewApp.showToast('No. Rekening Mandiri disalin!', 'success');">Salin</button>
                    </div>
                  </div>
                </div>
              `}

              <!-- Pay Button with Anti-Double Click Protection -->
              <button class="btn-pay-now" id="btn-pay-now" ${state.cart.length === 0 || (state.selectedPaymentMethod === 'cash' && grandTotal > 0 && !(parseInt(document.getElementById('pos-cash-input')?.value || '0', 10) >= grandTotal)) ? 'disabled' : ''}>
                <span>✅</span>
                <span>${state.selectedPaymentMethod === 'cash' ? 'Proses Pembayaran Tunai' : state.selectedPaymentMethod === 'qris' ? 'Konfirmasi Bayar QRIS' : 'Konfirmasi Transfer Bank'}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Floating Cart Toggle Bar (W9) -->
        <div class="mobile-cart-toggle-bar" id="mobile-cart-toggle" onclick="window.BrewApp.toggleMobileCart(true)">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span>🛒</span>
            <span>${state.cart.reduce((sum, i) => sum + i.quantity, 0)} Item</span>
          </div>
          <div>
            <span>${formatRupiah(grandTotal)}</span>
            <span style="margin-left: 0.5rem; font-size: 0.75rem; background: var(--color-primary); padding: 0.25rem 0.6rem; border-radius: 4px; color: #FFFFFF;">Lihat Keranjang ➔</span>
          </div>
        </div>

        <div class="cart-drawer-overlay" id="cart-drawer-overlay" onclick="window.BrewApp.toggleMobileCart(false)"></div>
      </div>
    `;

    renderShell(contentHtml, 'Kasir POS', 'Pencatatan pesanan dan transaksi kasir');

    // Attach Event Handlers
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.posSearchQuery = e.target.value;
        updatePosDom();
        const ref = document.getElementById('pos-search-input');
        if (ref) {
          ref.focus();
          ref.setSelectionRange(ref.value.length, ref.value.length);
        }
      });
    }

    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.posFilterCat = pill.getAttribute('data-cat-id');
        updatePosDom();
      });
    });

    document.querySelectorAll('.product-pos-card:not(.out-of-stock)').forEach(card => {
      card.addEventListener('click', () => {
        const prodId = parseInt(card.getAttribute('data-prod-id'), 10);
        addToCart(prodId);
      });
    });

    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Kosongkan semua pesanan di keranjang?')) {
          state.cart = [];
          updatePosDom();
        }
      });
    }

    const cashInput = document.getElementById('pos-cash-input');
    if (cashInput) {
      cashInput.addEventListener('input', () => {
        calculateChange(grandTotal);
      });
    }

    const payBtn = document.getElementById('btn-pay-now');
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        processCheckout(grandTotal);
      });
    }
  }

  // Cart Management
  function addToCart(productId) {
    const prod = state.posProducts.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
      showToast(`Stok "${prod.name}" sudah habis.`, 'warning');
      return;
    }

    const existingIndex = state.cart.findIndex(i => i.product.id === productId);
    if (existingIndex > -1) {
      if (state.cart[existingIndex].quantity + 1 > prod.stock) {
        showToast(`Stok "${prod.name}" hanya tersisa ${prod.stock} unit.`, 'warning');
        return;
      }
      state.cart[existingIndex].quantity += 1;
    } else {
      state.cart.push({
        product: prod,
        quantity: 1
      });
    }

    updatePosDom();
  }

  function updateCartQty(productId, delta) {
    const itemIndex = state.cart.findIndex(i => i.product.id === productId);
    if (itemIndex === -1) return;

    const item = state.cart[itemIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      state.cart.splice(itemIndex, 1);
    } else {
      if (newQty > item.product.stock) {
        showToast(`Stok maksimum tercapai (${item.product.stock} unit).`, 'warning');
        return;
      }
      item.quantity = newQty;
    }

    updatePosDom();
  }

  function removeCartItem(productId) {
    state.cart = state.cart.filter(i => i.product.id !== productId);
    updatePosDom();
  }

  function setQuickCash(amount) {
    const cashInput = document.getElementById('pos-cash-input');
    if (cashInput) {
      cashInput.value = amount;
      cashInput.dispatchEvent(new Event('input'));
    }
  }

  function calculateChange(grandTotal) {
    const cashInput = document.getElementById('pos-cash-input');
    const changeDisplay = document.getElementById('pos-change-display');
    const payBtn = document.getElementById('btn-pay-now');

    const received = parseInt(cashInput ? cashInput.value || '0' : '0', 10);
    const change = received - grandTotal;

    if (received >= grandTotal && grandTotal > 0) {
      if (changeDisplay) {
        changeDisplay.textContent = formatRupiah(change);
        changeDisplay.style.color = 'var(--status-success-text)';
      }
      if (payBtn) payBtn.disabled = false;
    } else {
      if (changeDisplay) {
        changeDisplay.textContent = 'Kurang ' + formatRupiah(grandTotal - received);
        changeDisplay.style.color = 'var(--status-danger-text)';
      }
      if (payBtn) payBtn.disabled = true;
    }
  }

  function setPaymentMethod(method) {
    state.selectedPaymentMethod = method;
    updatePosDom();
  }

  function toggleMobileCart(open = true) {
    const cartPane = document.querySelector('.pos-cart-pane');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (cartPane) {
      if (open) cartPane.classList.add('drawer-open');
      else cartPane.classList.remove('drawer-open');
    }
    if (overlay) {
      if (open) overlay.classList.add('active');
      else overlay.classList.remove('active');
    }
  }

  // Atomic Checkout Process (W3, W4, W6)
  async function processCheckout(grandTotal) {
    if (state.isSubmitting) return;

    if (state.cart.length === 0) {
      showToast('Keranjang kasir masih kosong.', 'warning');
      return;
    }

    const method = state.selectedPaymentMethod || 'cash';
    let received = grandTotal;

    if (method === 'cash') {
      const cashInput = document.getElementById('pos-cash-input');
      received = parseInt(cashInput ? cashInput.value || '0' : '0', 10);
      if (received < grandTotal) {
        showToast('Jumlah uang tunai yang diterima kurang dari total belanja!', 'error');
        return;
      }
    }

    const customerInput = document.getElementById('pos-customer-name');
    const customerName = customerInput ? customerInput.value.trim() : '';

    const payload = {
      items: state.cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity
      })),
      cashReceived: received,
      customerName: customerName || 'Tamu',
      paymentMethod: method
    };

    state.isSubmitting = true;
    const payBtn = document.getElementById('btn-pay-now');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span> Menyimpan Transaksi...';
    }

    const res = await api('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    state.isSubmitting = false;

    if (res && res.success) {
      showToast(`Pembayaran berhasil! Invoice: ${res.receipt.invoiceNumber}`, 'success');
      state.cart = [];
      toggleMobileCart(false);
      showReceiptModal(res.receipt.invoiceNumber, res.receipt);
    } else {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `<span>✅</span><span>${method === 'cash' ? 'Proses Pembayaran Tunai' : method === 'qris' ? 'Konfirmasi Bayar QRIS' : 'Konfirmasi Transfer Bank'}</span>`;
      }
    }
  }

  // ==========================================
  // VIEW 5: STRUK TRANSAKSI (W5)
  // Cetak Struk, Unduh PDF, Transaksi Baru
  // ==========================================
  async function showReceiptModal(invoiceNumber, preloadedReceipt = null) {
    let receiptData = preloadedReceipt;

    if (!receiptData) {
      const res = await api(`/api/pos/receipt/${invoiceNumber}`);
      if (!res || !res.success) return;
      receiptData = res.receipt;
    }

    const items = receiptData.items || [];
    const settings = receiptData.settings || state.settings;
    const paymentMethod = (receiptData.payment_method || receiptData.paymentMethod || 'cash').toLowerCase();

    let paymentBadge = '<span class="status-badge badge-neutral">💵 Tunai</span>';
    if (paymentMethod === 'qris') paymentBadge = '<span class="status-badge badge-qris">📱 QRIS</span>';
    else if (paymentMethod === 'transfer') paymentBadge = '<span class="status-badge badge-transfer">🏦 Transfer</span>';

    const modalHtml = `
      <div class="modal-overlay open" id="receipt-modal">
        <div class="modal-dialog" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="modal-title">Struk Transaksi Penjualan</h3>
            <button class="modal-close" onclick="document.getElementById('receipt-modal').remove()">✕</button>
          </div>

          <div class="modal-body" style="background: var(--color-bg); padding: 1.5rem;">
            <!-- Thermal Receipt Card -->
            <div class="thermal-receipt" id="printable-receipt-area">
              <div class="receipt-center">
                <div style="font-weight: 800; font-size: 15px; letter-spacing: 0.05em;">${escapeHtml(settings.store_name || 'BREWSPACE')}</div>
                <div style="font-size: 10px; color: #444; margin-top: 2px;">${escapeHtml(settings.store_tagline || '')}</div>
                <div style="font-size: 10px; color: #555;">${escapeHtml(settings.store_address || '')}</div>
                <div style="font-size: 10px; color: #555;">Telp: ${escapeHtml(settings.store_phone || '')}</div>
              </div>

              <div class="receipt-divider"></div>

              <div style="font-size: 11px;">
                <div>No. Invoice : ${escapeHtml(receiptData.invoice_number || receiptData.invoiceNumber)}</div>
                <div>Waktu       : ${formatDateTime(receiptData.created_at || receiptData.date)}</div>
                <div>Kasir       : ${escapeHtml(receiptData.cashier_name || receiptData.cashierName)}</div>
                <div>Pelanggan   : ${escapeHtml(receiptData.customer_name || receiptData.customerName || 'Tamu')}</div>
              </div>

              <div class="receipt-divider"></div>

              <table class="receipt-table">
                ${items.map(it => `
                  <tr>
                    <td colspan="2" style="font-weight: 700;">${escapeHtml(it.product_name || it.name)}</td>
                  </tr>
                  <tr>
                    <td style="color: #444;">${it.quantity} x ${formatRupiah(it.price)}</td>
                    <td style="text-align: right; font-weight: 700;">${formatRupiah(it.subtotal)}</td>
                  </tr>
                `).join('')}
              </table>

              <div class="receipt-divider"></div>

              <table class="receipt-table" style="font-weight: 600;">
                <tr>
                  <td>Subtotal</td>
                  <td style="text-align: right;">${formatRupiah(receiptData.subtotal)}</td>
                </tr>
                ${receiptData.tax > 0 ? `
                  <tr>
                    <td>Pajak</td>
                    <td style="text-align: right;">${formatRupiah(receiptData.tax)}</td>
                  </tr>
                ` : ''}
                <tr style="font-size: 13px;">
                  <td style="font-weight: 800;">TOTAL TAGIHAN</td>
                  <td style="text-align: right; font-weight: 800;">${formatRupiah(receiptData.total_amount || receiptData.total)}</td>
                </tr>
                <tr>
                  <td>Metode Bayar</td>
                  <td style="text-align: right;">${paymentBadge}</td>
                </tr>
                ${paymentMethod === 'cash' ? `
                  <tr>
                    <td>Uang Diterima</td>
                    <td style="text-align: right;">${formatRupiah(receiptData.cash_received || receiptData.cashReceived)}</td>
                  </tr>
                  <tr>
                    <td>Kembalian</td>
                    <td style="text-align: right;">${formatRupiah(receiptData.change_amount || receiptData.change)}</td>
                  </tr>
                ` : ''}
              </table>

              <div class="receipt-divider"></div>

              <div class="receipt-center" style="font-size: 10px; color: #555; margin-top: 8px;">
                ${escapeHtml(settings.receipt_footer || 'Terima kasih telah berkunjung ke BREWSPACE!')}
              </div>
            </div>
          </div>

          <div class="modal-footer" style="justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('receipt-modal').remove(); window.BrewApp.navigateTo('pos');">
              ✨ Transaksi Baru
            </button>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.downloadReceiptPdf('${escapeHtml(receiptData.invoice_number || receiptData.invoiceNumber)}')">
                📥 Unduh PDF
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.print()">
                🖨️ Cetak Struk
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('receipt-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Genuine PDF Receipt Generator & Downloader (W5)
  function downloadReceiptPdf(invoiceNumber, preloadedReceipt = null) {
    const doDownload = (receiptData) => {
      const settings = receiptData.settings || state.settings;
      const items = receiptData.items || [];
      const storeName = settings.store_name || 'BREWSPACE';
      const address = settings.store_address || '';
      const phone = settings.store_phone || '';
      const footer = settings.receipt_footer || 'Terima kasih telah berkunjung ke BREWSPACE!';
      const cashier = receiptData.cashier_name || receiptData.cashierName || 'Kasir';
      const customer = receiptData.customer_name || receiptData.customerName || 'Tamu';
      const date = formatDateTime(receiptData.created_at || receiptData.date);
      const subtotal = formatRupiah(receiptData.subtotal);
      const tax = receiptData.tax > 0 ? formatRupiah(receiptData.tax) : null;
      const total = formatRupiah(receiptData.total_amount || receiptData.total);
      const paymentMethod = (receiptData.payment_method || receiptData.paymentMethod || 'cash').toUpperCase();
      const cash = formatRupiah(receiptData.cash_received || receiptData.cashReceived);
      const change = formatRupiah(receiptData.change_amount || receiptData.change);

      const lines = [
        storeName,
        address,
        'Telp: ' + phone,
        '========================================',
        `No. Invoice : ${invoiceNumber}`,
        `Waktu       : ${date}`,
        `Kasir       : ${cashier}`,
        `Pelanggan   : ${customer}`,
        '----------------------------------------',
        'PRODUK             QTY  HARGA   SUBTOTAL',
        '----------------------------------------'
      ];

      items.forEach(it => {
        const rawName = (it.product_name || it.name || '').substring(0, 18).padEnd(19, ' ');
        const qty = String(it.quantity).padStart(2, ' ');
        const price = formatRupiah(it.price).replace('Rp ', '').padStart(7, ' ');
        const subt = formatRupiah(it.subtotal).replace('Rp ', '').padStart(8, ' ');
        lines.push(`${rawName} ${qty} ${price} ${subt}`);
      });

      lines.push('----------------------------------------');
      lines.push(`Subtotal         : ${subtotal}`);
      if (tax) lines.push(`Pajak            : ${tax}`);
      lines.push(`TOTAL TAGIHAN    : ${total}`);
      lines.push(`Metode Bayar     : ${paymentMethod}`);
      if (paymentMethod === 'CASH') {
        lines.push(`Uang Diterima    : ${cash}`);
        lines.push(`Kembalian        : ${change}`);
      }
      lines.push('========================================');
      lines.push(footer);

      // Build genuine PDF 1.4 binary stream
      let streamContent = 'BT\n/F1 9 Tf\n13 TL\n24 760 Td\n';
      lines.forEach((line, idx) => {
        const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        if (idx === 0) {
          streamContent += `(${escaped}) Tj\n`;
        } else {
          streamContent += `T* (${escaped}) Tj\n`;
        }
      });
      streamContent += 'ET\n';

      const streamLength = streamContent.length;

      let body = '%PDF-1.4\n';
      const o1 = body.length; body += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
      const o2 = body.length; body += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
      const o3 = body.length; body += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 280 800] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
      const o4 = body.length; body += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;
      const o5 = body.length; body += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n';
      const xrefOffset = body.length;
      const pad = (n) => String(n).padStart(10, '0');
      body += `xref\n0 6\n0000000000 65535 f \n${pad(o1)} 00000 n \n${pad(o2)} 00000 n \n${pad(o3)} 00000 n \n${pad(o4)} 00000 n \n${pad(o5)} 00000 n \n`;
      body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

      const blob = new Blob([body], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Struk-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 300);
      showToast(`Struk PDF (${invoiceNumber}) berhasil diunduh.`, 'success');
    };

    if (preloadedReceipt) {
      doDownload(preloadedReceipt);
    } else {
      api(`/api/pos/receipt/${invoiceNumber}`).then(res => {
        if (res && res.success) {
          doDownload(res.receipt);
        } else {
          showToast('Gagal mengunduh struk.', 'error');
        }
      });
    }
  }

  // ==========================================
  // VIEW 6: PRODUK (Admin Only) - (W2)
  // Sub-tabs: Daftar Menu Produk, Kelola Kategori, Mutasi Stok
  // ==========================================
  async function renderProductsView() {
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat katalog produk...</div>', 'Manajemen Produk', 'Kelola menu kopi, kategori, harga, stok, dan mutasi');

    const [prodRes, catRes, stockRes, histRes] = await Promise.all([
      api('/api/admin/products'),
      api('/api/admin/categories'),
      api('/api/admin/stocks'),
      api('/api/admin/stocks/history')
    ]);

    if (!prodRes || !catRes) return;

    const products = prodRes.products || [];
    const categories = catRes.categories || [];
    const stocks = stockRes ? stockRes.stocks || [] : [];
    const history = histRes ? histRes.history || [] : [];

    const activeTab = state.productActiveTab || 'list';

    // Segmented tab navigation
    const tabSelectorHtml = `
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem;">
        <button class="btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.setProductTab('list')">
          📦 Daftar Menu (${products.length})
        </button>
        <button class="btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.setProductTab('categories')">
          🏷️ Kelola Kategori (${categories.length})
        </button>
        <button class="btn ${activeTab === 'stocks' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.setProductTab('stocks')">
          📈 Audit & Mutasi Stok (${stocks.filter(s => s.stock <= s.min_stock).length} Menipis)
        </button>
      </div>
    `;

    let mainContentHtml = '';

    // Tab 1: Daftar Menu Produk
    if (activeTab === 'list') {
      mainContentHtml = `
        <div class="table-container">
          <div class="table-toolbar">
            <div style="display: flex; gap: 0.75rem; flex: 1; max-width: 400px;">
              <input type="text" id="prod-search-input" class="form-control" placeholder="Cari nama menu..." style="padding: 0.45rem 0.85rem; font-size: 0.875rem;">
            </div>
            <button class="btn btn-primary" id="btn-add-product">
              ➕ Tambah Menu Baru
            </button>
          </div>

          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th style="width: 55px;">Foto</th>
                  <th>Nama Menu</th>
                  <th>Kategori</th>
                  <th>Harga Satuan</th>
                  <th>Stok Gudang</th>
                  <th>Status Jual</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody id="products-table-body">
                ${products.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:2rem; color: var(--color-text-muted);">Belum ada produk terdaftar.</td></tr>' :
                  products.map(p => {
                    const imgUri = window.CoffeeImages.getImage(p.image_url, p.name, p.category_slug);
                    const isActive = p.status === 'active';
                    let stockBadge = `<span class="status-badge badge-success">${p.stock} Tersedia</span>`;
                    if (p.stock <= 0) stockBadge = `<span class="status-badge badge-danger">0 Habis</span>`;
                    else if (p.stock <= p.min_stock) stockBadge = `<span class="status-badge badge-warning">${p.stock} Menipis</span>`;

                    return `
                      <tr class="prod-row" data-name="${escapeHtml(p.name).toLowerCase()}">
                        <td>
                          <img src="${imgUri}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid var(--color-border);">
                        </td>
                        <td>
                          <div style="font-weight: 700; color: var(--color-text);">${escapeHtml(p.name)}</div>
                          <div style="font-size: 0.75rem; color: var(--color-text-muted);">${escapeHtml(p.description || '')}</div>
                        </td>
                        <td><span class="status-badge badge-neutral">${escapeHtml(p.category_name)}</span></td>
                        <td style="font-weight: 700; color: var(--color-primary);">${formatRupiah(p.price)}</td>
                        <td>${stockBadge}</td>
                        <td>
                          <span class="status-badge ${isActive ? 'badge-success' : 'badge-danger'}">
                            ${isActive ? '● Aktif' : '○ Nonaktif'}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <div style="display: inline-flex; gap: 0.4rem;">
                            <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.openProductModal(${p.id})">Edit</button>
                            <button class="btn ${isActive ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.toggleProductStatus(${p.id})">
                              ${isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    // Tab 2: Kelola Kategori
    else if (activeTab === 'categories') {
      mainContentHtml = `
        <div class="table-container">
          <div class="table-toolbar">
            <div style="font-weight: 700; color: var(--color-text); font-size: 0.9375rem;">
              Daftar Kategori Menu (${categories.length})
            </div>
            <button class="btn btn-primary" id="btn-add-category">
              ➕ Tambah Kategori
            </button>
          </div>

          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Nama Kategori</th>
                  <th>Kode Slug</th>
                  <th>Deskripsi</th>
                  <th>Jumlah Menu</th>
                  <th>Status</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${categories.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:2rem; color: var(--color-text-muted);">Belum ada kategori terdaftar.</td></tr>' :
                  categories.map(c => `
                    <tr>
                      <td style="font-weight: 700; color: var(--color-text);">${escapeHtml(c.name)}</td>
                      <td style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-primary);">${escapeHtml(c.slug)}</td>
                      <td style="color: var(--color-text-muted); font-size: 0.8125rem;">${escapeHtml(c.description || '-')}</td>
                      <td><span class="status-badge badge-neutral">${c.product_count} produk</span></td>
                      <td>
                        <span class="status-badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}">
                          ${c.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.4rem;">
                          <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.openCategoryModal(${c.id})">Edit</button>
                          <button class="btn ${c.status === 'active' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.toggleCategoryStatus(${c.id})">
                            ${c.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    // Tab 3: Status & Mutasi Stok
    else if (activeTab === 'stocks') {
      const lowCount = stocks.filter(s => s.stock_status === 'low_stock').length;
      const outCount = stocks.filter(s => s.stock_status === 'out_of_stock').length;

      mainContentHtml = `
        <div class="stats-grid" style="margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-icon" style="background: var(--color-primary-light); color: var(--color-primary);">📦</div>
            <div class="stat-info">
              <div class="stat-label">Total SKU Terdaftar</div>
              <div class="stat-value">${stocks.length}</div>
              <div class="stat-subtext">Menu aktif di database</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #FFF8E1; color: #B78103;">⚠️</div>
            <div class="stat-info">
              <div class="stat-label">Stok Menipis</div>
              <div class="stat-value" style="color: ${lowCount > 0 ? '#B78103' : '#1B5E20'};">${lowCount}</div>
              <div class="stat-subtext">Di bawah batas minimum</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #FDEDEC; color: #C62828;">⛔</div>
            <div class="stat-info">
              <div class="stat-label">Stok Habis (Kosong)</div>
              <div class="stat-value" style="color: ${outCount > 0 ? '#C62828' : '#1B5E20'};">${outCount}</div>
              <div class="stat-subtext">Tidak dapat dijual di kasir</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 1.75rem;">
          <div class="card-header">
            <h3 class="card-title">Daftar Stok Produk Saat Ini</h3>
          </div>
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Stok Tersedia</th>
                  <th>Batas Minimum</th>
                  <th>Status</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${stocks.map(s => {
                  let badge = '<span class="status-badge badge-success">Tersedia Aman</span>';
                  if (s.stock_status === 'out_of_stock') badge = '<span class="status-badge badge-danger">Habis</span>';
                  else if (s.stock_status === 'low_stock') badge = '<span class="status-badge badge-warning">Stok Menipis</span>';

                  return `
                    <tr>
                      <td style="font-weight: 700; color: var(--color-text);">${escapeHtml(s.name)}</td>
                      <td><span class="status-badge badge-neutral">${escapeHtml(s.category_name)}</span></td>
                      <td style="font-size: 1.05rem; font-weight: 800; color: ${s.stock <= s.min_stock ? '#B78103' : 'inherit'};">${s.stock}</td>
                      <td style="color: var(--color-text-muted);">${s.min_stock} unit</td>
                      <td>${badge}</td>
                      <td style="text-align: right;">
                        <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.openAdjustStockModal(${s.id}, '${escapeHtml(s.name)}', ${s.stock})">
                          ➕ Restock / Sesuaikan
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Riwayat Mutasi Stok (Audit Trail Otomatis)</h3>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Mencatat penjualan kasir, restock, penyesuaian, dan pembatalan void</span>
          </div>
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Nama Produk</th>
                  <th>Tipe Mutasi</th>
                  <th>Perubahan</th>
                  <th>Sebelum ➔ Sesudah</th>
                  <th>Keterangan / Ref</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                ${history.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.75rem; color: var(--color-text-muted);">Belum ada riwayat mutasi stok.</td></tr>' :
                  history.slice(0, 30).map(h => {
                    const isPositive = h.quantity_change > 0;
                    let typeBadge = '<span class="status-badge badge-neutral">Penyesuaian</span>';
                    if (h.change_type === 'sale') typeBadge = '<span class="status-badge badge-warning">Penjualan Kasir</span>';
                    else if (h.change_type === 'restock') typeBadge = '<span class="status-badge badge-success">Restock Supplier</span>';
                    else if (h.change_type === 'initial') typeBadge = '<span class="status-badge badge-neutral">Stok Awal</span>';
                    else if (h.change_type === 'cancellation') typeBadge = '<span class="status-badge badge-success">Pengembalian Void</span>';

                    return `
                      <tr>
                        <td style="font-size: 0.8125rem; color: var(--color-text-muted);">${formatDateTime(h.created_at)}</td>
                        <td style="font-weight: 600;">${escapeHtml(h.product_name)}</td>
                        <td>${typeBadge}</td>
                        <td style="font-weight: 800; color: ${isPositive ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
                          ${isPositive ? '+' : ''}${h.quantity_change}
                        </td>
                        <td>${h.previous_stock} ➔ <strong>${h.current_stock}</strong></td>
                        <td style="font-size: 0.8125rem; color: var(--color-text-muted);">${escapeHtml(h.notes || h.reference_id || '-')}</td>
                        <td>${escapeHtml(h.created_by)}</td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    renderShell(tabSelectorHtml + mainContentHtml, 'Manajemen Produk', 'Kelola menu kopi, kategori, harga, stok, dan mutasi');

    // Attach listeners
    if (activeTab === 'list') {
      const searchInput = document.getElementById('prod-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase();
          document.querySelectorAll('.prod-row').forEach(row => {
            const name = row.getAttribute('data-name') || '';
            row.style.display = name.includes(q) ? '' : 'none';
          });
        });
      }

      const addBtn = document.getElementById('btn-add-product');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          openProductModal(null, categories);
        });
      }
    } else if (activeTab === 'categories') {
      const addBtn = document.getElementById('btn-add-category');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          openCategoryModal(null);
        });
      }
    }
  }

  function setProductTab(tab) {
    state.productActiveTab = tab;
    renderProductsView();
  }

  // Add / Edit Product Modal
  async function openProductModal(productId = null, preloadedCategories = null) {
    let categories = preloadedCategories;
    if (!categories) {
      const catRes = await api('/api/admin/categories');
      categories = catRes ? catRes.categories : [];
    }

    let prod = null;
    if (productId) {
      const res = await api('/api/admin/products');
      if (res && res.products) {
        prod = res.products.find(p => p.id === productId);
      }
    }

    const isEdit = !!prod;

    const modalHtml = `
      <div class="modal-overlay open" id="product-form-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Informasi Produk' : 'Tambah Produk Menu Baru'}</h3>
            <button class="modal-close" onclick="document.getElementById('product-form-modal').remove()">✕</button>
          </div>

          <form id="product-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Produk *</label>
                <input type="text" id="form-prod-name" class="form-control" value="${isEdit ? escapeHtml(prod.name) : ''}" placeholder="Contoh: Kopi Susu Aren" required>
              </div>

              <div class="form-group">
                <label class="form-label">Kategori Menu *</label>
                <select id="form-prod-cat" class="form-control" required>
                  <option value="">-- Pilih Kategori --</option>
                  ${categories.map(c => `
                    <option value="${c.id}" ${isEdit && prod.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>
                  `).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Harga Satuan (Rp) *</label>
                  <input type="number" id="form-prod-price" class="form-control" value="${isEdit ? prod.price : ''}" placeholder="25000" min="0" step="500" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Stok ${isEdit ? 'Saat Ini' : 'Awal'} *</label>
                  <input type="number" id="form-prod-stock" class="form-control" value="${isEdit ? prod.stock : '25'}" min="0" required>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Batas Minimum Peringatan</label>
                  <input type="number" id="form-prod-min-stock" class="form-control" value="${isEdit ? prod.min_stock : '5'}" min="1">
                </div>
                <div class="form-group">
                  <label class="form-label">Status Penjualan</label>
                  <select id="form-prod-status" class="form-control">
                    <option value="active" ${!isEdit || prod.status === 'active' ? 'selected' : ''}>Aktif (Bisa Dijual)</option>
                    <option value="inactive" ${isEdit && prod.status === 'inactive' ? 'selected' : ''}>Nonaktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi Menu</label>
                <textarea id="form-prod-desc" class="form-control" rows="2" placeholder="Catatan rasa, komposisi, atau panduan penyajian">${isEdit ? escapeHtml(prod.description || '') : ''}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Foto Produk</label>
                <input type="file" id="form-prod-file" class="form-control" accept="image/*" style="padding: 0.4rem;">
                <input type="hidden" id="form-prod-image-url" value="${isEdit ? escapeHtml(prod.image_url || '') : ''}">
                <div class="form-hint">
                  Opsional. Jika dikosongkan, sistem menyajikan ilustrasi visual kopi estetik sesuai kategori.
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('product-form-modal').remove()">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-save-prod">Simpan Produk</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById('product-form-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-prod');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      let imageUrl = document.getElementById('form-prod-image-url').value;
      const fileInput = document.getElementById('form-prod-file');

      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        const uploadRes = await api('/api/admin/products/upload-image', {
          method: 'POST',
          body: JSON.stringify({ data: base64, filename: file.name })
        });

        if (uploadRes && uploadRes.imageUrl) {
          imageUrl = uploadRes.imageUrl;
        }
      }

      const payload = {
        name: document.getElementById('form-prod-name').value.trim(),
        category_id: parseInt(document.getElementById('form-prod-cat').value, 10),
        price: parseInt(document.getElementById('form-prod-price').value, 10),
        stock: parseInt(document.getElementById('form-prod-stock').value, 10),
        min_stock: parseInt(document.getElementById('form-prod-min-stock').value, 10),
        status: document.getElementById('form-prod-status').value,
        description: document.getElementById('form-prod-desc').value.trim(),
        image_url: imageUrl
      };

      const url = isEdit ? `/api/admin/products/${prod.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await api(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        showToast(res.message, 'success');
        document.getElementById('product-form-modal').remove();
        renderProductsView();
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Produk';
      }
    });
  }

  // Toggle Product Status (Nonaktifkan / Aktifkan - NEVER HARD DELETE)
  async function toggleProductStatus(productId) {
    const res = await api(`/api/admin/products/${productId}/toggle-status`, { method: 'PUT' });
    if (res && res.success) {
      showToast(res.message, 'success');
      renderProductsView();
    }
  }

  // Category Modal
  async function openCategoryModal(categoryId = null) {
    let cat = null;
    if (categoryId) {
      const res = await api('/api/admin/categories');
      if (res && res.categories) cat = res.categories.find(c => c.id === categoryId);
    }

    const isEdit = !!cat;

    const modalHtml = `
      <div class="modal-overlay open" id="category-modal">
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Kategori Menu' : 'Tambah Kategori Baru'}</h3>
            <button class="modal-close" onclick="document.getElementById('category-modal').remove()">✕</button>
          </div>

          <form id="category-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Kategori *</label>
                <input type="text" id="form-cat-name" class="form-control" value="${isEdit ? escapeHtml(cat.name) : ''}" placeholder="Contoh: Signature Coffee" required>
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi</label>
                <textarea id="form-cat-desc" class="form-control" rows="3" placeholder="Keterangan kategori menu">${isEdit ? escapeHtml(cat.description || '') : ''}</textarea>
              </div>

              ${isEdit ? `
                <div class="form-group">
                  <label class="form-label">Status Kategori</label>
                  <select id="form-cat-status" class="form-control">
                    <option value="active" ${cat.status === 'active' ? 'selected' : ''}>Aktif</option>
                    <option value="inactive" ${cat.status === 'inactive' ? 'selected' : ''}>Nonaktif</option>
                  </select>
                </div>
              ` : ''}
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('category-modal').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan Kategori</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById('category-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('form-cat-name').value.trim(),
        description: document.getElementById('form-cat-desc').value.trim(),
        status: isEdit ? document.getElementById('form-cat-status').value : 'active'
      };

      const url = isEdit ? `/api/admin/categories/${cat.id}` : '/api/admin/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await api(url, { method, body: JSON.stringify(payload) });
      if (res && res.success) {
        showToast(res.message, 'success');
        document.getElementById('category-modal').remove();
        renderProductsView();
      }
    });
  }

  async function toggleCategoryStatus(catId) {
    const res = await api(`/api/admin/categories/${catId}/toggle-status`, { method: 'PUT' });
    if (res && res.success) {
      showToast(res.message, 'success');
      renderProductsView();
    }
  }

  // Stock Adjustment / Restock Modal
  function openAdjustStockModal(productId, productName, currentStock) {
    const modalHtml = `
      <div class="modal-overlay open" id="adjust-stock-modal">
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Sesuaikan Stok Produk</h3>
            <button class="modal-close" onclick="document.getElementById('adjust-stock-modal').remove()">✕</button>
          </div>

          <form id="adjust-stock-form">
            <div class="modal-body">
              <div style="background: var(--color-bg); padding: 0.85rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--color-border);">
                <div style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500;">Produk yang disesuaikan:</div>
                <div style="font-weight: 700; font-size: 1rem; color: var(--color-text);">${escapeHtml(productName)}</div>
                <div style="font-size: 0.8125rem; color: var(--color-primary); font-weight: 600; margin-top: 0.2rem;">
                  Stok Saat Ini: ${currentStock} unit
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Jenis Penyesuaian *</label>
                <select id="form-stock-type" class="form-control">
                  <option value="restock">➕ Restock Pengadaan Baru (Tambah)</option>
                  <option value="adjustment-subtract">➖ Pengurangan Rusak / Basi / Kadaluarsa</option>
                  <option value="adjustment-add">➕ Koreksi Selisih Opname (Tambah)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Jumlah Unit *</label>
                <input type="number" id="form-stock-qty" class="form-control" min="1" value="10" required>
              </div>

              <div class="form-group">
                <label class="form-label">Catatan / Referensi</label>
                <input type="text" id="form-stock-notes" class="form-control" placeholder="Contoh: Pengiriman supplier Roastery #42">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('adjust-stock-modal').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan Mutasi Stok</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById('adjust-stock-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('adjust-stock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const typeVal = document.getElementById('form-stock-type').value;
      const qty = parseInt(document.getElementById('form-stock-qty').value, 10);
      const notes = document.getElementById('form-stock-notes').value.trim();

      let changeType = 'restock';
      let direction = 'add';

      if (typeVal === 'adjustment-subtract') {
        changeType = 'adjustment';
        direction = 'subtract';
      } else if (typeVal === 'adjustment-add') {
        changeType = 'adjustment';
        direction = 'add';
      }

      const payload = {
        productId,
        changeType,
        quantity: qty,
        direction,
        notes: notes || (typeVal === 'restock' ? 'Restock produk' : 'Penyesuaian stok manual')
      };

      const res = await api('/api/admin/stocks/adjust', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        showToast(res.message, 'success');
        document.getElementById('adjust-stock-modal').remove();
        renderProductsView();
      }
    });
  }

  // ==========================================
  // VIEW 7: TRANSAKSI & RIWAYAT (W7)
  // Filter Tanggal, Filter Status, Detail Struk, Pembatalan Void
  // ==========================================
  async function renderTransactionsView() {
    const isKasir = state.user && state.user.role === 'kasir';
    const title = isKasir ? 'Riwayat Transaksi Saya' : 'Transaksi Penjualan';
    const subtitle = isKasir ? 'Daftar transaksi yang diproses pada akun Anda' : 'Riwayat seluruh pesanan dan pembatalan void';

    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat daftar transaksi...</div>', title, subtitle);

    let queryParams = [];
    if (state.trxFilterDate) queryParams.push(`date=${encodeURIComponent(state.trxFilterDate)}`);
    if (state.trxFilterStatus) queryParams.push(`status=${encodeURIComponent(state.trxFilterStatus)}`);
    if (state.trxSearchQuery) queryParams.push(`search=${encodeURIComponent(state.trxSearchQuery)}`);
    const qs = queryParams.length ? '?' + queryParams.join('&') : '';

    const endpoint = isKasir ? `/api/pos/transactions${qs}` : `/api/admin/transactions${qs}`;
    const res = await api(endpoint);
    if (!res || !res.success) return;

    const transactions = res.transactions || [];

    const contentHtml = `
      <div class="table-container">
        <!-- Filter Toolbar -->
        <div class="table-toolbar">
          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; flex: 1; align-items: center;">
            <div style="position: relative; max-width: 220px; width: 100%;">
              <input type="text" id="trx-search-input" class="form-control" placeholder="Cari invoice / kasir..." value="${escapeHtml(state.trxSearchQuery)}" style="padding: 0.45rem 0.75rem; font-size: 0.8125rem;">
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <label style="font-size: 0.8125rem; font-weight: 600; color: var(--color-text);">Tanggal:</label>
              <input type="date" id="trx-date-input" class="form-control" value="${state.trxFilterDate}" style="max-width: 155px; padding: 0.45rem 0.65rem; font-size: 0.8125rem;">
            </div>

            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <label style="font-size: 0.8125rem; font-weight: 600; color: var(--color-text);">Status:</label>
              <select id="trx-status-select" class="form-control" style="max-width: 140px; padding: 0.45rem 0.65rem; font-size: 0.8125rem;">
                <option value="">Semua Status</option>
                <option value="completed" ${state.trxFilterStatus === 'completed' ? 'selected' : ''}>Selesai</option>
                <option value="cancelled" ${state.trxFilterStatus === 'cancelled' ? 'selected' : ''}>Dibatalkan</option>
              </select>
            </div>

            ${(state.trxFilterDate || state.trxFilterStatus || state.trxSearchQuery) ? `
              <button class="btn btn-secondary btn-sm" id="btn-reset-trx-filter">✕ Reset</button>
            ` : ''}
          </div>
          <div style="font-weight: 700; color: var(--color-primary); font-size: 0.875rem;">
            ${transactions.length} Transaksi Ditemukan
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Tanggal & Waktu</th>
                <th>Kasir</th>
                <th>Pelanggan</th>
                <th>Total Tagihan</th>
                <th>Metode Bayar</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:2.5rem; color: var(--color-text-muted);">Tidak ada transaksi yang sesuai dengan filter pencarian.</td></tr>' :
                transactions.map(t => {
                  const isCancelled = t.payment_status === 'cancelled';
                  const method = (t.payment_method || 'cash').toLowerCase();
                  let methodBadge = '<span class="status-badge badge-neutral">💵 Tunai</span>';
                  if (method === 'qris') methodBadge = '<span class="status-badge badge-qris">📱 QRIS</span>';
                  else if (method === 'transfer') methodBadge = '<span class="status-badge badge-transfer">🏦 Transfer</span>';

                  let statusBadge = '<span class="status-badge badge-success">● Selesai</span>';
                  if (isCancelled) {
                    statusBadge = `<span class="status-badge badge-cancelled" title="Alasan: ${escapeHtml(t.cancel_reason || '-')}\nDibatalkan oleh: ${escapeHtml(t.cancelled_by || '-')}">✕ Dibatalkan</span>`;
                  }

                  return `
                    <tr style="${isCancelled ? 'opacity: 0.8; background: #FFF5F5;' : ''}">
                      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-text);">
                        ${escapeHtml(t.invoice_number)}
                      </td>
                      <td style="font-size: 0.8125rem; color: var(--color-text-muted);">${formatDateTime(t.created_at)}</td>
                      <td>${escapeHtml(t.cashier_name)}</td>
                      <td>${escapeHtml(t.customer_name || 'Tamu')}</td>
                      <td style="font-weight: 700; color: ${isCancelled ? '#C62828' : 'var(--color-primary)'}; ${isCancelled ? 'text-decoration: line-through;' : ''}">
                        ${formatRupiah(t.total_amount)}
                      </td>
                      <td>${methodBadge}</td>
                      <td>${statusBadge}</td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.4rem; align-items: center;">
                          <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.showReceiptModal('${t.invoice_number}')" title="Buka Struk">
                            🧾 Struk
                          </button>
                          ${!isCancelled ? `
                            <button class="btn btn-danger btn-sm" onclick="window.BrewApp.openCancelTrxModal(${t.id}, '${escapeHtml(t.invoice_number)}', ${t.total_amount})" title="Batalkan Transaksi (Void)">
                              ✕ Void
                            </button>
                          ` : `
                            <span style="font-size: 0.75rem; color: #C62828; font-weight: 600;" title="${escapeHtml(t.cancel_reason || '')}">
                              [Alasan: ${escapeHtml((t.cancel_reason || 'Void').substring(0, 15))}]
                            </span>
                          `}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell(contentHtml, title, subtitle);

    // Event listeners
    const searchInput = document.getElementById('trx-search-input');
    if (searchInput) {
      searchInput.addEventListener('change', (e) => {
        state.trxSearchQuery = e.target.value.trim();
        renderTransactionsView();
      });
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          state.trxSearchQuery = e.target.value.trim();
          renderTransactionsView();
        }
      });
    }

    const dateInput = document.getElementById('trx-date-input');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        state.trxFilterDate = e.target.value;
        renderTransactionsView();
      });
    }

    const statusSelect = document.getElementById('trx-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        state.trxFilterStatus = e.target.value;
        renderTransactionsView();
      });
    }

    const resetBtn = document.getElementById('btn-reset-trx-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.trxFilterDate = '';
        state.trxFilterStatus = '';
        state.trxSearchQuery = '';
        renderTransactionsView();
      });
    }
  }

  // Transaction Cancellation (Void) with Reason & Stock Restoration (W7)
  function openCancelTrxModal(trxId, invoiceNumber, totalAmount) {
    const isKasir = state.user && state.user.role === 'kasir';
    const endpoint = isKasir ? `/api/pos/transactions/${trxId}/cancel` : `/api/admin/transactions/${trxId}/cancel`;

    const modalHtml = `
      <div class="modal-overlay open" id="cancel-trx-modal">
        <div class="modal-dialog" style="max-width: 460px;">
          <div class="modal-header" style="background: #FDEDEC; border-bottom: 1px solid #FFCDD2;">
            <h3 class="modal-title" style="color: #C62828; display: flex; align-items: center; gap: 0.5rem;">
              <span>⚠️</span> Batalkan Transaksi (Void)
            </h3>
            <button class="modal-close" onclick="document.getElementById('cancel-trx-modal').remove()">✕</button>
          </div>

          <form id="cancel-trx-form">
            <div class="modal-body">
              <div style="background: #FFF5F5; border: 1px solid #FFCDD2; padding: 0.85rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span style="font-size: 0.8125rem; color: #881414;">Nomor Invoice:</span>
                  <span style="font-family: var(--font-mono); font-weight: 700; color: #C62828;">${escapeHtml(invoiceNumber)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.8125rem; color: #881414;">Total Tagihan:</span>
                  <span style="font-weight: 700; color: #C62828;">${formatRupiah(totalAmount)}</span>
                </div>
              </div>

              <div style="font-size: 0.8125rem; color: var(--color-text-muted); margin-bottom: 1rem; line-height: 1.5;">
                ℹ️ <strong>Perhatian:</strong> Pembatalan invoice ini akan <strong>otomatis mengembalikan stok menu ke gudang</strong> dan mencatat transaksi sebagai status Dibatalkan.
              </div>

              <div class="form-group">
                <label class="form-label">Alasan Pembatalan *</label>
                <textarea id="cancel-reason-input" class="form-control" rows="3" placeholder="Contoh: Pelanggan salah memesan, salah input meja, pesanan ganda" required></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('cancel-trx-modal').remove()">Batal</button>
              <button type="submit" class="btn btn-danger" id="btn-submit-cancel-trx">
                Konfirmasi Batalkan Transaksi
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById('cancel-trx-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('cancel-trx-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = document.getElementById('cancel-reason-input').value.trim();
      if (!reason) {
        showToast('Alasan pembatalan wajib diisi.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-cancel-trx');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses Void...';
      }

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      if (res && res.success) {
        showToast(res.message, 'success');
        document.getElementById('cancel-trx-modal').remove();
        renderTransactionsView();
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Konfirmasi Batalkan Transaksi';
        }
      }
    });
  }

  // ==========================================
  // VIEW 8: LAPORAN PENJUALAN & OMZET (W8)
  // Omzet Bersih, 5 Produk Terlaris, Jumlah Transaksi, Stok Menipis
  // ==========================================
  async function renderReportsView(period = '7days') {
    state.reportPeriod = period;
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Menghitung laporan omzet...</div>', 'Laporan Omzet & Penjualan', 'Analisis pendapatan bersih, produk terlaris, dan performa');

    const res = await api(`/api/admin/reports?period=${period}`);
    if (!res || !res.success) return;

    const rep = res.report;
    const sum = rep.summary;

    const contentHtml = `
      <!-- Period Selector Filter -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.35rem;">
        <button class="btn ${period === 'today' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.renderReportsView('today')">Hari Ini</button>
        <button class="btn ${period === 'yesterday' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.renderReportsView('yesterday')">Kemarin</button>
        <button class="btn ${period === '7days' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.renderReportsView('7days')">7 Hari Terakhir</button>
        <button class="btn ${period === 'this_month' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.BrewApp.renderReportsView('this_month')">Bulan Ini</button>
      </div>

      <!-- Summary Metrics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-primary-light); color: var(--color-primary);">💰</div>
          <div class="stat-info">
            <div class="stat-label">Total Omzet Bersih</div>
            <div class="stat-value">${formatRupiah(sum.totalRevenue)}</div>
            <div class="stat-subtext">Hanya transaksi selesai</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #E8F4FD; color: #0D47A1;">🧾</div>
          <div class="stat-info">
            <div class="stat-label">Jumlah Transaksi</div>
            <div class="stat-value">${sum.totalTransactions}</div>
            <div class="stat-subtext">Pesanan berhasil</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #EDF7EE; color: #1B5E20;">☕</div>
          <div class="stat-info">
            <div class="stat-label">Porsi Terjual</div>
            <div class="stat-value">${sum.totalItemsSold}</div>
            <div class="stat-subtext">Cangkir & makanan</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #FFF8E1; color: #B78103;">📊</div>
          <div class="stat-info">
            <div class="stat-label">Rata-rata Order (AOV)</div>
            <div class="stat-value">${formatRupiah(sum.averageOrderValue)}</div>
            <div class="stat-subtext">Per struk belanja</div>
          </div>
        </div>
      </div>

      <!-- Charts & Breakdown -->
      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem; margin-bottom: 1.75rem;" class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Grafik Pendapatan Harian</h3>
          </div>
          <div style="height: 220px; display: flex; align-items: center; justify-content: center;">
            ${renderSalesChartSvg(rep.dailyTrend.map(d => ({ date: d.date, daily_revenue: d.revenue, transaction_count: d.transaction_count })))}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Kontribusi Kategori Menu</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${rep.categoryBreakdown.length === 0 ? '<div style="color:var(--color-text-subtle); text-align:center; padding:1.5rem;">Tidak ada data penjualan pada periode ini.</div>' :
              rep.categoryBreakdown.map(c => {
                const pct = sum.totalRevenue > 0 ? Math.round((c.total_revenue / sum.totalRevenue) * 100) : 0;
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600;">${escapeHtml(c.category_name)} (${c.total_quantity} porsi)</span>
                      <span style="font-weight: 700; color: var(--color-primary);">${formatRupiah(c.total_revenue)} (${pct}%)</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--color-bg); border-radius: var(--radius-full); overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: var(--color-primary);"></div>
                    </div>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>
      </div>

      <!-- 5 & 10 Produk Terlaris Table (W8) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Produk Paling Laris di Periode Ini</h3>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">Urutan berdasarkan jumlah porsi terjual</span>
        </div>
        <div class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th style="width: 50px;">Rank</th>
                <th>Nama Menu</th>
                <th>Kategori</th>
                <th>Porsi Terjual</th>
                <th>Total Omzet Menu</th>
              </tr>
            </thead>
            <tbody>
              ${rep.topProducts.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:2rem; color: var(--color-text-muted);">Belum ada penjualan pada periode ini.</td></tr>' :
                rep.topProducts.slice(0, 10).map((p, i) => `
                  <tr>
                    <td style="font-weight: 800; color: ${i < 3 ? 'var(--color-primary)' : 'inherit'};">#${i + 1}</td>
                    <td style="font-weight: 700; color: var(--color-text);">${escapeHtml(p.product_name)}</td>
                    <td><span class="status-badge badge-neutral">${escapeHtml(p.category_name)}</span></td>
                    <td style="font-weight: 700; color: var(--status-success-text);">${p.total_quantity} porsi</td>
                    <td style="font-weight: 700; color: var(--color-primary);">${formatRupiah(p.total_revenue)}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell(contentHtml, 'Laporan Omzet & Penjualan', 'Analisis pendapatan bersih, produk terlaris, dan performa');
  }

  // ==========================================
  // VIEW 9: PENGGUNA SISTEM (Admin Only) - (W1)
  // ==========================================
  async function renderUsersView() {
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat pengguna...</div>', 'Manajemen Pengguna', 'Kelola akun kasir, admin, dan hak akses');

    const res = await api('/api/admin/users');
    if (!res || !res.success) return;

    const users = res.users || [];

    const contentHtml = `
      <div class="table-container">
        <div class="table-toolbar">
          <div style="font-weight: 700; color: var(--color-text);">Daftar Pengguna Sistem (${users.length})</div>
          <button class="btn btn-primary" id="btn-add-user">
            ➕ Tambah Pengguna Baru
          </button>
        </div>

        <div class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Role Akses</th>
                <th>Status Akun</th>
                <th>Dibuat Pada</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const isAdmin = u.role === 'admin';
                return `
                  <tr>
                    <td style="font-weight: 700; font-family: var(--font-mono);">${escapeHtml(u.username)}</td>
                    <td style="font-weight: 600;">${escapeHtml(u.full_name)}</td>
                    <td>
                      <span class="user-role-badge ${isAdmin ? 'badge-admin' : 'badge-kasir'}">
                        ${isAdmin ? 'Admin' : 'Kasir'}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">
                        ${u.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                      </span>
                    </td>
                    <td style="font-size: 0.8125rem; color: var(--color-text-muted);">${formatDateOnly(u.created_at)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm" onclick="window.BrewApp.openUserModal(${u.id})">
                        Edit
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell(contentHtml, 'Manajemen Pengguna', 'Kelola akun kasir, admin, dan hak akses');

    document.getElementById('btn-add-user').addEventListener('click', () => {
      openUserModal(null);
    });
  }

  async function openUserModal(userId = null) {
    let u = null;
    if (userId) {
      const res = await api('/api/admin/users');
      if (res && res.users) u = res.users.find(item => item.id === userId);
    }

    const isEdit = !!u;

    const modalHtml = `
      <div class="modal-overlay open" id="user-modal">
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</h3>
            <button class="modal-close" onclick="document.getElementById('user-modal').remove()">✕</button>
          </div>

          <form id="user-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Username *</label>
                <input type="text" id="form-user-name" class="form-control" value="${isEdit ? escapeHtml(u.username) : ''}" ${isEdit ? 'disabled' : 'required'}>
              </div>

              <div class="form-group">
                <label class="form-label">Nama Lengkap *</label>
                <input type="text" id="form-user-fullname" class="form-control" value="${isEdit ? escapeHtml(u.full_name) : ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Hak Akses Role *</label>
                <select id="form-user-role" class="form-control" required>
                  <option value="kasir" ${isEdit && u.role === 'kasir' ? 'selected' : ''}>Kasir (Hanya POS & Transaksi)</option>
                  <option value="admin" ${isEdit && u.role === 'admin' ? 'selected' : ''}>Admin (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${isEdit ? 'Ganti Kata Sandi (Kosongkan bila tidak diubah)' : 'Kata Sandi *'}</label>
                <input type="password" id="form-user-pass" class="form-control" placeholder="Minimal 5 karakter" ${isEdit ? '' : 'required'}>
              </div>

              <div class="form-group">
                <label class="form-label">Status Akun</label>
                <select id="form-user-status" class="form-control">
                  <option value="active" ${!isEdit || u.status === 'active' ? 'selected' : ''}>Aktif</option>
                  <option value="inactive" ${isEdit && u.status === 'inactive' ? 'selected' : ''}>Nonaktif</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('user-modal').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan Pengguna</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById('user-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        fullName: document.getElementById('form-user-fullname').value.trim(),
        role: document.getElementById('form-user-role').value,
        status: document.getElementById('form-user-status').value
      };

      const pass = document.getElementById('form-user-pass').value;
      if (pass) payload.password = pass;

      if (!isEdit) {
        payload.username = document.getElementById('form-user-name').value.trim();
      }

      const url = isEdit ? `/api/admin/users/${u.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await api(url, { method, body: JSON.stringify(payload) });
      if (res && res.success) {
        showToast(res.message, 'success');
        document.getElementById('user-modal').remove();
        renderUsersView();
      }
    });
  }

  // ==========================================
  // VIEW 10: PENGATURAN KEDAI (Admin Only)
  // ==========================================
  async function renderSettingsView() {
    renderShell('<div style="text-align:center; padding: 3rem; color: var(--color-text-muted);">Memuat pengaturan...</div>', 'Pengaturan Kedai', 'Sesuaikan nama kedai, struk kasir, dan alamat');

    await loadSettings();
    const st = state.settings;

    const contentHtml = `
      <div class="card" style="max-width: 620px;">
        <div class="card-header">
          <h3 class="card-title">Informasi Resmi BREWSPACE</h3>
        </div>

        <form id="settings-form">
          <div class="form-group">
            <label class="form-label">Nama Coffee Shop</label>
            <input type="text" id="st-name" class="form-control" value="${escapeHtml(st.store_name || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Tagline Kedai</label>
            <input type="text" id="st-tagline" class="form-control" value="${escapeHtml(st.store_tagline || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Alamat Lengkap</label>
            <textarea id="st-address" class="form-control" rows="2">${escapeHtml(st.store_address || '')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Nomor Kontak WhatsApp</label>
              <input type="text" id="st-phone" class="form-control" value="${escapeHtml(st.store_phone || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Pajak Penjualan (PB1 / PPN %)</label>
              <input type="number" id="st-tax" class="form-control" value="${st.tax_percentage || '0'}" min="0" max="100">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Pesan Kaki Struk Kasir</label>
            <input type="text" id="st-footer" class="form-control" value="${escapeHtml(st.receipt_footer || '')}">
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;">
            💾 Simpan Pengaturan
          </button>
        </form>
      </div>
    `;

    renderShell(contentHtml, 'Pengaturan Kedai', 'Sesuaikan nama kedai, struk kasir, dan alamat');

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        store_name: document.getElementById('st-name').value.trim(),
        store_tagline: document.getElementById('st-tagline').value.trim(),
        store_address: document.getElementById('st-address').value.trim(),
        store_phone: document.getElementById('st-phone').value.trim(),
        tax_percentage: document.getElementById('st-tax').value.trim(),
        receipt_footer: document.getElementById('st-footer').value.trim()
      };

      const res = await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        showToast(res.message, 'success');
        await loadSettings();
      }
    });
  }

  // ==========================================
  // ROOT ROUTER
  // ==========================================
  function renderApp() {
    if (!state.token || !state.user) {
      renderLogin();
      return;
    }

    switch (state.activeView) {
      case 'dashboard':
        renderDashboardView();
        break;
      case 'pos':
        renderPosView();
        break;
      case 'products':
        renderProductsView();
        break;
      case 'transactions':
        renderTransactionsView();
        break;
      case 'reports':
        renderReportsView(state.reportPeriod || '7days');
        break;
      case 'users':
        renderUsersView();
        break;
      case 'settings':
        renderSettingsView();
        break;
      default:
        renderDashboardView();
    }
  }

  // Global Interface for inline DOM callbacks
  window.BrewApp = {
    navigateTo,
    showReceiptModal,
    downloadReceiptPdf,
    addToCart,
    updateCartQty,
    removeCartItem,
    setQuickCash,
    setPaymentMethod,
    toggleMobileCart,
    openCancelTrxModal,
    openProductModal,
    toggleProductStatus,
    openCategoryModal,
    toggleCategoryStatus,
    openAdjustStockModal,
    openUserModal,
    renderReportsView,
    setProductTab,
    showToast
  };

  // Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    renderApp();
  });

})();