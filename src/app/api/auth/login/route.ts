import { NextRequest, NextResponse } from 'next/server';
import { db, verifyPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    // Case-insensitive query to support Admin, admin, ADMIN, etc.
    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))').get(trimmedUsername) as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau kata sandi salah.' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Akun Anda dinonaktifkan. Hubungi Admin.' },
        { status: 403 }
      );
    }

    const valid = verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Username atau kata sandi salah.' },
        { status: 401 }
      );
    }

    const token = createSession(user);
    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.full_name}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });

    // Set secure HTTP-only cookie with 24 hours validity
    response.cookies.set('brewspace_token', token, {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat memproses login.' },
      { status: 500 }
    );
  }
}


