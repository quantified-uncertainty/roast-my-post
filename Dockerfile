# Build stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies for native modules and enable corepack
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy all source files
COPY . .

# Install all dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Build all packages with dummy env vars for validation only
RUN NEXT_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=true \
    DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    AUTH_SECRET="build-time-dummy" \
    ANTHROPIC_API_KEY="build-time-dummy" \
    pnpm -r run build

# Deploy web app with dependencies
RUN pnpm deploy --filter=@roast/web --prod /prod/web

# Copy the built Next.js app (.next directory) that pnpm deploy doesn't include
RUN cp -r /usr/src/app/apps/web/.next /prod/web/.next

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@roast/db/generated/libquery_engine-linux-musl*.so.node

# Install runtime dependencies and enable corepack
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy deployed web app (includes built app and pruned dependencies)
COPY --from=builder --chown=nextjs:nodejs /prod/web ./

# Create Prisma client directory and symlink to the engine files from @roast/db
RUN mkdir -p .prisma/client generated && \
    ENGINE_FILE=$(ls /app/node_modules/@roast/db/generated/libquery_engine-linux-musl*.so.node | head -1) && \
    ln -sf "$ENGINE_FILE" .prisma/client/ && \
    ln -sf "$ENGINE_FILE" generated/

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["pnpm", "start"]