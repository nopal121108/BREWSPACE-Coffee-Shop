import { NextRequest, NextResponse } from 'next/server';
import { extractSession, destroySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('brewspace_token')?.value;
  destroySession(token);

  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' });
  response.cookies.delete('brewspace_token');
  return response;
}

