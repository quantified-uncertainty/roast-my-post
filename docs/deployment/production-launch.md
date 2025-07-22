# Production Launch Guide

## Overview
This guide covers the steps needed to deploy RoastMyPost to production.

## Prerequisites
- PostgreSQL 11+ database
- Node.js 18+ runtime
- Environment variables configured
- SSL certificates (for HTTPS)
- Domain name configured

## Environment Setup

### 1. Environment Variables
Create a `.env.production` file with:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="[generate with: openssl rand -base64 32]"

# API Keys
ANTHROPIC_API_KEY="your-api-key"
OPENAI_API_KEY="your-api-key"

# Optional: Error tracking, analytics, etc.
SENTRY_DSN="your-sentry-dsn"
```

### 2. Database Setup

#### Initial Setup
```bash
# Create production database
createdb -U postgres roast_my_post_prod

# Apply migrations
NODE_ENV=production npx prisma migrate deploy

# Verify migration status
NODE_ENV=production npx prisma migrate status
```

#### Database Indexes
After initial deployment, apply search optimization indexes:

```bash
# 1. Backup production database
pg_dump -U postgres roast_my_post_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply indexes (during low traffic)
psql -U postgres -d roast_my_post_prod < prisma/migrations/20240125_add_search_indexes/migration.sql

# Monitor progress
watch -n 5 "psql -U postgres -d roast_my_post_prod -c \"SELECT query_start, state, query FROM pg_stat_activity WHERE query LIKE 'CREATE INDEX%';\""
```

### 3. Build Process

```bash
# Install dependencies
npm ci --production

# Build Next.js application
npm run build

# Generate Prisma client
npx prisma generate

# Run type checking
npm run typecheck
```

## Deployment Options

### Option 1: Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
```

### Option 3: Traditional VPS

```bash
# Clone repository
git clone https://github.com/your-org/roast-my-post.git
cd roast-my-post

# Install dependencies
npm ci --production

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "roast-my-post" -- start
pm2 save
pm2 startup
```

## Security Checklist

- [ ] Environment variables are properly secured
- [ ] Database uses SSL connections
- [ ] API routes have authentication
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Content Security Policy headers set
- [ ] Database connection pool limits set
- [ ] Error messages don't leak sensitive info

## Health Checks

### 1. Application Health
```bash
# Check application is running
curl https://yourdomain.com/api/health

# Check database connection
curl https://yourdomain.com/api/health/db
```

### 2. Database Health
```sql
-- Check connection count
SELECT COUNT(*) FROM pg_stat_activity;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Monitoring Setup

### 1. Application Monitoring
- Set up error tracking (Sentry, Rollbar)
- Configure uptime monitoring (UptimeRobot, Pingdom)
- Set up performance monitoring (New Relic, DataDog)

### 2. Database Monitoring
- Enable pg_stat_statements
- Set up slow query logging
- Monitor connection pool usage
- Track index performance

### 3. Alerts
Configure alerts for:
- Application errors > threshold
- Database connection failures
- API response time > 2s
- Disk usage > 80%
- Memory usage > 90%

## Backup Strategy

### 1. Database Backups
```bash
# Daily backup cron job
0 2 * * * pg_dump -U postgres roast_my_post_prod | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days of backups
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

### 2. File Storage
If storing uploaded files:
- Use object storage (S3, GCS)
- Enable versioning
- Set up lifecycle policies

## Scaling Considerations

### 1. Database
- Connection pooling with PgBouncer
- Read replicas for heavy read loads
- Partitioning for large tables

### 2. Application
- Horizontal scaling with load balancer
- Redis for session storage
- CDN for static assets

### 3. Background Jobs
- Separate worker processes
- Queue system (Bull, BullMQ)
- Job monitoring dashboard

## Rollback Plan

### 1. Code Rollback
```bash
# Tag releases
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Rollback to previous version
git checkout v0.9.0
npm ci
npm run build
pm2 restart roast-my-post
```

### 2. Database Rollback
```bash
# Always backup before migrations
pg_dump -U postgres roast_my_post_prod > pre_migration_backup.sql

# Rollback
psql -U postgres roast_my_post_prod < pre_migration_backup.sql
```

## Post-Launch Tasks

1. **Performance Testing**
   - Load test with k6 or Apache Bench
   - Monitor response times
   - Identify bottlenecks

2. **Security Audit**
   - Run security headers test
   - Check for exposed secrets
   - Test authentication flows

3. **SEO Setup**
   - Submit sitemap
   - Configure robots.txt
   - Set up analytics

4. **Legal Compliance**
   - Privacy policy
   - Terms of service
   - Cookie consent
   - GDPR compliance

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify SSL settings
   - Check connection limits

2. **Build Failures**
   - Clear .next and node_modules
   - Check Node.js version
   - Verify all env vars set

3. **Performance Issues**
   - Check database indexes
   - Monitor memory usage
   - Review API response times

## Support Contacts

- Technical issues: tech@yourcompany.com
- Security issues: security@yourcompany.com
- On-call rotation: [PagerDuty link]