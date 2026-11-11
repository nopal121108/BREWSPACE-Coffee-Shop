import { NextRequest, NextResponse } from 'next/server';
import { db, hashPassword } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const users = db.prepare(`
    SELECT id, username, full_name, role, status, created_at
    FROM users
    ORDER BY role ASC, full_name ASC
  `).all();

  return NextResponse.json({ success: true, users });
}

export async function POST(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, fullName, password, role, status } = body || {};

    if (!username || !username.trim()) return NextResponse.json({ success: false, error: 'Username wajib diisi.' }, { status: 400 });
    if (!fullName || !fullName.trim()) return NextResponse.json({ success: false, error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    if (!password || password.length < 5) return NextResponse.json({ success: false, error: 'Password minimal 5 karakter.' }, { status: 400 });
    if (!['admin', 'kasir'].includes(role)) return NextResponse.json({ success: false, error: 'Role harus Admin atau Kasir.' }, { status: 400 });

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) return NextResponse.json({ success: false, error: 'Username sudah digunakan.' }, { status: 400 });

    const hashRes = hashPassword(password);
    const resUser = db.prepare(`
      INSERT INTO users (username, password_hash, salt, full_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username.trim(), hashRes.hash, hashRes.salt, fullName.trim(), role, status || 'active');

    return NextResponse.json({
      success: true,
      message: 'Pengguna baru berhasil ditambahkan.',
      user: { id: Number(resUser.lastInsertRowid), username: username.trim(), fullName: fullName.trim(), role, status: status || 'active' }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

