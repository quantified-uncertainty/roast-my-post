# Build stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies for native modules and enable corepack
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable

# Copy all source files
COPY . .

# Install all dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Build all packages
RUN pnpm -r run build

# Deploy web app with dependencies
RUN pnpm deploy --filter=@roast/web --prod /prod/web

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies and enable corepack
RUN apk add --no-cache libc6-compat
RUN corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy deployed web app (includes built app and pruned dependencies)
COPY --from=builder --chown=nextjs:nodejs /prod/web ./

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application (pnpm deploy sets up the correct structure)
CMD ["pnpm", "start"]