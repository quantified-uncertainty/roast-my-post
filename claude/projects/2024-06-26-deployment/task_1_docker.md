# Task 1: Create Dockerfile for RoastMyPost

## Objective

Create a production-ready Dockerfile that supports both the Next.js web application and background worker processes using a single image with different startup commands.

## Repository Context

**Repository:** `https://github.com/quantified-uncertainty/roast-my-post`

- Next.js application with TypeScript
- Uses Prisma for database operations
- Has MCP server functionality
- Requires background job processing
- Contains AI document analysis features

## Requirements Analysis

### Check Current Application Structure

```bash
# Examine the current setup
ls -la
cat package.json | jq '.scripts'
find . -name "prisma" -type d
find . -name "next.config.*"
ls -la src/
find . -name "*.env*"

# Look for existing Docker files
find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore"
```

### Analyze Dependencies and Build Process

```bash
# Check build requirements
npm run build --dry-run 2>&1 | head -20
grep -r "process.env" src/ --include="*.ts" --include="*.js" | head -10

# Check if standalone build is configured
grep -A5 -B5 "output.*standalone" next.config.*
```

## Implementation Requirements

### 1. Dockerfile Specifications

**Multi-stage build with these stages:**

- `deps`: Install dependencies including Prisma
- `builder`: Build the Next.js application
- `runner`: Production runtime image

**Key Requirements:**

- Use Node.js 20 Alpine for smaller image size
- Support Next.js standalone build for optimal performance
- Include Prisma CLI for database operations
- Non-root user for security
- Proper layer caching for faster rebuilds
- Health check capability

### 2. Architecture Support

**Single Image, Multiple Commands:**

- **Web Server**: `CMD ["node", "server.js"]` (default)
- **Worker Process**: Override with `["npm", "run", "process-jobs-adaptive"]`
- **Database Migrations**: `["npm", "run", "db:deploy"]`

### 3. Required Files to Include

**Essential for both web and worker:**

```
├── .next/standalone/     # Next.js standalone build
├── .next/static/         # Static assets
├── public/              # Public assets
├── prisma/              # Database schema and migrations
├── scripts/             # Worker and utility scripts
├── package.json         # NPM scripts
```

## Deliverables

### 1. Dockerfile

**File:** `Dockerfile`

Requirements:

- Multi-stage build optimized for production
- Alpine Linux base for security and size
- Proper dependency installation order
- Build-time optimizations
- Security best practices (non-root user)
- Support for both web server and worker modes

### 2. .dockerignore

**File:** `.dockerignore`

Exclude unnecessary files:

- `.git/`, `.github/`
- `node_modules/` (will be installed in container)
- Development files (`.env.local`, `*.log`)
- Documentation and README files
- Test files and coverage reports

### 3. Package.json Scripts

**Update:** `package.json`

Ensure required scripts exist:

```json
{
  "scripts": {
    "build": "next build",
    "start": "node server.js",
    "process-jobs-adaptive": "node scripts/process-jobs-adaptive.js",
    "db:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

### 4. Health Check Script (Optional)

**File:** `scripts/health-check.js`

Simple health check for Docker:

```javascript
// Basic health check that can be used by Docker
// Should exit 0 for healthy, 1 for unhealthy
```

## Technical Considerations

### Next.js Configuration

Ensure `next.config.js` has standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // ... other config
};
```

### Prisma Integration

- Include Prisma generate step in build
- Ensure schema.prisma is accessible
- Database URL will be provided at runtime

### Environment Variables

The Dockerfile should not include secrets, but should support:

- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- Runtime environment variables via K8s secrets

## Testing the Dockerfile

### Local Build Test

```bash
# Build the image
docker build -t roastmypost:test .

# Test web server mode
docker run -p 3000:3000 -e NODE_ENV=production roastmypost:test

# Test worker mode (will fail without DB, but should start)
docker run -e NODE_ENV=production roastmypost:test npm run process-jobs-adaptive
```

### Build Optimization Verification

```bash
# Check image size
docker images roastmypost:test

# Inspect layers
docker history roastmypost:test

# Check for security issues
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image roastmypost:test
```

## Success Criteria

- [ ] Dockerfile builds successfully without errors
- [ ] Image size is reasonable (<500MB)
- [ ] Web server starts and serves basic pages
- [ ] Worker command executes without import errors
- [ ] Prisma is available for database operations
- [ ] Health check responds appropriately
- [ ] No security vulnerabilities in base image
- [ ] Build process is efficient (good layer caching)

## Best Practices to Follow

1. **Security**: Use non-root user, minimal base image
2. **Performance**: Multi-stage build, standalone Next.js
3. **Maintainability**: Clear stage separation, good comments
4. **Debugging**: Include helpful tools without bloating
5. **Standards**: Follow Docker best practices for Node.js

## Notes

- This Dockerfile will be used later in Kubernetes deployments
- Keep it generic - environment-specific config comes from K8s
- Optimize for production use, not development convenience
- Consider build time vs. runtime trade-offs
- Document any assumptions about the application structure

This is a foundational task that enables all subsequent deployment work. Focus on creating a robust, secure, and efficient container image that supports the application's dual nature (web + worker).
