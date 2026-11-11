import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const resolvedParams = await Promise.resolve(context.params);
  const id = parseInt(resolvedParams.id, 10);

  try {
    const body = await req.json();
    const { name, description, status } = body || {};

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    db.prepare(`
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, status = ?
      WHERE id = ?
    `).run(name.trim(), slug, description || null, status || 'active', id);

    return NextResponse.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
