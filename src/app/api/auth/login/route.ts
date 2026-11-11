import { NextRequest, NextResponse } from 'next/server';
import { db, verifyPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as any;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Username atau password salah.' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Akun Anda telah dinonaktifkan. Hubungi Admin.' }, { status: 403 });
    }

    const valid = verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Username atau password salah.' }, { status: 401 });
    }

    const token = createSession(user);
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });

    // Set secure HTTP-only cookie
    response.cookies.set('brewspace_token', token, {
      path: '/',
      maxAge: 86400,
      httpOnly: false,
      sameSite: 'lax'
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

