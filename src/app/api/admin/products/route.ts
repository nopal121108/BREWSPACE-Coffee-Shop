import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category_id = searchParams.get('category_id');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s);
  }
  sql += ' ORDER BY p.id DESC';

  const products = db.prepare(sql).all(...params);
  return NextResponse.json({ success: true, products });
}

export async function POST(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, category_id, price, stock, min_stock, description, image_url, status } = body || {};

    if (!name || !name.trim()) return NextResponse.json({ success: false, error: 'Nama produk wajib diisi.' }, { status: 400 });
    if (!category_id) return NextResponse.json({ success: false, error: 'Kategori produk wajib dipilih.' }, { status: 400 });
    if (price === undefined || isNaN(price) || price < 0) return NextResponse.json({ success: false, error: 'Harga produk tidak valid.' }, { status: 400 });

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
      return NextResponse.json({ success: true, message: 'Produk berhasil ditambahkan.', productId: newProdId }, { status: 201 });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

