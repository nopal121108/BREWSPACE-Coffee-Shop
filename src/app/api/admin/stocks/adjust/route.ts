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
    const { productId, changeType, quantity, actualStock, notes, direction } = body || {};

    if (!productId) return NextResponse.json({ success: false, error: 'Bahan atau produk wajib dipilih.' }, { status: 400 });

    const prod = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(productId) as any;
    if (!prod) return NextResponse.json({ success: false, error: 'Produk tidak ditemukan.' }, { status: 404 });

    let quantityChange = 0;
    let newStock = prod.stock;

    if (changeType === 'restock') {
      const qty = parseInt(quantity, 10);
      if (!qty || isNaN(qty) || qty <= 0) {
        return NextResponse.json({ success: false, error: 'Jumlah stok masuk harus lebih dari 0 unit.' }, { status: 400 });
      }
      quantityChange = qty;
      newStock = prod.stock + qty;
    } else if (changeType === 'adjustment') {
      if (actualStock !== undefined && actualStock !== null && actualStock !== '') {
        const actual = parseInt(actualStock, 10);
        if (isNaN(actual) || actual < 0) {
          return NextResponse.json({ success: false, error: 'Jumlah stok fisik sebenarnya tidak boleh bernilai negatif.' }, { status: 400 });
        }
        quantityChange = actual - prod.stock;
        newStock = actual;
      } else {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json({ success: false, error: 'Jumlah unit koreksi tidak valid.' }, { status: 400 });
        }
        const dir = direction === 'subtract' ? -1 : 1;
        quantityChange = dir * qty;
        newStock = prod.stock + quantityChange;
      }

      if (newStock < 0) {
        return NextResponse.json({ success: false, error: `Stok tidak boleh minus/negatif. Stok saat ini: ${prod.stock}` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Jenis perubahan stok tidak valid (restock / adjustment).' }, { status: 400 });
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
      return NextResponse.json({
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

