import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { config as appConfig } from '@roast/domain';

// Known AI/scraper bot patterns to block
const BLOCKED_BOT_PATTERNS = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /Google-Extended/i,
  /CCBot/i,
  /anthropic-ai/i,
  /ClaudeBot/i,
  /Bytespider/i,
  /PetalBot/i,
  /FacebookBot/i,
  /Meta-ExternalAgent/i,
  /PerplexityBot/i,
  /Amazonbot/i,
  /Applebot-Extended/i,
  /cohere-ai/i,
  /Diffbot/i,
  /ImagesiftBot/i,
  /Omgili/i,
  /AhrefsBot/i,
  /SemrushBot/i,
  /DotBot/i,
  /MJ12bot/i,
  /BLEXBot/i,
  /DataForSeoBot/i,
];

// Production hostnames - bots are allowed on these (they can read robots.txt)
const PRODUCTION_HOSTS = [
  'roastmypost.org',
  'www.roastmypost.org',
];

function isBlockedBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BLOCKED_BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function isPreviewDeployment(host: string | null): boolean {
  if (!host) return false;
  return !PRODUCTION_HOSTS.includes(host);
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const host = request.headers.get('host');

  // Block known bots on preview deployments (they ignore robots.txt there)
  if (isPreviewDeployment(host) && isBlockedBot(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Generate a unique nonce for each request
  const nonce = Buffer.from(globalThis.crypto.randomUUID()).toString('base64');
  
  // Check if we're in development
  const isDev = appConfig.env.isDevelopment;
  
  // Skip CSP for API routes to avoid interfering with server-side requests
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // Clone the request headers and add the nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  
  // Create response with the modified request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  
  // Content Security Policy with nonce
  if (!isApiRoute) {
    const cspDirectives = [
      "default-src 'self'",
      // Use nonce for scripts with strict-dynamic for Next.js
      // strict-dynamic allows scripts loaded by trusted scripts
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://plausible.io ${isDev ? "'unsafe-eval'" : ""}`,
      // Style still needs unsafe-inline for Next.js styled-jsx and CSS modules
      `style-src 'self' 'unsafe-inline'`,
      "img-src 'self' data: https: blob:",
      "font-src 'self'",
      `connect-src 'self' https://plausible.io ${isDev ? "http://localhost:* ws://localhost:*" : ""}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];
    
    response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  }
  
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