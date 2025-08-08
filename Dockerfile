# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY internal-packages/db/package.json ./internal-packages/db/
COPY internal-packages/ai/package.json ./internal-packages/ai/
COPY internal-packages/domain/package.json ./internal-packages/domain/

# Copy Prisma schema
COPY internal-packages/db/prisma ./internal-packages/db/prisma/

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/app/node_modules/.pnpm \
    --mount=type=cache,target=/app/.pnpm-store \
    pnpm install --frozen-lockfile

# Prisma client is generated automatically by postinstall hook during pnpm install

# Copy source code
COPY . .

# Build internal packages in dependency order
# Note: No need to reinstall after copying source - workspace references work from initial install

# Build packages with TypeScript compiler from installed packages
RUN npx -p typescript tsc --project internal-packages/db/tsconfig.json
RUN npx -p typescript tsc --project internal-packages/domain/tsconfig.json  
RUN npx -p typescript tsc --project internal-packages/ai/tsconfig.json

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
# Provide dummy values for build-time validation
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"  
ENV AUTH_SECRET="dummy-auth-secret-for-build"
ENV ANTHROPIC_API_KEY="dummy-anthropic-key-for-build"

# Build Next.js application
# The existing next.config.js already handles Docker builds gracefully
RUN pnpm --filter @roast/web run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy only the standalone build (includes necessary node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy Prisma engines from db package (critical for monorepo deployment)
COPY --from=builder --chown=nextjs:nodejs /app/internal-packages/db/generated/*.node ./apps/web/generated/

# Copy Prisma schema for reference (migrations handled separately)
COPY --from=builder --chown=nextjs:nodejs /app/internal-packages/db/prisma ./prisma

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["node", "server.js"]