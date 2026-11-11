import { NextRequest, NextResponse } from 'next/server';
import { db, hashPassword } from '@/lib/db';
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

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!targetUser) return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan.' }, { status: 404 });

  try {
    const body = await req.json();
    const { fullName, role, status, password } = body || {};

    if (!fullName || !fullName.trim()) return NextResponse.json({ success: false, error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    if (!['admin', 'kasir'].includes(role)) return NextResponse.json({ success: false, error: 'Role tidak valid.' }, { status: 400 });

    if (session.userId === id && (status === 'inactive' || role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' }, { status: 400 });
    }

    if (password && password.trim()) {
      const hashRes = hashPassword(password.trim());
      db.prepare(`
        UPDATE users 
        SET full_name = ?, role = ?, status = ?, password_hash = ?, salt = ?
        WHERE id = ?
      `).run(fullName.trim(), role, status || 'active', hashRes.hash, hashRes.salt, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET full_name = ?, role = ?, status = ?
        WHERE id = ?
      `).run(fullName.trim(), role, status || 'active', id);
    }

    return NextResponse.json({ success: true, message: 'Data pengguna berhasil diperbarui.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
