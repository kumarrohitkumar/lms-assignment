import { type NextRequest, NextResponse } from 'next/server';
import { canAccessPath, homePathFor } from '@/lib/rbac';
import type { Role } from '@/lib/types';

const AUTH_COOKIE = 'lms_token';
const PUBLIC_PATHS = ['/login', '/register'];

/**
 * Reads the role from the JWT to route the user. This is a UX guard only: the signature is checked by
 * the API on every request, which answers 401/403 regardless of what the browser shows.
 */
function sessionFrom(req: NextRequest): { role: Role } | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.exp === 'number' && json.exp * 1000 < Date.now()) return null;
    return typeof json.role === 'string' ? { role: json.role as Role } : null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = sessionFrom(req);
  const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url));

  if (PUBLIC_PATHS.includes(pathname)) {
    return session ? redirect(homePathFor(session.role)) : NextResponse.next();
  }
  if (!session) {
    const login = new URL('/login', req.url);
    if (pathname !== '/') login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  if (pathname === '/' || pathname === '/dashboard' || !canAccessPath(session.role, pathname)) {
    return redirect(homePathFor(session.role));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/apply/:path*', '/dashboard/:path*'],
};
