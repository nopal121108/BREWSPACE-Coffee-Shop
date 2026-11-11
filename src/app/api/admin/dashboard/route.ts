import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const revenueStats = (db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_transactions
      FROM transactions
      WHERE payment_status != 'cancelled'
    `).get() as any) || { total_revenue: 0, total_transactions: 0 };

    const activeProductsCount = (db.prepare(`
      SELECT COUNT(id) AS count FROM products WHERE status = 'active'
    `).get() as any)?.count || 0;

    const activeCategoriesCount = (db.prepare(`
      SELECT COUNT(id) AS count FROM categories WHERE status = 'active'
    `).get() as any)?.count || 0;

    const lowStockProducts = db.prepare(`
      SELECT p.id, p.name, p.stock, p.min_stock, p.price, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `).all() || [];

    const recentTransactions = db.prepare(`
      SELECT t.id, t.invoice_number, t.cashier_name, t.total_amount, t.payment_method, t.payment_status, t.cancel_reason, t.created_at,
             COUNT(td.id) AS total_items
      FROM transactions t
      LEFT JOIN transaction_details td ON t.id = td.transaction_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `).all() || [];

    const salesChart7Days = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', created_at) AS date,
        COUNT(id) AS transaction_count,
        COALESCE(SUM(total_amount), 0) AS daily_revenue
      FROM transactions
      WHERE payment_status != 'cancelled' AND created_at >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all() || [];

    const topProducts = db.prepare(`
      SELECT 
        td.product_name,
        COALESCE(c.name, 'Umum') AS category_name,
        SUM(td.quantity) AS total_sold,
        SUM(td.subtotal) AS total_revenue
      FROM transaction_details td
      INNER JOIN transactions t ON td.transaction_id = t.id
      LEFT JOIN products p ON td.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE t.payment_status != 'cancelled'
      GROUP BY td.product_name
      ORDER BY total_sold DESC
      LIMIT 5
    `).all() || [];

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: revenueStats.total_revenue || 0,
        totalTransactions: revenueStats.total_transactions || 0,
        activeProducts: activeProductsCount,
        activeCategories: activeCategoriesCount,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentTransactions,
        salesChart7Days,
        topProducts
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
