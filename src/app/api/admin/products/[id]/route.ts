import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const resolvedParams = await Promise.resolve(context.params);
  const id = parseInt(resolvedParams.id, 10);

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Produk tidak ditemukan.' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, category_id, price, stock, min_stock, description, image_url, status } = body || {};

    if (!name || !name.trim()) return NextResponse.json({ success: false, error: 'Nama produk wajib diisi.' }, { status: 400 });
    if (!category_id) return NextResponse.json({ success: false, error: 'Kategori produk wajib dipilih.' }, { status: 400 });
    if (price === undefined || isNaN(price) || price < 0) return NextResponse.json({ success: false, error: 'Harga produk tidak valid.' }, { status: 400 });

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

      if (newStock !== existing.stock) {
        const diff = newStock - existing.stock;
        db.prepare(`
          INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
          VALUES (?, 'adjustment', ?, ?, ?, 'Penyesuaian Manual saat Edit Produk', ?)
        `).run(id, diff, existing.stock, newStock, session.fullName);
      }

      db.exec('COMMIT;');
      return NextResponse.json({ success: true, message: 'Produk berhasil diperbarui.' });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
