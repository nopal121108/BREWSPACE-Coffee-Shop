import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `TRX-${year}${month}${day}-`;

  const row = db.prepare(`
    SELECT invoice_number FROM transactions 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`) as any;

  let seq = 1;
  if (row && row.invoice_number) {
    const parts = row.invoice_number.split('-');
    if (parts.length >= 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  const session = extractSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, cashReceived, customerName, notes, paymentMethod } = body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Keranjang belanja tidak boleh kosong.' }, { status: 400 });
    }

    const finalMethod = ['cash', 'qris', 'transfer'].includes(paymentMethod) ? paymentMethod : 'cash';
    const invoiceNumber = generateInvoiceNumber();

    db.exec('BEGIN IMMEDIATE;');
    try {
      let calculatedSubtotal = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          db.exec('ROLLBACK;');
          return NextResponse.json({ success: false, error: 'Jumlah produk harus lebih dari 0.' }, { status: 400 });
        }

        const prod = db.prepare(`
          SELECT p.id, p.name, p.price, p.stock, p.status, c.name AS category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ?
        `).get(item.productId) as any;

        if (!prod) {
          db.exec('ROLLBACK;');
          return NextResponse.json({ success: false, error: `Produk ID #${item.productId} tidak ditemukan.` }, { status: 404 });
        }

        if (prod.status !== 'active') {
          db.exec('ROLLBACK;');
          return NextResponse.json({ success: false, error: `Produk "${prod.name}" sedang nonaktif.` }, { status: 400 });
        }

        if (prod.stock < qty) {
          db.exec('ROLLBACK;');
          return NextResponse.json({
            success: false,
            error: `Stok produk "${prod.name}" tidak mencukupi. Sisa stok: ${prod.stock}, diminta: ${qty}.`
          }, { status: 400 });
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

      // Tax calculation
      const taxSetting = db.prepare("SELECT value FROM settings WHERE key = 'tax_percentage'").get() as any;
      const taxPct = taxSetting ? parseFloat(taxSetting.value) || 0 : 0;
      const taxAmount = Math.round((calculatedSubtotal * taxPct) / 100);
      const totalAmount = calculatedSubtotal + taxAmount;

      let received = totalAmount;
      let changeAmount = 0;

      if (finalMethod === 'cash') {
        if (cashReceived === undefined || isNaN(cashReceived) || parseInt(cashReceived, 10) < totalAmount) {
          db.exec('ROLLBACK;');
          const given = parseInt(cashReceived || 0, 10);
          return NextResponse.json({
            success: false,
            error: `Nominal uang yang diterima (Rp ${given.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`
          }, { status: 400 });
        }
        received = parseInt(cashReceived, 10);
        changeAmount = received - totalAmount;
      }

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
      session.fullName,
        calculatedSubtotal,
        taxAmount,
        totalAmount,
        received,
        changeAmount,
        paymentMethod || 'cash',
        customerName ? customerName.trim() : 'Tamu',
        notes || null
      );

      const transactionId = Number(resTrx.lastInsertRowid);

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

        updateStock.run(item.stockAfter, item.productId);

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

      db.exec('COMMIT;');

      return NextResponse.json({
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
      }, { status: 201 });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

