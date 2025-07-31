# Docker Production Deployment Notes for RoastMyPost

## Current Status

We have a working Docker image (2.92GB) that supports both web and worker modes. However, there are several improvements needed for production readiness.

## Critical Issues & Solutions

### 1. **Image Size (Currently 2.92GB vs Target <500MB)**

The main issue is that Next.js is trying to statically generate pages during build, which requires database access. This forces us to use a workaround that includes the full node_modules.

**Solutions:**
- Add `export const dynamic = 'force-dynamic'` to pages that use database queries (e.g., /docs/page.tsx, /jobs/page.tsx)
- Or set `SKIP_BUILD_STATIC_GENERATION=1` during build
- Use proper Next.js standalone build once static generation is disabled

### 2. **Security Improvements**

Based on best practices research:
- ✅ Already using Alpine Linux (smaller attack surface)
- ✅ Already running as non-root user (nextjs)
- ⚠️ Consider using distroless images for even better security
- ⚠️ Add proper SECRET scanning in CI/CD pipeline

### 3. **Optimized Dockerfile (Recommended)**

```dockerfile
# deps stage - cache dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Skip static generation during build
ENV SKIP_BUILD_STATIC_GENERATION=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# runner stage - minimal production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy only necessary files for standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

### 4. **Database Connection During Build**

Add to problematic pages:
```typescript
// At the top of pages/docs/page.tsx, pages/jobs/page.tsx, etc.
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### 5. **Production Deployment Considerations**

**High Performance Setup:**
- Serve static assets (public/, .next/static/) via CDN or nginx
- Use Redis for session storage
- Implement proper logging (stdout/stderr for container logs)
- Add APM/monitoring (e.g., OpenTelemetry)

**Environment Variables:**
```bash
# Required for production
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NODE_ENV=production

# Optional optimizations
NODE_OPTIONS="--max-old-space-size=512"
```

**Kubernetes Considerations:**
- Use separate deployments for web and worker
- Configure proper resource limits
- Add horizontal pod autoscaling for web servers
- Use init containers for database migrations

### 6. **Multi-Architecture Support**

For production, build for multiple architectures:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t roastmypost:latest .
```

### 7. **Health Checks & Readiness**

Current health check is good, but consider adding:
- Readiness probe that checks database connectivity
- Liveness probe at `/api/health`
- Startup probe with longer timeout for initial migrations

### 8. **Worker Process Improvements**

For the worker process, consider:
- Graceful shutdown handling (SIGTERM)
- Proper error handling and retry logic
- Dead letter queue for failed jobs
- Metrics collection (jobs processed, errors, etc.)

## Immediate Action Items

1. **Fix Static Generation**: Add `force-dynamic` to database-dependent pages
2. **Rebuild with Standalone**: Once static generation is fixed, rebuild for smaller image
3. **Add .dockerignore**: Ensure build context is minimal
4. **Security Scan**: Run Trivy or similar in CI/CD pipeline
5. **Document ENV vars**: Create comprehensive list of all required environment variables

## Testing Commands

```bash
# Build optimized image
docker build -t roastmypost:prod .

# Test web server
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  roastmypost:prod

# Test worker
docker run \
  -e DATABASE_URL="postgresql://..." \
  roastmypost:prod \
  npm run process-jobs-adaptive

# Test migrations
docker run \
  -e DATABASE_URL="postgresql://..." \
  roastmypost:prod \
  npm run db:deploy
```

## References

- [Next.js Standalone Mode](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Prisma in Production](https://www.prisma.io/docs/guides/deployment/deployment)