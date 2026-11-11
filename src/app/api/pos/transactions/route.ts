import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  let sql = `
    SELECT t.*, COUNT(td.id) AS total_items
    FROM transactions t
    LEFT JOIN transaction_details td ON t.id = td.transaction_id
  `;
  const params: any[] = [];

  if (session.role === 'kasir') {
    sql += ' WHERE t.user_id = ?';
    params.push(session.userId);
  } else {
    sql += ' WHERE 1=1';
  }

  if (date) {
    sql += ' AND date(t.created_at) = ?';
    params.push(date);
  }

  sql += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50';

  const transactions = db.prepare(sql).all(...params);
  return NextResponse.json({ success: true, transactions });
}

