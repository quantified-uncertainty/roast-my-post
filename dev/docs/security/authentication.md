# Authentication & Security Guide

## Overview

The roast-my-post system implements a hybrid authentication approach supporting both session-based authentication (NextAuth.js) and API key authentication for programmatic access.

## Authentication Systems

### 1. NextAuth.js Session Authentication

#### Configuration
Session authentication is configured in `/lib/auth.ts` and uses:
- **Provider**: Email-based authentication with Resend
- **Session Strategy**: Database sessions with Prisma adapter
- **CSRF Protection**: Built-in NextAuth.js CSRF protection
- **Session Expiry**: Configurable session timeout

#### Usage in Server Components
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/api/auth/signin');
  }
  
  // Access user data: session.user
}
```

#### Usage in Client Components
```typescript
"use client"
import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <Loading />;
  if (status === "unauthenticated") return <SignIn />;
  
  // Use session.user
}
```

### 2. API Key Authentication

#### Key Generation
API keys are generated using cryptographically secure methods:

```typescript
// From /lib/crypto.ts
import crypto from 'crypto';

export function generateApiKey(): string {
  return 'rmp_' + crypto.randomBytes(32).toString('hex');
}

export async function hashApiKey(key: string): Promise<string> {
  return await bcrypt.hash(key, 12);
}
```

#### Key Storage
- **Format**: `rmp_` + 64 hexadecimal characters
- **Storage**: Hashed using bcrypt with salt rounds of 12
- **Expiration**: Optional expiration dates supported
- **Revocation**: Keys can be disabled without deletion

#### API Key Usage
```typescript
// Client request
const response = await fetch('/api/agents', {
  headers: {
    'X-API-Key': 'rmp_your_api_key_here',
    'Content-Type': 'application/json'
  }
});
```

### 3. Hybrid Authentication Helper

The system provides a unified authentication helper in `/lib/auth-helpers.ts`:

```typescript
import { authenticateRequest } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Proceed with authenticated request
}
```

#### Authentication Priority
1. **API Key First**: Checks for `X-API-Key` header
2. **Session Fallback**: Falls back to NextAuth.js session
3. **Unified Response**: Returns consistent user ID or null

## Authorization Patterns

### Role-Based Access Control

#### User Roles
```typescript
enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}
```

#### Admin Route Protection
```typescript
// /app/monitor/layout.tsx - Server-side protection
import { isAdmin } from '@/lib/auth';

export default async function MonitorLayout({ children }) {
  if (!(await isAdmin())) {
    return <div>Access denied. Admin privileges required.</div>;
  }
  
  return <>{children}</>;
}
```

#### API Route Authorization
```typescript
import { authenticateRequest, isAdminUser } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) return unauthorized();
  
  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return forbidden();
  
  // Admin-only functionality
}
```

### Resource Ownership Verification

```typescript
// Verify user owns the resource before allowing access
export async function PUT(request: Request, { params }: { params: { docId: string } }) {
  const userId = await authenticateRequest(request);
  if (!userId) return unauthorized();
  
  const document = await prisma.document.findUnique({
    where: { id: params.docId },
    select: { userId: true }
  });
  
  if (!document || document.userId !== userId) {
    return forbidden();
  }
  
  // User owns this document, proceed
}
```

## Security Headers

### Next.js Configuration
Security headers are configured in `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

### Content Security Policy
Implement CSP headers to prevent XSS attacks:

```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}
```

## Input Validation

### Zod Schema Validation
All user inputs are validated using Zod schemas:

```typescript
import { z } from 'zod';

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100000),
  metadata: z.record(z.unknown()).optional()
});

export async function POST(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) return unauthorized();

  const body = await request.json();
  const validated = CreateDocumentSchema.safeParse(body);

  if (!validated.success) {
    return badRequest('Invalid input', validated.error.errors);
  }

  // Use validated.data
}
```

### File Upload Security
```typescript
const ALLOWED_MIME_TYPES = ['text/plain', 'text/markdown', 'application/json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFileUpload(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
}
```

## Secrets Management

### Environment Variables
All sensitive configuration is stored in environment variables:

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="random-32-character-string"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
```

### Security Best Practices
1. **Never commit secrets** to the repository
2. **Use different keys** for development/staging/production
3. **Rotate keys regularly** (quarterly recommended)
4. **Monitor for exposed keys** using tools like git-secrets
5. **Use minimum permissions** for service accounts

### Key Rotation Process
1. Generate new key in service provider
2. Update environment variables in deployment
3. Test functionality with new key
4. Revoke old key after verification
5. Update any hardcoded references

## Rate Limiting

### Basic Rate Limiter
```typescript
// /lib/rate-limiter.ts
const attempts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, limit: number = 100, window: number = 60000): boolean {
  const now = Date.now();
  const userAttempts = attempts.get(identifier);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    attempts.set(identifier, { count: 1, resetTime: now + window });
    return true;
  }
  
  if (userAttempts.count >= limit) {
    return false;
  }
  
  userAttempts.count++;
  return true;
}
```

### Usage in API Routes
```typescript
export async function POST(request: Request) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!rateLimit(clientIP, 50, 60000)) { // 50 requests per minute
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // Process request
}
```

## Security Monitoring

### Error Tracking
```typescript
import { logger } from '@/lib/logger';

// Log security events
logger.warn('Failed authentication attempt', {
  ip: clientIP,
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString()
});
```

### Audit Logging
```typescript
// Log sensitive operations
logger.info('Admin action performed', {
  userId: session.user.id,
  action: 'delete_document',
  resourceId: documentId,
  ip: clientIP
});
```

## Common Security Vulnerabilities & Prevention

### 1. SQL Injection
**Prevention**: Use Prisma ORM with parameterized queries
```typescript
// Safe - Prisma handles parameterization
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

// Never use raw SQL with user input
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userEmail}`; // DANGEROUS
```

### 2. Cross-Site Scripting (XSS)
**Prevention**: Sanitize output and use CSP headers
```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML content
const sanitizedHTML = DOMPurify.sanitize(userContent);
```

### 3. Cross-Site Request Forgery (CSRF)
**Prevention**: Use NextAuth.js built-in CSRF protection
```typescript
// CSRF tokens are automatically handled by NextAuth.js
// Ensure all state-changing operations require authentication
```

### 4. Unauthorized Access
**Prevention**: Implement proper authentication checks
```typescript
// Always check authentication first
const userId = await authenticateRequest(request);
if (!userId) return unauthorized();

// Then check authorization
if (!await userCanAccessResource(userId, resourceId)) {
  return forbidden();
}
```

## Incident Response

### Security Incident Checklist
1. **Immediate Response**
   - Disable compromised accounts/keys
   - Review access logs
   - Assess scope of breach

2. **Investigation**
   - Identify attack vector
   - Determine data exposure
   - Document timeline

3. **Remediation**
   - Patch vulnerabilities
   - Rotate affected credentials
   - Notify affected users

4. **Prevention**
   - Update security procedures
   - Implement additional monitoring
   - Train team on new threats

### Emergency Contacts
- **Database Admin**: For database security issues
- **Infrastructure Team**: For server/network security
- **Legal/Compliance**: For data breach notification requirements

## Security Checklist

### Development
- [ ] All API routes have authentication checks
- [ ] Input validation using Zod schemas
- [ ] No secrets in code repository
- [ ] Security headers configured
- [ ] Rate limiting implemented

### Deployment
- [ ] HTTPS enforced in production
- [ ] Environment variables secured
- [ ] Database connections encrypted
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured

### Ongoing
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Key rotation schedule
- [ ] Incident response plan updated
- [ ] Team security training