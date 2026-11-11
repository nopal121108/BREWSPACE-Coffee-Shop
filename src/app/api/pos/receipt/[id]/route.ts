import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = extractSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(context.params);
  const id = resolvedParams.id;
  const isNum = /^\d+$/.test(id);

  const trx = isNum
    ? db.prepare('SELECT * FROM transactions WHERE id = ?').get(parseInt(id, 10)) as any
    : db.prepare('SELECT * FROM transactions WHERE invoice_number = ?').get(id) as any;

  if (!trx) {
    return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan.' }, { status: 404 });
  }

  const items = db.prepare('SELECT * FROM transaction_details WHERE transaction_id = ?').all(trx.id);
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settings: Record<string, string> = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  return NextResponse.json({
    success: true,
    receipt: {
      ...trx,
      items,
      settings
    }
  });
}
