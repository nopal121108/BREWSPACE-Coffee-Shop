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
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_SECRET = process.env.SESSION_SECRET || 'brewspace_coffee_pos_secret_jwt_key_2026';

export function signSessionToken(sessionData: SessionData): string {
  const json = JSON.stringify(sessionData);
  const b64 = Buffer.from(json, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

export function verifySessionToken(token: string): SessionData | null {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('hex');
  if (sig !== expectedSig) return null;
  try {
    const json = Buffer.from(b64, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    if (data.expiresAt && Date.now() > data.expiresAt) return null;
    return data as SessionData;
  } catch {
    return null;
  }
}

export function createSession(user: { id: number; username: string; role: 'admin' | 'kasir'; full_name: string }): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sessionData: SessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
    expiresAt
  };

  const token = signSessionToken(sessionData);

  // Cache in memory
  sessions.set(token, sessionData);

  // Persist in SQLite database to survive worker threads and hot-reloads
  try {
    db.prepare(`
      INSERT OR REPLACE INTO sessions (token, user_id, username, role, full_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(token, user.id, user.username, user.role, user.full_name, expiresAt);
  } catch (err) {
    console.error('Failed to persist session to database:', err);
  }

  return token;
}

export function getSessionFromToken(token?: string | null): SessionData | null {
  if (!token) return null;

  // 1. Verify token signature and timestamp
  const decoded = verifySessionToken(token);
  if (!decoded) {
    // Check legacy hex token in memory or DB
    const cached = sessions.get(token);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        sessions.delete(token);
        try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch (_) {}
        return null;
      }
      return cached;
    }
  }

  // 2. Check in-memory session cache
  const cached = sessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      sessions.delete(token);
      try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch (_) {}
      return null;
    }
    return cached;
  }

  // 3. Fallback to SQLite DB (also checks revocation on logout)
  try {
    const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any;
    if (!row) {
      // If signed token is valid but was deleted from DB, it means user logged out!
      return null;
    }

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    const sessionData: SessionData = {
      userId: row.user_id,
      username: row.username,
      role: row.role as 'admin' | 'kasir',
      fullName: row.full_name,
      expiresAt: row.expires_at
    };

    // Re-populate in-memory cache
    sessions.set(token, sessionData);
    return sessionData;
  } catch (err) {
    console.error('Failed to query session from database:', err);
    // If DB fails transiently, fall back to valid cryptographic token
    if (decoded && Date.now() <= decoded.expiresAt) {
      return decoded;
    }
    return null;
  }
}

export function destroySession(token?: string | null) {
  if (token) {
    sessions.delete(token);
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (_) {}
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


