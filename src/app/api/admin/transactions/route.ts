import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');

  let sql = `
    SELECT t.*, COUNT(td.id) AS total_items
    FROM transactions t
    LEFT JOIN transaction_details td ON t.id = td.transaction_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (startDate) {
    sql += ' AND date(t.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date(t.created_at) <= ?';
    params.push(endDate);
  }
  if (search) {
    sql += ' AND (t.invoice_number LIKE ? OR t.cashier_name LIKE ? OR t.customer_name LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  sql += ' GROUP BY t.id ORDER BY t.created_at DESC';

  const transactions = db.prepare(sql).all(...params);
  return NextResponse.json({ success: true, transactions });
}

