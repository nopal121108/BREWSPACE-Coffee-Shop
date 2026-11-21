// server/auth.js - Authentication & Session Management
const crypto = require('node:crypto');
const { db, verifyPassword } = require('./db');

// In-memory session store (mapped to user information)
const sessions = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
    expiresAt
  };
  sessions.set(token, sessionData);

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

function getSession(token) {
  if (!token) return null;
  const cached = sessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      sessions.delete(token);
      try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch (_) {}
      return null;
    }
    return cached;
  }

  // Fallback to SQLite DB
  try {
    const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (!row) return null;

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    const sessionData = {
      userId: row.user_id,
      username: row.username,
      role: row.role,
      fullName: row.full_name,
      expiresAt: row.expires_at
    };

    sessions.set(token, sessionData);
    return sessionData;
  } catch (err) {
    console.error('Failed to query session from database:', err);
    return null;
  }
}

function destroySession(token) {
  if (token) {
    sessions.delete(token);
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (_) {}
  }
}

// Extract auth token from request headers or cookies
function extractToken(req) {
  // Authorization header: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Custom header
  if (req.headers['x-auth-token']) {
    return req.headers['x-auth-token'];
  }
  // Cookie: token=<token>
  if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const cookie of cookies) {
      const [k, v] = cookie.trim().split('=');
      if (k === 'brewspace_token' || k === 'token') {
        return v;
      }
    }
  }
  return null;
}

// Authenticate request and enforce optional role
function requireAuth(role = null) {
  return (req, res) => {
    const token = extractToken(req);
    const session = getSession(token);

    if (!session) {
      sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Sesi login tidak valid atau telah berakhir. Silakan login kembali.'
      });
      return null;
    }

    if (role && session.role !== role) {
      sendJson(res, 403, {
        success: false,
        error: `Forbidden: Akses ditolak. Fitur ini hanya untuk role ${role.toUpperCase()}.`
      });
      return null;
    }

    return session;
  };
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token'
  });
  res.end(json);
}

module.exports = {
  createSession,
  getSession,
  destroySession,
  extractToken,
  requireAuth,
  sendJson
};
