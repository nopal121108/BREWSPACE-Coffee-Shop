// server/api.js - REST API Handlers for BREWSPACE
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, hashPassword, verifyPassword } = require('./db');
const { createSession, destroySession, requireAuth, sendJson } = require('./auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Global Mock Customer Orders Store for Approval System
const mockCustomerOrders = [
  {
    id: 'ORD-20261117-001',
    orderNumber: 'ORD-20261117-001',
    customerId: 'cust_sample_1',
    customerName: 'Budi Santoso',
    tableNumber: 'Meja 03',
    notes: 'Less sweet ya kak',
    items: [
      { productId: 1, name: 'Brewspace Aren Latte', categoryName: 'Signature Coffee', price: 28000, quantity: 2, subtotal: 56000 },
      { productId: 12, name: 'Butter Croissant Artisanal', categoryName: 'Pastry & Bakery', price: 24000, quantity: 1, subtotal: 24000 }
    ],
    subtotal: 80000,
    tax: 0,
    totalAmount: 80000,
    status: 'menunggu_konfirmasi',
    statusNotes: 'Pesanan baru diajukan pelanggan, menunggu verifikasi kasir',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString()
  },
  {
    id: 'ORD-20261117-002',
    orderNumber: 'ORD-20261117-002',
    customerId: 'cust_sample_2',
    customerName: 'Annisa Putri',
    tableNumber: 'Meja 07',
    notes: 'Extra ice',
    items: [
      { productId: 2, name: 'Caramel Macchiato Velvet', categoryName: 'Signature Coffee', price: 33000, quantity: 1, subtotal: 33000 }
    ],
    subtotal: 33000,
    tax: 0,
    totalAmount: 33000,
    status: 'dikonfirmasi',
    statusNotes: 'Pesanan telah diterima oleh kasir, antrean dapur',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    confirmedBy: 'Siti Rahma (Kasir)'
  }
];

// Helper to generate Invoice Number: TRX-YYYYMMDD-XXXX
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `TRX-${year}${month}${day}-`;

  // Find max sequence today
  const row = db.prepare(`
    SELECT invoice_number FROM transactions 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let seq = 1;
  if (row && row.invoice_number) {
    const parts = row.invoice_number.split('-');
    if (parts.length >= 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// Router dispatch function
async function handleApi(req, res, pathname, query, body) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token'
    });
    return res.end();
  }

  try {
    // ==========================================
    // 1. AUTHENTICATION ROUTES
    // ==========================================
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { username, password } = body || {};
      if (!username || !password) {
        return sendJson(res, 400, { success: false, error: 'Username dan password wajib diisi.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))').get(username.trim());
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Username atau password salah.' });
      }

      if (user.status !== 'active') {
        return sendJson(res, 403, { success: false, error: 'Akun Anda telah dinonaktifkan. Hubungi Admin.' });
      }

      const valid = verifyPassword(password, user.password_hash, user.salt);
      if (!valid) {
        return sendJson(res, 401, { success: false, error: 'Username atau password salah.' });
      }

      const token = createSession(user);
      res.setHeader('Set-Cookie', `brewspace_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      return sendJson(res, 200, {
        success: true,
        message: 'Login berhasil.',
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role
        }
      });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = require('./auth').extractToken(req);
      if (token) {
        destroySession(token);
      }
      res.setHeader('Set-Cookie', 'brewspace_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      return sendJson(res, 200, { success: true, message: 'Logout berhasil.' });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const session = requireAuth()(req, res);
      if (!session) return;
      const user = db.prepare('SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?').get(session.userId);
      return sendJson(res, 200, { success: true, user });
    }

    // ==========================================
    // 2. SETTINGS (Public & Admin)
    // ==========================================
    if (pathname === '/api/settings' && req.method === 'GET') {
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      return sendJson(res, 200, { success: true, settings });
    }

    if (pathname === '/api/admin/settings' && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const entries = Object.entries(body || {});
      const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

      db.exec('BEGIN IMMEDIATE;');
      try {
        for (const [k, v] of entries) {
          upsert.run(k, String(v));
        }
        db.exec('COMMIT;');
        return sendJson(res, 200, { success: true, message: 'Pengaturan berhasil diperbarui.' });
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    }

    // ==========================================
    // 3. ADMIN DASHBOARD STATS
    // ==========================================
    if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      // Aggregated statistics (excluding cancelled transactions)
      const revenueStats = db.prepare(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COUNT(id) AS total_transactions
        FROM transactions
        WHERE payment_status != 'cancelled'
      `).get();

      const activeProductsCount = db.prepare(`
        SELECT COUNT(id) AS count FROM products WHERE status = 'active'
      `).get().count;

      const activeCategoriesCount = db.prepare(`
        SELECT COUNT(id) AS count FROM categories WHERE status = 'active'
      `).get().count;

      const lowStockProducts = db.prepare(`
        SELECT p.id, p.name, p.stock, p.min_stock, p.price, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' AND p.stock <= p.min_stock
        ORDER BY p.stock ASC
      `).all();

      // Recent 5 transactions
      const recentTransactions = db.prepare(`
        SELECT t.id, t.invoice_number, t.cashier_name, t.total_amount, t.payment_method, t.payment_status, t.cancel_reason, t.created_at,
               COUNT(td.id) AS total_items
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT 5
      `).all();

      // Last 7 days sales trend (completed only)
      const salesChart7Days = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', created_at) AS date,
          COUNT(id) AS transaction_count,
          COALESCE(SUM(total_amount), 0) AS daily_revenue
        FROM transactions
        WHERE payment_status != 'cancelled' AND created_at >= date('now', '-7 days')
        GROUP BY date
        ORDER BY date ASC
      `).all();

      // Top 5 best seller products (completed only)
      const topProducts = db.prepare(`
        SELECT 
          td.product_name,
          COALESCE(c.name, 'Umum') AS category_name,
          SUM(td.quantity) AS total_sold,
          SUM(td.subtotal) AS total_revenue
        FROM transaction_details td
        INNER JOIN transactions t ON td.transaction_id = t.id
        LEFT JOIN products p ON td.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE t.payment_status != 'cancelled'
        GROUP BY td.product_name
        ORDER BY total_sold DESC
        LIMIT 5
      `).all();

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalRevenue: revenueStats.total_revenue,
          totalTransactions: revenueStats.total_transactions,
          activeProducts: activeProductsCount,
          activeCategories: activeCategoriesCount,
          lowStockCount: lowStockProducts.length,
          lowStockProducts,
          recentTransactions,
          salesChart7Days,
          topProducts
        }
      });
    }

    // ==========================================
    // 4. CATEGORIES MANAGEMENT (Admin)
    // ==========================================
    if (pathname === '/api/admin/categories' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const categories = db.prepare(`
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
      `).all();

      return sendJson(res, 200, { success: true, categories });
    }

    if (pathname === '/api/admin/categories' && req.method === 'POST') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const { name, description } = body || {};
      if (!name || !name.trim()) {
        return sendJson(res, 400, { success: false, error: 'Nama kategori wajib diisi.' });
      }

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
      if (existing) {
        return sendJson(res, 400, { success: false, error: 'Kategori dengan nama atau slug serupa sudah ada.' });
      }

      const result = db.prepare(`
        INSERT INTO categories (name, slug, description, status)
        VALUES (?, ?, ?, 'active')
      `).run(name.trim(), slug, description ? description.trim() : null);

      return sendJson(res, 201, {
        success: true,
        message: 'Kategori berhasil ditambahkan.',
        category: { id: Number(result.lastInsertRowid), name: name.trim(), slug, description, status: 'active' }
      });
    }

    const catMatch = pathname.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (catMatch && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(catMatch[1], 10);
      const { name, description, status } = body || {};

      if (!name || !name.trim()) {
        return sendJson(res, 400, { success: false, error: 'Nama kategori wajib diisi.' });
      }

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      db.prepare(`
        UPDATE categories 
        SET name = ?, slug = ?, description = ?, status = ?
        WHERE id = ?
      `).run(name.trim(), slug, description || null, status || 'active', id);

      return sendJson(res, 200, { success: true, message: 'Kategori berhasil diperbarui.' });
    }

    const catToggleMatch = pathname.match(/^\/api\/admin\/categories\/(\d+)\/toggle-status$/);
    if (catToggleMatch && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(catToggleMatch[1], 10);
      const cat = db.prepare('SELECT status FROM categories WHERE id = ?').get(id);
      if (!cat) return sendJson(res, 404, { success: false, error: 'Kategori tidak ditemukan.' });

      const newStatus = cat.status === 'active' ? 'inactive' : 'active';
      db.prepare('UPDATE categories SET status = ? WHERE id = ?').run(newStatus, id);

      return sendJson(res, 200, {
        success: true,
        message: `Status kategori diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`,
        newStatus
      });
    }

    // ==========================================
    // 5. PRODUCT MANAGEMENT (Admin)
    // ==========================================
    if (pathname === '/api/admin/products' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      let sql = `
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (query.category_id) {
        sql += ' AND p.category_id = ?';
        params.push(query.category_id);
      }
      if (query.status) {
        sql += ' AND p.status = ?';
        params.push(query.status);
      }
      if (query.search) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const s = `%${query.search.trim()}%`;
        params.push(s, s);
      }
      sql += ' ORDER BY p.id DESC';

      const products = db.prepare(sql).all(...params);
      return sendJson(res, 200, { success: true, products });
    }

    if (pathname === '/api/admin/products' && req.method === 'POST') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const { name, category_id, price, stock, min_stock, description, image_url, status } = body || {};

      if (!name || !name.trim()) return sendJson(res, 400, { success: false, error: 'Nama produk wajib diisi.' });
      if (!category_id) return sendJson(res, 400, { success: false, error: 'Kategori produk wajib dipilih.' });
      if (price === undefined || isNaN(price) || price < 0) return sendJson(res, 400, { success: false, error: 'Harga produk tidak valid.' });

      const prodPrice = parseInt(price, 10);
      const prodStock = parseInt(stock || 0, 10);
      const prodMinStock = parseInt(min_stock || 5, 10);
      const prodStatus = status === 'inactive' ? 'inactive' : 'active';

      db.exec('BEGIN IMMEDIATE;');
      try {
        const resProd = db.prepare(`
          INSERT INTO products (category_id, name, description, price, stock, min_stock, image_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          category_id,
          name.trim(),
          description ? description.trim() : null,
          prodPrice,
          prodStock,
          prodMinStock,
          image_url || 'default-coffee.jpg',
          prodStatus
        );

        const newProdId = Number(resProd.lastInsertRowid);

        if (prodStock > 0) {
          db.prepare(`
            INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
            VALUES (?, 'initial', ?, 0, ?, 'Stok Awal Produk Baru', ?)
          `).run(newProdId, prodStock, prodStock, session.fullName);
        }

        db.exec('COMMIT;');
        return sendJson(res, 201, { success: true, message: 'Produk berhasil ditambahkan.', productId: newProdId });
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    }

    // Upload base64 image
    if (pathname === '/api/admin/products/upload-image' && req.method === 'POST') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const { data, filename } = body || {};
      if (!data) return sendJson(res, 400, { success: false, error: 'Data gambar wajib disertakan.' });

      // Match base64 regex: data:image/png;base64,....
      const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      let ext = '.jpg';
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
        if (matches[1].includes('png')) ext = '.png';
        else if (matches[1].includes('webp')) ext = '.webp';
      } else {
        buffer = Buffer.from(data, 'base64');
      }

      const safeName = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const savePath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(savePath, buffer);

      return sendJson(res, 200, {
        success: true,
        message: 'Gambar berhasil diunggah.',
        filename: safeName,
        imageUrl: `/uploads/${safeName}`
      });
    }

    const prodMatch = pathname.match(/^\/api\/admin\/products\/(\d+)$/);
    if (prodMatch && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(prodMatch[1], 10);
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { success: false, error: 'Produk tidak ditemukan.' });

      const { name, category_id, price, stock, min_stock, description, image_url, status } = body || {};

      if (!name || !name.trim()) return sendJson(res, 400, { success: false, error: 'Nama produk wajib diisi.' });
      if (!category_id) return sendJson(res, 400, { success: false, error: 'Kategori produk wajib dipilih.' });
      if (price === undefined || isNaN(price) || price < 0) return sendJson(res, 400, { success: false, error: 'Harga produk tidak valid.' });

      const newPrice = parseInt(price, 10);
      const newStock = stock !== undefined ? parseInt(stock, 10) : existing.stock;
      const newMinStock = min_stock !== undefined ? parseInt(min_stock, 10) : existing.min_stock;
      const newStatus = status || existing.status;
      const newImage = image_url || existing.image_url;

      db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare(`
          UPDATE products 
          SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, min_stock = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(category_id, name.trim(), description || null, newPrice, newStock, newMinStock, newImage, newStatus, id);

        // Record stock movement if stock manually updated via edit product
        if (newStock !== existing.stock) {
          const diff = newStock - existing.stock;
          db.prepare(`
            INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
            VALUES (?, 'adjustment', ?, ?, ?, 'Penyesuaian Manual saat Edit Produk', ?)
          `).run(id, diff, existing.stock, newStock, session.fullName);
        }

        db.exec('COMMIT;');
        return sendJson(res, 200, { success: true, message: 'Produk berhasil diperbarui.' });
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    }

    const prodToggleMatch = pathname.match(/^\/api\/admin\/products\/(\d+)\/toggle-status$/);
    if (prodToggleMatch && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(prodToggleMatch[1], 10);
      const prod = db.prepare('SELECT status, name FROM products WHERE id = ?').get(id);
      if (!prod) return sendJson(res, 404, { success: false, error: 'Produk tidak ditemukan.' });

      const newStatus = prod.status === 'active' ? 'inactive' : 'active';
      db.prepare('UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

      return sendJson(res, 200, {
        success: true,
        message: `Status produk "${prod.name}" diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`,
        newStatus
      });
    }

    // ==========================================
    // 6. STOCK MANAGEMENT & AUDIT (Admin)
    // ==========================================
    if (pathname === '/api/admin/stocks' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const stocks = db.prepare(`
        SELECT 
          p.id, p.name, p.price, p.stock, p.min_stock, p.status, p.image_url,
          c.name AS category_name,
          CASE 
            WHEN p.stock <= 0 THEN 'out_of_stock'
            WHEN p.stock <= p.min_stock THEN 'low_stock'
            ELSE 'in_stock'
          END AS stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY 
          CASE WHEN p.stock <= p.min_stock THEN 0 ELSE 1 END,
          p.stock ASC
      `).all();

      return sendJson(res, 200, { success: true, stocks });
    }

    if (pathname === '/api/admin/stocks/adjust' && req.method === 'POST') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const { productId, changeType, quantity, actualStock, notes } = body || {};
      if (!productId) return sendJson(res, 400, { success: false, error: 'Bahan atau produk wajib dipilih.' });

      const prod = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(productId);
      if (!prod) return sendJson(res, 404, { success: false, error: 'Produk tidak ditemukan.' });

      let quantityChange = 0;
      let newStock = prod.stock;

      if (changeType === 'restock') {
        const qty = parseInt(quantity, 10);
        if (!qty || isNaN(qty) || qty <= 0) {
          return sendJson(res, 400, { success: false, error: 'Jumlah stok masuk harus lebih dari 0 unit.' });
        }
        quantityChange = qty;
        newStock = prod.stock + qty;
      } else if (changeType === 'adjustment') {
        // Mode Koreksi Fisik (Opname): pengguna memasukkan stok fisik sebenarnya
        if (actualStock !== undefined && actualStock !== null && actualStock !== '') {
          const actual = parseInt(actualStock, 10);
          if (isNaN(actual) || actual < 0) {
            return sendJson(res, 400, { success: false, error: 'Jumlah stok fisik sebenarnya tidak boleh bernilai negatif.' });
          }
          quantityChange = actual - prod.stock;
          newStock = actual;
        } else {
          // Dukungan format penyesuaian unit manual
          const qty = parseInt(quantity, 10);
          if (isNaN(qty) || qty <= 0) {
            return sendJson(res, 400, { success: false, error: 'Jumlah unit koreksi tidak valid.' });
          }
          const direction = body.direction === 'subtract' ? -1 : 1;
          quantityChange = direction * qty;
          newStock = prod.stock + quantityChange;
        }

        if (newStock < 0) {
          return sendJson(res, 400, { success: false, error: `Stok tidak boleh minus/negatif. Stok saat ini: ${prod.stock}` });
        }
      } else {
        return sendJson(res, 400, { success: false, error: 'Jenis perubahan stok tidak valid (restock / adjustment).' });
      }

      db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, productId);
        db.prepare(`
          INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(productId, changeType, quantityChange, prod.stock, newStock, notes || (changeType === 'restock' ? 'Restock bahan masuk' : 'Koreksi stok fisik'), session.fullName);

        db.exec('COMMIT;');
        const diffText = quantityChange >= 0 ? `+${quantityChange}` : `${quantityChange}`;
        return sendJson(res, 200, {
          success: true,
          message: changeType === 'restock'
            ? `Berhasil restock ${prod.name} sebanyak +${quantityChange} unit. Stok baru: ${newStock}.`
            : `Berhasil koreksi stok ${prod.name} (Selisih: ${diffText}). Stok fisik saat ini: ${newStock}.`,
          currentStock: newStock,
          quantityChange
        });
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    }

    if (pathname === '/api/admin/stocks/history' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      let sql = `
        SELECT sm.*, p.name AS product_name, p.image_url, c.name AS category_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params = [];
      if (query.product_id) {
        sql += ' AND sm.product_id = ?';
        params.push(query.product_id);
      }
      sql += ' ORDER BY sm.created_at DESC LIMIT 100';

      const history = db.prepare(sql).all(...params);
      return sendJson(res, 200, { success: true, history });
    }

    // ==========================================
    // 7. CASHIER POS (Point of Sale)
    // ==========================================
    // Fetch products ready for POS (ONLY active products in active categories)
    if (pathname === '/api/pos/products' && req.method === 'GET') {
      const session = requireAuth()(req, res);
      if (!session) return;

      const products = db.prepare(`
        SELECT 
          p.id, p.name, p.price, p.stock, p.min_stock, p.image_url, p.description,
          c.id AS category_id, c.name AS category_name, c.slug AS category_slug
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' AND c.status = 'active'
        ORDER BY c.name ASC, p.name ASC
      `).all();

      const categories = db.prepare(`
        SELECT id, name, slug 
        FROM categories 
        WHERE status = 'active' 
        ORDER BY name ASC
      `).all();

      return sendJson(res, 200, { success: true, products, categories });
    }

    // Process checkout transaction (ATOMIC WITH DATABASE LOCK)
    if (pathname === '/api/pos/checkout' && req.method === 'POST') {
      const session = requireAuth()(req, res);
      if (!session) return;

      const { items, cashReceived, customerName, notes, paymentMethod } = body || {};

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendJson(res, 400, { success: false, error: 'Keranjang belanja tidak boleh kosong.' });
      }

      const finalMethod = ['cash', 'qris', 'transfer'].includes(paymentMethod) ? paymentMethod : 'cash';
      const invoiceNumber = generateInvoiceNumber();

      // Execute transaction with BEGIN IMMEDIATE to prevent race conditions & double-spend
      db.exec('BEGIN IMMEDIATE;');
      try {
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        // 1. Verify every product exists, is active, and has sufficient stock
        for (const item of items) {
          const qty = parseInt(item.quantity, 10);
          if (isNaN(qty) || qty <= 0) {
            db.exec('ROLLBACK;');
            return sendJson(res, 400, { success: false, error: 'Jumlah produk harus lebih dari 0.' });
          }

          const prod = db.prepare(`
            SELECT p.id, p.name, p.price, p.stock, p.status, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
          `).get(item.productId);

          if (!prod) {
            db.exec('ROLLBACK;');
            return sendJson(res, 404, { success: false, error: `Produk ID #${item.productId} tidak ditemukan.` });
          }

          if (prod.status !== 'active') {
            db.exec('ROLLBACK;');
            return sendJson(res, 400, { success: false, error: `Produk "${prod.name}" sedang nonaktif dan tidak dapat dijual.` });
          }

          if (prod.stock < qty) {
            db.exec('ROLLBACK;');
            return sendJson(res, 400, {
              success: false,
              error: `Stok produk "${prod.name}" tidak mencukupi. Sisa stok: ${prod.stock}, diminta: ${qty}.`
            });
          }

          const itemSubtotal = prod.price * qty;
          calculatedSubtotal += itemSubtotal;

          verifiedItems.push({
            productId: prod.id,
            name: prod.name,
            categoryName: prod.category_name,
            price: prod.price,
            quantity: qty,
            subtotal: itemSubtotal,
            stockBefore: prod.stock,
            stockAfter: prod.stock - qty
          });
        }

        // Tax calculation from settings
        const taxSetting = db.prepare("SELECT value FROM settings WHERE key = 'tax_percentage'").get();
        const taxPct = taxSetting ? parseFloat(taxSetting.value) || 0 : 0;
        const taxAmount = Math.round((calculatedSubtotal * taxPct) / 100);
        const totalAmount = calculatedSubtotal + taxAmount;

        // Payment validation
        let received = totalAmount;
        let changeAmount = 0;

        if (finalMethod === 'cash') {
          if (cashReceived === undefined || isNaN(cashReceived) || parseInt(cashReceived, 10) < totalAmount) {
            db.exec('ROLLBACK;');
            const given = parseInt(cashReceived || 0, 10);
            return sendJson(res, 400, {
              success: false,
              error: `Nominal uang tunai (Rp ${given.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`
            });
          }
          received = parseInt(cashReceived, 10);
          changeAmount = received - totalAmount;
        }

        // 2. Insert into transactions table
        const insertTrx = db.prepare(`
          INSERT INTO transactions (
            invoice_number, user_id, cashier_name, subtotal, tax, discount,
            total_amount, cash_received, change_amount, payment_method,
            payment_status, customer_name, notes
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'completed', ?, ?)
        `);

        const resTrx = insertTrx.run(
          invoiceNumber,
          session.userId,
          session.fullName,
          calculatedSubtotal,
          taxAmount,
          totalAmount,
          received,
          changeAmount,
          finalMethod,
          customerName ? customerName.trim() : 'Tamu',
          notes || null
        );

        const transactionId = Number(resTrx.lastInsertRowid);

        // 3. Insert transaction details & update stocks & log stock movements
        const insertDetail = db.prepare(`
          INSERT INTO transaction_details (
            transaction_id, product_id, product_name, category_name, price, quantity, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const insertStockLog = db.prepare(`
          INSERT INTO stock_movements (
            product_id, change_type, quantity_change, previous_stock, current_stock, reference_id, notes, created_by
          ) VALUES (?, 'sale', ?, ?, ?, ?, ?, ?)
        `);

        for (const item of verifiedItems) {
          insertDetail.run(
            transactionId,
            item.productId,
            item.name,
            item.categoryName,
            item.price,
            item.quantity,
            item.subtotal
          );

          // Atomic deduction
          updateStock.run(item.stockAfter, item.productId);

          // Audit log
          insertStockLog.run(
            item.productId,
            -item.quantity,
            item.stockBefore,
            item.stockAfter,
            invoiceNumber,
            `Penjualan kasir: ${invoiceNumber}`,
            session.fullName
          );
        }

        // Commit transaction
        db.exec('COMMIT;');

        // Return complete receipt data
        return sendJson(res, 201, {
          success: true,
          message: 'Transaksi berhasil diselesaikan.',
          receipt: {
            id: transactionId,
            invoiceNumber,
            date: new Date().toISOString(),
            cashierName: session.fullName,
            customerName: customerName ? customerName.trim() : 'Tamu',
            items: verifiedItems,
            subtotal: calculatedSubtotal,
            tax: taxAmount,
            total: totalAmount,
            cashReceived: received,
            change: changeAmount,
            paymentMethod: finalMethod,
            notes: notes || null
          }
        });
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error('[Checkout Error]', err);
        return sendJson(res, 500, { success: false, error: `Gagal memproses transaksi: ${err.message}` });
      }
    }

    // POS My Transactions (Kasir sees own transactions, Admin sees all)
    if (pathname === '/api/pos/transactions' && req.method === 'GET') {
      const session = requireAuth()(req, res);
      if (!session) return;

      let sql = `
        SELECT t.*, COUNT(td.id) AS total_items
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
      `;
      const params = [];

      if (session.role === 'kasir') {
        sql += ' WHERE t.user_id = ?';
        params.push(session.userId);
      } else {
        sql += ' WHERE 1=1';
      }

      if (query.date) {
        sql += ' AND date(t.created_at) = ?';
        params.push(query.date);
      }
      if (query.status) {
        sql += ' AND t.payment_status = ?';
        params.push(query.status);
      }

      sql += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT 100';

      const transactions = db.prepare(sql).all(...params);
      return sendJson(res, 200, { success: true, transactions });
    }

    // Cancel Transaction (Void) with Reason & Stock Restoration (W7)
    const cancelTrxMatch = pathname.match(/^\/api\/(pos|admin)\/transactions\/(\d+)\/cancel$/);
    if (cancelTrxMatch && req.method === 'POST') {
      const session = requireAuth()(req, res);
      if (!session) return;

      const trxId = parseInt(cancelTrxMatch[2], 10);
      const { reason } = body || {};

      if (!reason || !reason.trim()) {
        return sendJson(res, 400, { success: false, error: 'Alasan pembatalan transaksi wajib diisi.' });
      }

      const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(trxId);
      if (!trx) {
        return sendJson(res, 404, { success: false, error: 'Transaksi tidak ditemukan.' });
      }

      if (trx.payment_status === 'cancelled') {
        return sendJson(res, 400, { success: false, error: 'Transaksi ini sudah pernah dibatalkan sebelumnya.' });
      }

      if (session.role === 'kasir' && trx.user_id !== session.userId) {
        return sendJson(res, 403, { success: false, error: 'Kasir hanya berhak membatalkan transaksi yang dibuat sendiri.' });
      }

      db.exec('BEGIN IMMEDIATE;');
      try {
        // 1. Update transaction status
        db.prepare(`
          UPDATE transactions 
          SET payment_status = 'cancelled',
              cancel_reason = ?,
              cancelled_at = CURRENT_TIMESTAMP,
              cancelled_by = ?
          WHERE id = ?
        `).run(reason.trim(), session.fullName, trxId);

        // 2. Restore stocks and log movements
        const details = db.prepare('SELECT product_id, product_name, quantity FROM transaction_details WHERE transaction_id = ?').all(trxId);
        const updateStock = db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const insertStockLog = db.prepare(`
          INSERT INTO stock_movements (
            product_id, change_type, quantity_change, previous_stock, current_stock, reference_id, notes, created_by
          ) VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?)
        `);

        for (const item of details) {
          const currentProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
          const prevStock = currentProd ? currentProd.stock : 0;
          const restoredStock = prevStock + item.quantity;

          updateStock.run(item.quantity, item.product_id);
          insertStockLog.run(
            item.product_id,
            item.quantity,
            prevStock,
            restoredStock,
            trx.invoice_number,
            `Pembatalan Transaksi ${trx.invoice_number}: ${reason.trim()}`,
            session.fullName
          );
        }

        db.exec('COMMIT;');
        return sendJson(res, 200, {
          success: true,
          message: `Transaksi ${trx.invoice_number} berhasil dibatalkan dan stok dikembalikan.`,
          invoiceNumber: trx.invoice_number
        });
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error('[Cancel Transaction Error]', err);
        return sendJson(res, 500, { success: false, error: `Gagal membatalkan transaksi: ${err.message}` });
      }
    }

    // Print Receipt details by ID or Invoice
    const receiptMatch = pathname.match(/^\/api\/pos\/receipt\/([a-zA-Z0-9_-]+)$/);
    if (receiptMatch && req.method === 'GET') {
      const session = requireAuth()(req, res);
      if (!session) return;

      const param = receiptMatch[1];
      const isNum = /^\d+$/.test(param);

      const trx = isNum
        ? db.prepare('SELECT * FROM transactions WHERE id = ?').get(parseInt(param, 10))
        : db.prepare('SELECT * FROM transactions WHERE invoice_number = ?').get(param);

      if (!trx) return sendJson(res, 404, { success: false, error: 'Transaksi tidak ditemukan.' });

      // Kasir permission check: kasir can view if it was their transaction or if looking up receipt
      if (session.role === 'kasir' && trx.user_id !== session.userId) {
        // Kasir is allowed to view receipt for printing if they have the invoice number
      }

      const items = db.prepare('SELECT * FROM transaction_details WHERE transaction_id = ?').all(trx.id);
      const settingsRows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      settingsRows.forEach(r => { settings[r.key] = r.value; });

      return sendJson(res, 200, {
        success: true,
        receipt: {
          ...trx,
          items,
          settings
        }
      });
    }

    // ==========================================
    // 8. ALL TRANSACTIONS (Admin Only)
    // ==========================================
    if (pathname === '/api/admin/transactions' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      let sql = `
        SELECT t.*, COUNT(td.id) AS total_items
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
        WHERE 1=1
      `;
      const params = [];

      if (query.date) {
        sql += ' AND date(t.created_at) = ?';
        params.push(query.date);
      }
      if (query.startDate) {
        sql += ' AND date(t.created_at) >= ?';
        params.push(query.startDate);
      }
      if (query.endDate) {
        sql += ' AND date(t.created_at) <= ?';
        params.push(query.endDate);
      }
      if (query.status) {
        sql += ' AND t.payment_status = ?';
        params.push(query.status);
      }
      if (query.search) {
        sql += ' AND (t.invoice_number LIKE ? OR t.cashier_name LIKE ? OR t.customer_name LIKE ?)';
        const s = `%${query.search.trim()}%`;
        params.push(s, s, s);
      }

      sql += ' GROUP BY t.id ORDER BY t.created_at DESC';

      const transactions = db.prepare(sql).all(...params);
      return sendJson(res, 200, { success: true, transactions });
    }

    const adminTrxMatch = pathname.match(/^\/api\/admin\/transactions\/(\d+)$/);
    if (adminTrxMatch && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(adminTrxMatch[1], 10);
      const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      if (!trx) return sendJson(res, 404, { success: false, error: 'Transaksi tidak ditemukan.' });

      const items = db.prepare('SELECT * FROM transaction_details WHERE transaction_id = ?').all(id);
      return sendJson(res, 200, { success: true, transaction: trx, items });
    }

    // ==========================================
    // 9. REVENUE / OMZET REPORTS (Admin Only)
    // ==========================================
    if (pathname === '/api/admin/reports' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      let dateFilter = "payment_status != 'cancelled'";
      const params = [];

      const { period, startDate, endDate } = query;

      if (period === 'today') {
        dateFilter += " AND date(created_at) = date('now', 'localtime')";
      } else if (period === 'yesterday') {
        dateFilter += " AND date(created_at) = date('now', '-1 day', 'localtime')";
      } else if (period === '7days') {
        dateFilter += " AND created_at >= datetime('now', '-7 days', 'localtime')";
      } else if (period === 'this_month') {
        dateFilter += " AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')";
      } else if (startDate && endDate) {
        dateFilter += ' AND date(created_at) >= ? AND date(created_at) <= ?';
        params.push(startDate, endDate);
      }

      // Summary totals
      const summary = db.prepare(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COUNT(id) AS total_transactions,
          COALESCE(AVG(total_amount), 0) AS average_order_value
        FROM transactions
        WHERE ${dateFilter}
      `).get(...params);

      // Total items sold
      const itemsSold = db.prepare(`
        SELECT COALESCE(SUM(td.quantity), 0) AS total_items
        FROM transaction_details td
        INNER JOIN transactions t ON td.transaction_id = t.id
        WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
      `).get(...params);

      // Daily trend
      const dailyTrend = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', created_at) AS date,
          COUNT(id) AS transaction_count,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM transactions
        WHERE ${dateFilter}
        GROUP BY date
        ORDER BY date ASC
      `).all(...params);

      // Top selling products in this period
      const topProducts = db.prepare(`
        SELECT 
          td.product_name,
          COALESCE(td.category_name, 'Kategori') AS category_name,
          SUM(td.quantity) AS total_sold,
          SUM(td.subtotal) AS total_revenue
        FROM transaction_details td
        INNER JOIN transactions t ON td.transaction_id = t.id
        WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
        GROUP BY td.product_name
        ORDER BY total_sold DESC
        LIMIT 10
      `).all(...params);

      // Category breakdown in this period
      const categoryBreakdown = db.prepare(`
        SELECT 
          COALESCE(td.category_name, 'Lainnya') AS category_name,
          SUM(td.quantity) AS total_quantity,
          SUM(td.subtotal) AS total_revenue
        FROM transaction_details td
        INNER JOIN transactions t ON td.transaction_id = t.id
        WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
        GROUP BY td.category_name
        ORDER BY total_revenue DESC
      `).all(...params);

      // Detailed transaction list for the period
      const transactions = db.prepare(`
        SELECT t.id, t.invoice_number, t.cashier_name, t.customer_name, t.total_amount, t.payment_method, t.payment_status, t.created_at,
               COUNT(td.id) AS total_items
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
        WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `).all(...params);

      return sendJson(res, 200, {
        success: true,
        report: {
          period: period || 'custom',
          summary: {
            totalRevenue: summary.total_revenue,
            totalTransactions: summary.total_transactions,
            averageOrderValue: Math.round(summary.average_order_value),
            totalItemsSold: itemsSold.total_items
          },
          dailyTrend,
          topProducts,
          categoryBreakdown,
          transactions
        }
      });
    }

    // ==========================================
    // 10. USER MANAGEMENT (Admin Only)
    // ==========================================
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const users = db.prepare(`
        SELECT id, username, full_name, role, status, created_at
        FROM users
        ORDER BY role ASC, full_name ASC
      `).all();

      return sendJson(res, 200, { success: true, users });
    }

    if (pathname === '/api/admin/users' && req.method === 'POST') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const { username, fullName, password, role, status } = body || {};

      if (!username || !username.trim()) return sendJson(res, 400, { success: false, error: 'Username wajib diisi.' });
      if (!fullName || !fullName.trim()) return sendJson(res, 400, { success: false, error: 'Nama lengkap wajib diisi.' });
      if (!password || password.length < 5) return sendJson(res, 400, { success: false, error: 'Password minimal 5 karakter.' });
      if (!['admin', 'kasir'].includes(role)) return sendJson(res, 400, { success: false, error: 'Role harus Admin atau Kasir.' });

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
      if (existing) return sendJson(res, 400, { success: false, error: 'Username sudah digunakan oleh akun lain.' });

      const hashRes = hashPassword(password);
      const resUser = db.prepare(`
        INSERT INTO users (username, password_hash, salt, full_name, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(username.trim(), hashRes.hash, hashRes.salt, fullName.trim(), role, status || 'active');

      return sendJson(res, 201, {
        success: true,
        message: 'Pengguna baru berhasil ditambahkan.',
        user: { id: Number(resUser.lastInsertRowid), username: username.trim(), fullName: fullName.trim(), role, status: status || 'active' }
      });
    }

    const userMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (userMatch && req.method === 'PUT') {
      const session = requireAuth('admin')(req, res);
      if (!session) return;

      const id = parseInt(userMatch[1], 10);
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!targetUser) return sendJson(res, 404, { success: false, error: 'Pengguna tidak ditemukan.' });

      const { fullName, role, status, password } = body || {};

      if (!fullName || !fullName.trim()) return sendJson(res, 400, { success: false, error: 'Nama lengkap wajib diisi.' });
      if (!['admin', 'kasir'].includes(role)) return sendJson(res, 400, { success: false, error: 'Role tidak valid.' });

      // Protection: Admin cannot deactivate or demote themselves!
      if (session.userId === id && (status === 'inactive' || role !== 'admin')) {
        return sendJson(res, 400, { success: false, error: 'Anda tidak dapat menonaktifkan atau mengubah role akun Anda sendiri.' });
      }

      if (password && password.trim()) {
        const hashRes = hashPassword(password.trim());
        db.prepare(`
          UPDATE users 
          SET full_name = ?, role = ?, status = ?, password_hash = ?, salt = ?
          WHERE id = ?
        `).run(fullName.trim(), role, status || 'active', hashRes.hash, hashRes.salt, id);
      } else {
        db.prepare(`
          UPDATE users 
          SET full_name = ?, role = ?, status = ?
          WHERE id = ?
        `).run(fullName.trim(), role, status || 'active', id);
      }

      return sendJson(res, 200, { success: true, message: 'Data pengguna berhasil diperbarui.' });
    }

    // ==========================================
    // 11. PUBLIC DIGITAL MENU & CUSTOMER ORDERS
    // ==========================================
    if (pathname === '/api/menu' && req.method === 'GET') {
      const products = db.prepare(`
        SELECT p.id, p.name, p.price, p.stock, p.min_stock, p.image_url, p.description,
               c.id AS category_id, c.name AS category_name, c.slug AS category_slug
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' AND c.status = 'active'
        ORDER BY c.name ASC, p.name ASC
      `).all();
      const categories = db.prepare("SELECT id, name, slug FROM categories WHERE status = 'active' ORDER BY name ASC").all();
      return sendJson(res, 200, { success: true, products, categories });
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      const customerId = query.customerId;
      const catalog = query.catalog;

      if (catalog === 'true') {
        const products = db.prepare(`
          SELECT p.id, p.name, p.price, p.stock, p.min_stock, p.image_url, p.description,
                 c.id AS category_id, c.name AS category_name, c.slug AS category_slug
          FROM products p
          INNER JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'active' AND c.status = 'active'
          ORDER BY c.name ASC, p.name ASC
        `).all();
        const categories = db.prepare("SELECT id, name, slug FROM categories WHERE status = 'active' ORDER BY name ASC").all();
        return sendJson(res, 200, { success: true, products, categories });
      }

      if (customerId) {
        const list = mockCustomerOrders.filter(o => o.customerId === customerId);
        return sendJson(res, 200, { success: true, orders: list });
      }

      return sendJson(res, 200, { success: true, orders: mockCustomerOrders });
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const { customerId, customerName, tableNumber, notes, items } = body || {};
      if (!customerName || !customerName.trim()) {
        return sendJson(res, 400, { success: false, error: 'Nama pelanggan wajib diisi.' });
      }
      if (!items || !items.length) {
        return sendJson(res, 400, { success: false, error: 'Keranjang belanja tidak boleh kosong.' });
      }

      const orderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random()*900)}`;
      let subtotal = 0;
      const orderItems = items.map(item => {
        const price = Number(item.price) || 0;
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const itemSubtotal = price * qty;
        subtotal += itemSubtotal;
        return {
          productId: item.productId || item.id,
          name: item.name,
          categoryName: item.categoryName,
          price,
          quantity: qty,
          subtotal: itemSubtotal
        };
      });

      const newOrder = {
        id: orderNumber,
        orderNumber,
        customerId: customerId || `cust_${Date.now()}`,
        customerName: customerName.trim(),
        tableNumber: tableNumber ? tableNumber.trim() : 'Meja Umum',
        notes: notes ? notes.trim() : '',
        items: orderItems,
        subtotal,
        tax: 0,
        totalAmount: subtotal,
        status: 'menunggu_konfirmasi',
        statusNotes: 'Pesanan telah diajukan dan sedang menunggu konfirmasi kasir.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockCustomerOrders.unshift(newOrder);
      return sendJson(res, 201, { success: true, message: 'Pesanan berhasil diajukan.', order: newOrder });
    }

    if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
      const id = pathname.replace('/api/orders/', '');
      const order = mockCustomerOrders.find(o => o.id === id || o.orderNumber === id);
      if (!order) {
        return sendJson(res, 404, { success: false, error: 'Pesanan tidak ditemukan.' });
      }

      const { action, customerId, rejectedReason } = body || {};

      if (action === 'cancel') {
        if (order.status !== 'menunggu_konfirmasi') {
          return sendJson(res, 400, { success: false, error: 'Pesanan tidak dapat dibatalkan karena sudah dikonfirmasi kasir.' });
        }
        order.status = 'dibatalkan';
        order.statusNotes = 'Pesanan dibatalkan oleh pelanggan.';
        order.cancelledAt = new Date().toISOString();
        return sendJson(res, 200, { success: true, message: 'Pesanan berhasil dibatalkan.', order });
      }

      const session = requireAuth()(req, res);
      if (!session) return;

      const now = new Date().toISOString();
      if (action === 'confirm') {
        order.status = 'dikonfirmasi';
        order.confirmedAt = now;
        order.confirmedBy = session.fullName;
        order.statusNotes = 'Pesanan dikonfirmasi oleh kasir dan masuk antrean.';
      } else if (action === 'reject') {
        order.status = 'ditolak';
        order.rejectedReason = rejectedReason || 'Ditolak oleh kasir.';
        order.statusNotes = 'Pesanan ditolak: ' + (rejectedReason || 'Ditolak');
      } else if (action === 'prepare') {
        order.status = 'sedang_disiapkan';
        order.statusNotes = 'Pesanan sedang diracik / disiapkan di dapur.';
      } else if (action === 'ready') {
        order.status = 'siap_diambil';
        order.statusNotes = 'Pesanan siap diambil di counter pick-up.';
      } else if (action === 'complete') {
        order.status = 'selesai';
        order.statusNotes = 'Pesanan telah selesai diserahkan ke pelanggan.';
      }

      order.updatedAt = now;
      return sendJson(res, 200, { success: true, message: 'Status pesanan berhasil diperbarui.', order });
    }

    // Default route not found
    return sendJson(res, 404, { success: false, error: `Endpoint API ${pathname} tidak ditemukan.` });
  } catch (error) {
    console.error(`[API ERROR] ${req.method} ${pathname}:`, error);
    return sendJson(res, 500, { success: false, error: `Internal Server Error: ${error.message}` });
  }
}

module.exports = {
  handleApi
};
