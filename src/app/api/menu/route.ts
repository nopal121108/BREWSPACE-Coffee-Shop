import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/lib/orders-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch live products from database
    const products = db.prepare(`
      SELECT 
        p.id, p.name, p.price, p.stock, p.min_stock, p.image_url, p.description, p.status,
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND c.status = 'active'
      ORDER BY c.name ASC, p.name ASC
    `).all() as any[];

    // 2. Fetch live categories from database
    const categories = db.prepare(`
      SELECT id, name, slug, description 
      FROM categories 
      WHERE status = 'active' 
      ORDER BY name ASC
    `).all() as any[];

    // 3. Fallback to mock data if database is unseeded or empty
    if (products && products.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'database',
        products,
        categories: categories && categories.length > 0 ? categories : MOCK_CATEGORIES
      });
    }

    return NextResponse.json({
      success: true,
      source: 'mock',
      products: MOCK_PRODUCTS,
      categories: MOCK_CATEGORIES
    });
  } catch (error: any) {
    // Graceful fallback to mock data
    return NextResponse.json({
      success: true,
      source: 'fallback',
      products: MOCK_PRODUCTS,
      categories: MOCK_CATEGORIES
    });
  }
}

