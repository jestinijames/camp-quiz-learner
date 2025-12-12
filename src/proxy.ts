/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyJwtEdge } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login'];
  
  // Skip middleware for API routes, static files, and public paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('auth-token')?.value;

  // If no token, redirect to login
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await verifyJwtEdge(authToken);

    // Admin paths that require admin authentication
    if (pathname.startsWith('/admin')) {
      if (!decoded.isAdmin) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // If admin tries to access home page, redirect to dashboard
    if (decoded.isAdmin && pathname === '/') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Clear invalid cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('auth-token', '', { 
      maxAge: 0,
      path: '/',
      httpOnly: true
    });
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};