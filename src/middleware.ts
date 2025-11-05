import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Security headers for all responses
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Allow geolocation and camera for wellwisher routes, otherwise restrict
  if (pathname.startsWith('/wellwisher') || pathname.startsWith('/api/wellwisher')) {
    response.headers.set(
      'Permissions-Policy',
      'camera=(self), microphone=(), geolocation=(self), interest-cohort=()'
    );
  } else {
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
  }
  // More permissive CSP for development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: https: http: blob:; font-src 'self' data: https: http:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https: http:; frame-ancestors 'none';"
    );
  } else {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: https://api.razorpay.com https://checkout.razorpay.com; frame-src 'self' https://checkout.razorpay.com; frame-ancestors 'none';"
    );
  }
  
  // Protect admin routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = await auth();
    
    if (!session?.user) {
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }
    
    // Check if user is admin
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
      const url = new URL('/', request.url);
      return NextResponse.redirect(url);
    }
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = await auth();
    
    if (!session?.user) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    
    const userType = (session.user as { userType?: string }).userType;
    const userRole = (session.user as { role?: string }).role;
    
    // Redirect to appropriate dashboard based on user type
    if (pathname.startsWith('/dashboard/individual') && userType !== 'individual') {
      if (userType === 'company') {
        const url = new URL('/dashboard/company/trees', request.url);
        return NextResponse.redirect(url);
      } else if (userRole === 'admin') {
        const url = new URL('/admin', request.url);
        return NextResponse.redirect(url);
      } else {
        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
      }
    }
    
    if (pathname.startsWith('/dashboard/company') && userType !== 'company') {
      if (userType === 'individual') {
        const url = new URL('/dashboard/individual/trees', request.url);
        return NextResponse.redirect(url);
      } else if (userRole === 'admin') {
        const url = new URL('/admin', request.url);
        return NextResponse.redirect(url);
      } else {
        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users away from login/register pages
  if (pathname === '/login' || pathname === '/register') {
    const session = await auth();
    
    if (session?.user) {
      const userType = (session.user as { userType?: string }).userType;
      const userRole = (session.user as { role?: string }).role;
      
      if (userRole === 'admin') {
        const url = new URL('/admin', request.url);
        return NextResponse.redirect(url);
      } else if (userType === 'individual') {
        const url = new URL('/dashboard/individual/trees', request.url);
        return NextResponse.redirect(url);
      } else if (userType === 'company') {
        const url = new URL('/dashboard/company/trees', request.url);
        return NextResponse.redirect(url);
      }
    }
  }
  
  // Protect API admin routes
  if (pathname.startsWith('/api/admin')) {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session?.user || userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
  }
  
  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};

