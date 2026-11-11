import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let dateFilter = "payment_status != 'cancelled'";
  const params: any[] = [];

  if (period === 'today') {
    dateFilter += " AND date(created_at) = date('now', 'localtime')";
  } else if (period === 'yesterday') {
    dateFilter += " AND date(created_at) = date('now', '-1 day', 'localtime')";
  } else if (period === '7days') {
    dateFilter += " AND created_at >= datetime('now', '-7 days', 'localtime')";
  } else if (period === 'this_month') {
    dateFilter += " AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')";
  } else if (startDate && endDate) {
    dateFilter += ' AND date(created_at) >= ? AND date(created_at) <= ?';
    params.push(startDate, endDate);
  }

  const summary = (db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) AS total_revenue,
      COUNT(id) AS total_transactions,
      COALESCE(AVG(total_amount), 0) AS average_order_value
    FROM transactions
    WHERE ${dateFilter}
  `).get(...params) as any) || { total_revenue: 0, total_transactions: 0, average_order_value: 0 };

  const itemsSold = (db.prepare(`
    SELECT COALESCE(SUM(td.quantity), 0) AS total_items
    FROM transaction_details td
    INNER JOIN transactions t ON td.transaction_id = t.id
    WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
  `).get(...params) as any) || { total_items: 0 };

  const dailyTrend = db.prepare(`
    SELECT 
      strftime('%Y-%m-%d', created_at) AS date,
      COUNT(id) AS transaction_count,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM transactions
    WHERE ${dateFilter}
    GROUP BY date
    ORDER BY date ASC
  `).all(...params);

  const topProducts = db.prepare(`
    SELECT 
      td.product_name,
      COALESCE(td.category_name, 'Kategori') AS category_name,
      SUM(td.quantity) AS total_quantity,
      SUM(td.subtotal) AS total_revenue
    FROM transaction_details td
    INNER JOIN transactions t ON td.transaction_id = t.id
    WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
    GROUP BY td.product_name
    ORDER BY total_quantity DESC
    LIMIT 10
  `).all(...params);

  const categoryBreakdown = db.prepare(`
    SELECT 
      COALESCE(td.category_name, 'Lainnya') AS category_name,
      SUM(td.quantity) AS total_quantity,
      SUM(td.subtotal) AS total_revenue
    FROM transaction_details td
    INNER JOIN transactions t ON td.transaction_id = t.id
    WHERE ${dateFilter.replace(/created_at/g, 't.created_at').replace(/payment_status/g, 't.payment_status')}
    GROUP BY td.category_name
    ORDER BY total_revenue DESC
  `).all(...params);

  return NextResponse.json({
    success: true,
    report: {
      period: period || 'custom',
      summary: {
        totalRevenue: summary.total_revenue,
        totalTransactions: summary.total_transactions,
        averageOrderValue: Math.round(summary.average_order_value),
        totalItemsSold: itemsSold.total_items
      },
      dailyTrend,
      topProducts,
      categoryBreakdown
    }
  });
}

