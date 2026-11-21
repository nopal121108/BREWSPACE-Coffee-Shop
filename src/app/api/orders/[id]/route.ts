import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  updateOrderStatus,
  cancelCustomerOrder
} from '@/lib/orders-store';
import { extractSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = getOrderById(params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail pesanan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, customerId, rejectedReason, statusNotes } = body || {};

    const order = getOrderById(params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Customer cancellation
    if (action === 'cancel') {
      if (!customerId) {
        return NextResponse.json(
          { success: false, error: 'Identitas pemesan tidak valid.' },
          { status: 400 }
        );
      }

      const result = cancelCustomerOrder(params.id, customerId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Pesanan Anda telah berhasil dibatalkan.',
        order: result.order
      });
    }

    // Cashier / Admin operations
    const session = extractSession(req);
    const cashierName = session?.fullName || 'Kasir';

    let targetStatus: any = null;
    if (action === 'confirm') targetStatus = 'dikonfirmasi';
    else if (action === 'reject') targetStatus = 'ditolak';
    else if (action === 'prepare') targetStatus = 'sedang_disiapkan';
    else if (action === 'ready') targetStatus = 'siap_diambil';
    else if (action === 'complete') targetStatus = 'selesai';
    else {
      return NextResponse.json(
        { success: false, error: 'Aksi pesanan tidak valid.' },
        { status: 400 }
      );
    }

    const result = updateOrderStatus(params.id, targetStatus, {
      cashierName,
      rejectedReason,
      statusNotes
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Status pesanan ${order.orderNumber} berhasil diperbarui menjadi ${targetStatus}.`,
      order: result.order
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui status pesanan.' },
      { status: 500 }
    );
  }
}

