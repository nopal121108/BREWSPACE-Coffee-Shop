import { NextRequest, NextResponse } from 'next/server';
import {
  getAllOrders,
  getCustomerOrders,
  createOrder,
  MOCK_PRODUCTS,
  MOCK_CATEGORIES
} from '@/lib/orders-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const catalog = searchParams.get('catalog');

    // If requested for menu catalog
    if (catalog === 'true') {
      return NextResponse.json({
        success: true,
        products: MOCK_PRODUCTS,
        categories: MOCK_CATEGORIES
      });
    }

    // If customer-specific orders requested
    if (customerId) {
      const customerOrders = getCustomerOrders(customerId);
      return NextResponse.json({
        success: true,
        orders: customerOrders
      });
    }

    // Cashier/Admin full order list
    const allOrders = getAllOrders();
    return NextResponse.json({
      success: true,
      orders: allOrders
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat pesanan.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, customerName, tableNumber, notes, items } = body || {};

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama pelanggan wajib diisi.' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keranjang belanja tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // Calculate subtotal and verified items
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemSubtotal = price * qty;
      subtotal += itemSubtotal;

      return {
        productId: item.productId || item.id,
        name: item.name,
        categoryName: item.categoryName || item.category_name,
        price,
        quantity: qty,
        subtotal: itemSubtotal,
        notes: item.notes || ''
      };
    });

    const tax = 0;
    const totalAmount = subtotal + tax;

    const newOrder = createOrder({
      customerId: customerId || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerName: customerName.trim(),
      tableNumber: tableNumber ? tableNumber.trim() : 'Meja Umum',
      notes: notes ? notes.trim() : '',
      items: orderItems,
      subtotal,
      tax,
      totalAmount
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Pesanan Anda berhasil diajukan! Menunggu konfirmasi kasir.',
        order: newOrder
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat mengajukan pesanan.' },
      { status: 500 }
    );
  }
}

