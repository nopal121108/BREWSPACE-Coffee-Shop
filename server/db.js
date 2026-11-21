// server/db.js - SQLite Database Manager for BREWSPACE
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'brewspace.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and Foreign Keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Helper to hash passwords with salt
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'kasir')) NOT NULL DEFAULT 'kasir',
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      image_url TEXT,
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      cashier_name TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      tax INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      cash_received INTEGER NOT NULL,
      change_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'completed',
      customer_name TEXT,
      notes TEXT,
      cancel_reason TEXT,
      cancelled_at DATETIME,
      cancelled_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS transaction_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      category_name TEXT,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_type TEXT CHECK(change_type IN ('sale', 'restock', 'adjustment', 'initial')) NOT NULL,
      quantity_change INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      current_stock INTEGER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'System',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing databases to support cancellation (W7)
  try { db.exec('ALTER TABLE transactions ADD COLUMN cancel_reason TEXT;'); } catch (_) {}
  try { db.exec('ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME;'); } catch (_) {}
  try { db.exec('ALTER TABLE transactions ADD COLUMN cancelled_by TEXT;'); } catch (_) {}

  // Seed default settings if empty
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (countSettings.count === 0) {
    const defaultSettings = [
      ['store_name', 'BREWSPACE Coffee & Roastery'],
      ['store_tagline', 'Artisanal Coffee & Comfortable Space'],
      ['store_address', 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan'],
      ['store_phone', '+62 812-3456-7890'],
      ['store_email', 'hello@brewspace.coffee'],
      ['tax_percentage', '0'],
      ['currency_symbol', 'Rp'],
      ['receipt_footer', 'Terima kasih telah berkunjung ke BREWSPACE! Follow IG @brewspace.coffee']
    ];
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of defaultSettings) {
      insertSetting.run(k, v);
    }
  }

  // Seed default users if empty
  const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (countUsers.count === 0) {
    const adminPass = hashPassword('admin123');
    const kasirPass = hashPassword('kasir123');
    const kasir2Pass = hashPassword('kasir123');

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, salt, full_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', adminPass.hash, adminPass.salt, 'Administrator BrewSpace', 'admin', 'active');
    insertUser.run('kasir', kasirPass.hash, kasirPass.salt, 'Budi Santoso (Barista)', 'kasir', 'active');
    insertUser.run('kasir2', kasir2Pass.hash, kasir2Pass.salt, 'Siti Rahma (Kasir)', 'kasir', 'active');
    console.log('[DB] Seeded default users (admin, kasir, kasir2)');
  }

  // Seed default categories if empty
  const countCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (countCategories.count === 0) {
    const categories = [
      ['Signature Coffee', 'signature-coffee', 'Kopi racikan khas Brewspace dengan cita rasa unik'],
      ['Classic Espresso', 'classic-espresso', 'Espresso murni dan sajian kopi berbasis espresso'],
      ['Manual Brew', 'manual-brew', 'Kopi seduh manual dari biji kopi single origin pilihan'],
      ['Non-Coffee', 'non-coffee', 'Minuman segar teh, matcha, cokelat, dan artisan mocktail'],
      ['Pastry & Bakery', 'pastry-bakery', 'Pastry renyah, croissant hangat, dan cake premium'],
      ['Main Course', 'main-course', 'Makanan lezat peneman nongkrong dan santai']
    ];

    const insertCategory = db.prepare("INSERT INTO categories (name, slug, description, status) VALUES (?, ?, ?, 'active')");
    for (const cat of categories) {
      insertCategory.run(cat[0], cat[1], cat[2]);
    }
    console.log('[DB] Seeded default categories');
  }

  // Seed default products if empty
  const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countProducts.count === 0) {
    // Get category IDs
    const cats = db.prepare('SELECT id, slug FROM categories').all();
    const catMap = {};
    cats.forEach(c => { catMap[c.slug] = c.id; });

    const products = [
      // Signature Coffee
      {
        name: 'Brewspace Aren Latte',
        cat: 'signature-coffee',
        price: 28000,
        stock: 35,
        min_stock: 10,
        image: 'aren-latte.jpg',
        desc: 'Espresso ganda berpadu susu segar murni dan sirup gula aren organik premium khas nusantara.'
      },
      {
        name: 'Caramel Macchiato Velvet',
        cat: 'signature-coffee',
        price: 34000,
        stock: 25,
        min_stock: 8,
        image: 'caramel-macchiato.jpg',
        desc: 'Espresso kaya rasa dengan steamed milk lembut, vanilla bean, dan drizzled saus karamel panggang.'
      },
      {
        name: 'Smoked Vanilla Cold Brew',
        cat: 'signature-coffee',
        price: 32000,
        stock: 18,
        min_stock: 5,
        image: 'smoked-coldbrew.jpg',
        desc: 'Kopi diseduh dingin selama 18 jam dengan infus vanilla Madagascar dan sentuhan aroma kayu manis.'
      },
      {
        name: 'Spanish Sea Salt Latte',
        cat: 'signature-coffee',
        price: 35000,
        stock: 22,
        min_stock: 6,
        image: 'spanish-latte.jpg',
        desc: 'Espresso pekat manis berpadu foam sea salt gurih creamy yang memanjakan lidah.'
      },

      // Classic Espresso
      {
        name: 'Double Espresso Ristretto',
        cat: 'classic-espresso',
        price: 22000,
        stock: 50,
        min_stock: 10,
        image: 'double-espresso.jpg',
        desc: 'Dua shot espresso konsentrat tinggi dengan crema tebal keemasan dan aftertaste cokelat hitam.'
      },
      {
        name: 'Caffe Americano',
        cat: 'classic-espresso',
        price: 25000,
        stock: 45,
        min_stock: 10,
        image: 'americano.jpg',
        desc: 'Espresso klasik yang dilarutkan dengan air panas atau dingin dengan aroma kacang panggang.'
      },
      {
        name: 'Caffe Latte Art',
        cat: 'classic-espresso',
        price: 30000,
        stock: 30,
        min_stock: 8,
        image: 'latte-art.jpg',
        desc: 'Kombinasi harmonis espresso harum dan susu microfoam creamy dengan lukisan latte art menawan.'
      },
      {
        name: 'Cappuccino Cinnamon',
        cat: 'classic-espresso',
        price: 30000,
        stock: 28,
        min_stock: 8,
        image: 'cappuccino.jpg',
        desc: 'Espresso dengan lapisan susu dan foam seimbang bertabur bubuk kayu manis wangi.'
      },
      {
        name: 'Flat White Melbourne',
        cat: 'classic-espresso',
        price: 32000,
        stock: 20,
        min_stock: 5,
        image: 'flat-white.jpg',
        desc: 'Double shot ristretto dengan velvety microfoam tipis gaya khas kedai kopi Melbourne.'
      },

      // Manual Brew
      {
        name: 'V60 Gayo Anaerob Natural',
        cat: 'manual-brew',
        price: 36000,
        stock: 15,
        min_stock: 5,
        image: 'v60-coffee.jpg',
        desc: 'Single origin Aceh Gayo dengan notes blueberry, black tea, dan acidity buah tropis yang menyegarkan.'
      },
      {
        name: 'Japanese Iced Drip Flores',
        cat: 'manual-brew',
        price: 36000,
        stock: 12,
        min_stock: 5,
        image: 'japanese-drip.jpg',
        desc: 'Kopi seduh tetes dingin menggunakan es batu langsung, menghasilkan body bersih dengan notes peach & floral.'
      },
      {
        name: 'Aeropress Toraja Sapan',
        cat: 'manual-brew',
        price: 34000,
        stock: 14,
        min_stock: 5,
        image: 'aeropress.jpg',
        desc: 'Ekstraksi Aeropress dari biji kopi Toraja Sapan dengan rasa cokelat rempah pekat dan body tebal.'
      },

      // Non-Coffee
      {
        name: 'Kyoto Uji Matcha Latte',
        cat: 'non-coffee',
        price: 34000,
        stock: 26,
        min_stock: 8,
        image: 'matcha-latte.jpg',
        desc: 'Matcha ceremonial grade asli dari Kyoto, Jepang yang di-whisk sempurna bersama oat milk atau susu segar.'
      },
      {
        name: 'Artisan Dark Belgian Chocolate',
        cat: 'non-coffee',
        price: 32000,
        stock: 24,
        min_stock: 6,
        image: 'hot-chocolate.jpg',
        desc: 'Cokelat Belgia 70% kaya antioksidan dengan tekstur kental lembut dan rasa manis elegan.'
      },
      {
        name: 'Earl Grey Lavender Tea',
        cat: 'non-coffee',
        price: 26000,
        stock: 30,
        min_stock: 5,
        image: 'earl-grey.jpg',
        desc: 'Seduhan daun teh hitam bergamot berpadu kelopak bunga lavender yang menenangkan.'
      },

      // Pastry & Bakery
      {
        name: 'Butter Croissant Premium',
        cat: 'pastry-bakery',
        price: 24000,
        stock: 16,
        min_stock: 6,
        image: 'croissant.jpg',
        desc: 'Croissant khas Prancis dengan 27 lapisan mentega Elle & Vire renyah di luar dan lembut di dalam.'
      },
      {
        name: 'Pain au Chocolat Truffle',
        cat: 'pastry-bakery',
        price: 28000,
        stock: 14,
        min_stock: 5,
        image: 'pain-au-chocolat.jpg',
        desc: 'Pastry mentega berlapis lelehan dark chocolate batangan ganda yang meleleh saat dihangatkan.'
      },
      {
        name: 'Almond Danish Pastry',
        cat: 'pastry-bakery',
        price: 30000,
        stock: 4, // Intentionally low stock (< 5) to test low-stock indicator!
        min_stock: 5,
        image: 'almond-danish.jpg',
        desc: 'Danish flaky dengan isian frangipane almond manis lembut dan taburan kacang almond panggang.'
      },
      {
        name: 'Red Velvet Cheesecake Slice',
        cat: 'pastry-bakery',
        price: 38000,
        stock: 8,
        min_stock: 4,
        image: 'red-velvet.jpg',
        desc: 'Kue red velvet bertingkat dengan selai cream cheese Philadelphia asam segar yang seimbang.'
      },

      // Main Course
      {
        name: 'Spaghetti Aglio Olio Smoked Beef',
        cat: 'main-course',
        price: 45000,
        stock: 20,
        min_stock: 5,
        image: 'aglio-olio.jpg',
        desc: 'Pasta al dente ditumis minyak zaitun murni, bawang putih, cabai kering, dan potongan daging asap melimpah.'
      },
      {
        name: 'Brewspace Truffle Fries',
        cat: 'main-course',
        price: 32000,
        stock: 25,
        min_stock: 5,
        image: 'truffle-fries.jpg',
        desc: 'Kentang goreng renyah bumbu truffle oil wangi dengan parutan keju parmesan dan saus cocolan tartar.'
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (category_id, name, description, price, stock, min_stock, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const insertStock = db.prepare(`
      INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
      VALUES (?, 'initial', ?, 0, ?, 'Stok Awal Sistem', 'System')
    `);

    for (const p of products) {
      const catId = catMap[p.cat] || 1;
      const res = insertProd.run(catId, p.name, p.desc, p.price, p.stock, p.min_stock, p.image);
      const prodId = Number(res.lastInsertRowid);
      insertStock.run(prodId, p.stock, p.stock);
    }
    console.log('[DB] Seeded default products and initial stock movements');
  }

  // Seed sample initial transactions if empty to populate the initial charts and reports
  const countTrx = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  if (countTrx.count === 0) {
    const adminUser = db.prepare("SELECT id, full_name FROM users WHERE username = 'admin'").get();
    const kasirUser = db.prepare("SELECT id, full_name FROM users WHERE username = 'kasir'").get();
    const prods = db.prepare('SELECT id, name, price FROM products').all();

    if (prods.length >= 4 && kasirUser) {
      // Helper to generate seed transaction for past few days
      const insertTrx = db.prepare(`
        INSERT INTO transactions (
          invoice_number, user_id, cashier_name, subtotal, tax, discount,
          total_amount, cash_received, change_amount, payment_method,
          payment_status, notes, created_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, 'cash', 'completed', 'Pesanan dine-in', ?)
      `);

      const insertDetail = db.prepare(`
        INSERT INTO transaction_details (transaction_id, product_id, product_name, category_name, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const sampleDates = [
        new Date(Date.now() - 3 * 86400000).toISOString().replace('T', ' ').substring(0, 19),
        new Date(Date.now() - 2 * 86400000).toISOString().replace('T', ' ').substring(0, 19),
        new Date(Date.now() - 1 * 86400000).toISOString().replace('T', ' ').substring(0, 19),
        new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19)
      ];

      sampleDates.forEach((dateStr, idx) => {
        const invNum = `TRX-${dateStr.substring(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`;
        const p1 = prods[idx % prods.length];
        const p2 = prods[(idx + 2) % prods.length];
        const total = p1.price * 2 + p2.price * 1;
        const cash = Math.ceil(total / 50000) * 50000;
        const change = cash - total;

        const resTrx = insertTrx.run(invNum, kasirUser.id, kasirUser.full_name, total, total, cash, change, dateStr);
        const trxId = Number(resTrx.lastInsertRowid);

        insertDetail.run(trxId, p1.id, p1.name, 'Signature Coffee', p1.price, 2, p1.price * 2);
        insertDetail.run(trxId, p2.id, p2.name, 'Pastry & Bakery', p2.price, 1, p2.price * 1);
      });
      console.log('[DB] Seeded initial sales transactions for reports and analytics');
    }
  }
}

// Execute database initialization
initDatabase();

module.exports = {
  db,
  hashPassword,
  verifyPassword
};
