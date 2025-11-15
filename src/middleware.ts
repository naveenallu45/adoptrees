import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CORS configuration
  const allowedOrigins = [
    'http://localhost:5173',
    'https://adoptrees.com',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[];

  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );

  // Handle CORS preflight requests for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Security headers for all responses
  const response = NextResponse.next();
  
  // Add CORS headers to API routes
  if (pathname.startsWith('/api/') && isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
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
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://api.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: https://api.razorpay.com https://checkout.razorpay.com; frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com; frame-ancestors 'none';"
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

  // Protect dashboard routes (but allow public access with publicId query param)
  if (pathname.startsWith('/dashboard')) {
    // Allow public access if publicId query parameter is present
    const publicId = request.nextUrl.searchParams.get('publicId');
    if (publicId) {
      // Public access allowed - let it through
      return response;
    }
    
    const session = await auth();
    
    if (!session?.user) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    
    const userType = (session.user as { userType?: string }).userType;
    const userRole = (session.user as { role?: string }).role;
    
    // Check role first (admin and wellwisher should be redirected to their pages)
    if (userRole === 'admin') {
      const url = new URL('/admin', request.url);
      return NextResponse.redirect(url);
    } else if (userRole === 'wellwisher') {
      const url = new URL('/wellwisher', request.url);
      return NextResponse.redirect(url);
    }
    
    // Redirect to appropriate dashboard based on user type
    if (pathname.startsWith('/dashboard/individual') && userType !== 'individual') {
      if (userType === 'company') {
        const url = new URL('/dashboard/company/trees', request.url);
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
      
      // Check role first (admin and wellwisher should be checked before userType)
      if (userRole === 'admin') {
        const url = new URL('/admin', request.url);
        return NextResponse.redirect(url);
      } else if (userRole === 'wellwisher') {
        const url = new URL('/wellwisher', request.url);
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

  // Prevent admin and wellwisher users from accessing user routes
  const userRoutes = ['/', '/individuals', '/companies', '/about', '/cart', '/u'];
  const isUserRoute = userRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Prevent admin and wellwisher users from accessing user API routes
  const userApiRoutes = ['/api/orders', '/api/payments', '/api/certificates', '/api/trees'];
  const isUserApiRoute = userApiRoutes.some(route => pathname.startsWith(route));

  if (isUserRoute || isUserApiRoute) {
    const session = await auth();
    
    if (session?.user) {
      const userRole = (session.user as { role?: string }).role;
      
      // Redirect admin users to admin dashboard
      if (userRole === 'admin') {
        if (isUserApiRoute) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized - Admin users cannot access user API routes' },
            { status: 403 }
          );
        }
        const url = new URL('/admin', request.url);
        return NextResponse.redirect(url);
      }
      
      // Redirect wellwisher users to wellwisher dashboard
      if (userRole === 'wellwisher') {
        if (isUserApiRoute) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized - Wellwisher users cannot access user API routes' },
            { status: 403 }
          );
        }
        const url = new URL('/wellwisher', request.url);
        return NextResponse.redirect(url);
      }
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

