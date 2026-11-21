import { NextRequest, NextResponse } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET || 'brewspace_coffee_pos_secret_jwt_key_2026';

// Verify signed HMAC token in Next.js Edge runtime
async function verifySessionEdge(token?: string | null) {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, enc.encode(b64));
    const hex = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hex !== sig) return null;

    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const json = atob(base64);
    const data = JSON.parse(json);
    if (data.expiresAt && Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API requests pass directly to API route handlers
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('brewspace_token')?.value;
  const session = await verifySessionEdge(token);

  const isLoginPage = pathname === '/';

  // Admin-only protected routes
  const adminRoutes = [
    '/dashboard',
    '/products',
    '/categories',
    '/inventory',
    '/stocks',
    '/mutations',
    '/reports',
    '/users',
    '/settings'
  ];

  // All authenticated routes (Admin + Kasir)
  const authenticatedRoutes = [
    ...adminRoutes,
    '/pos',
    '/orders',
    '/transactions',
    '/profile',
    '/products-info'
  ];

  const requiresAuth = authenticatedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  const requiresAdmin = adminRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // 1. If user is already logged in and visits the login page ('/')
  if (isLoginPage && session) {
    if (session.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/pos', req.url));
    }
  }

  // 2. If route requires authentication but user is not logged in
  if (requiresAuth && !session) {
    const loginUrl = new URL('/', req.url);
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid/expired cookie if any
    if (token) {
      response.cookies.set('brewspace_token', '', { path: '/', maxAge: 0 });
    }
    return response;
  }

  // 3. If route is Admin-only, but the logged-in user is a Kasir
  if (requiresAdmin && session && session.role !== 'admin') {
    // Redirect Kasir to POS directly
    return NextResponse.redirect(new URL('/pos', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'
  ]
};

