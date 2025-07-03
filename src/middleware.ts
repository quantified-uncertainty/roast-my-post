import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Check if we're in development
  const isDev = process.env.NODE_ENV === 'development';
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  
  // Content Security Policy - More restrictive for production
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' https://plausible.io ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Next.js
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://plausible.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Strict Transport Security (for HTTPS) - Extended max-age as per best practices
  if (request.nextUrl.protocol === 'https:' || !isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  return response;
}

export const config = {
  // Include all routes including API routes for comprehensive security
  matcher: '/(.*)',
};