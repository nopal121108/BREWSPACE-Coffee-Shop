import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get('product_id');

  let sql = `
    SELECT sm.*, p.name AS product_name, p.image_url, c.name AS category_name
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (product_id) {
    sql += ' AND sm.product_id = ?';
    params.push(product_id);
  }
  sql += ' ORDER BY sm.created_at DESC LIMIT 100';

  const history = db.prepare(sql).all(...params);
  return NextResponse.json({ success: true, history });
}

