import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { db } from './db';

export interface SessionData {
  userId: number;
  username: string;
  role: 'admin' | 'kasir';
  fullName: string;
  expiresAt: number;
}

// In-memory session store (or fallback check in DB)
declare global {
  // eslint-disable-next-line no-var
  var __brewspace_sessions: Map<string, SessionData> | undefined;
}

if (!global.__brewspace_sessions) {
  global.__brewspace_sessions = new Map<string, SessionData>();
}

const sessions = global.__brewspace_sessions;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(user: { id: number; username: string; role: 'admin' | 'kasir'; full_name: string }) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData: SessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  sessions.set(token, sessionData);
  return token;
}

export function getSessionFromToken(token?: string | null): SessionData | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token?: string | null) {
  if (token) {
    sessions.delete(token);
  }
}

export function extractSession(req: NextRequest): SessionData | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = getSessionFromToken(token);
    if (session) return session;
  }

  // 2. Custom header
  const customToken = req.headers.get('x-auth-token');
  if (customToken) {
    const session = getSessionFromToken(customToken);
    if (session) return session;
  }

  // 3. Cookie
  const cookieToken = req.cookies.get('brewspace_token')?.value;
  if (cookieToken) {
    const session = getSessionFromToken(cookieToken);
    if (session) return session;
  }

  return null;
}

