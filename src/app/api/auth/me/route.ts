import { NextRequest, NextResponse } from 'next/server';
import { extractSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = db.prepare('SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?').get(session.userId) as any;
  if (!user || user.status !== 'active') {
    return NextResponse.json({ success: false, error: 'User invalid' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role
    }
  });
}

