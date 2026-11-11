import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = db.prepare(`
      SELECT 
        p.id, p.name, p.price, p.stock, p.min_stock, p.image_url, p.description,
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND c.status = 'active'
      ORDER BY c.name ASC, p.name ASC
    `).all();

    const categories = db.prepare(`
      SELECT id, name, slug 
      FROM categories 
      WHERE status = 'active' 
      ORDER BY name ASC
    `).all();

    return NextResponse.json({ success: true, products, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

