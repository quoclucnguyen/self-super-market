import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const proxy = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  
  // Allow access to login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Only protect admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('admin_session');
  
  if (!sessionCookie || sessionCookie.value !== 'authenticated') {
    // Redirect to login page
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: '/admin/:path*',
};
