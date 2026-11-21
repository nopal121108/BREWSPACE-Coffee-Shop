import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin role required' }, { status: 403 });
  }

  const { id } = await params;
  const trxId = parseInt(id, 10);

  try {
    const { reason } = await req.json();
    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Alasan pembatalan transaksi wajib diisi.' }, { status: 400 });
    }

    const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(trxId) as any;
    if (!trx) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    if (trx.payment_status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Transaksi ini sudah pernah dibatalkan sebelumnya.' }, { status: 400 });
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        UPDATE transactions 
        SET payment_status = 'cancelled',
            cancel_reason = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancelled_by = ?
        WHERE id = ?
      `).run(reason.trim(), session.fullName, trxId);

      const details = db.prepare('SELECT product_id, product_name, quantity FROM transaction_details WHERE transaction_id = ?').all(trxId) as any[];
      const updateStock = db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const insertStockLog = db.prepare(`
        INSERT INTO stock_movements (
          product_id, change_type, quantity_change, previous_stock, current_stock, reference_id, notes, created_by
        ) VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?)
      `);

      for (const item of details) {
        const currentProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id) as any;
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
      return NextResponse.json({
        success: true,
        message: `Transaksi ${trx.invoice_number} berhasil dibatalkan dan stok produk telah dikembalikan.`,
        invoiceNumber: trx.invoice_number
      });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

