import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const stocks = db.prepare(`
    SELECT 
      p.id, p.name, p.price, p.stock, p.min_stock, p.status, p.image_url,
      c.name AS category_name,
      CASE 
        WHEN p.stock <= 0 THEN 'out_of_stock'
        WHEN p.stock <= p.min_stock THEN 'low_stock'
        ELSE 'in_stock'
      END AS stock_status
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY 
      CASE WHEN p.stock <= p.min_stock THEN 0 ELSE 1 END,
      p.stock ASC
  `).all();

  return NextResponse.json({ success: true, stocks });
}

