import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { productId, changeType, quantity, notes, direction } = body || {};

    if (!productId) return NextResponse.json({ success: false, error: 'Produk wajib dipilih.' }, { status: 400 });
    if (!quantity || isNaN(quantity) || parseInt(quantity, 10) <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah stok harus lebih dari 0.' }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    const prod = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(productId) as any;
    if (!prod) return NextResponse.json({ success: false, error: 'Produk tidak ditemukan.' }, { status: 404 });

    let quantityChange = 0;
    let newStock = prod.stock;

    if (changeType === 'restock') {
      quantityChange = qty;
      newStock = prod.stock + qty;
    } else if (changeType === 'adjustment') {
      const dir = direction === 'subtract' ? -1 : 1;
      quantityChange = dir * qty;
      newStock = prod.stock + quantityChange;
      if (newStock < 0) {
        return NextResponse.json({ success: false, error: `Stok tidak mencukupi untuk pengurangan ini. Stok saat ini: ${prod.stock}` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Jenis perubahan stok tidak valid.' }, { status: 400 });
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, productId);
      db.prepare(`
        INSERT INTO stock_movements (product_id, change_type, quantity_change, previous_stock, current_stock, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(productId, changeType, quantityChange, prod.stock, newStock, notes || 'Penyesuaian stok manual', session.fullName);

      db.exec('COMMIT;');
      return NextResponse.json({
        success: true,
        message: `Stok untuk "${prod.name}" berhasil disesuaikan menjadi ${newStock}.`,
        currentStock: newStock
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

