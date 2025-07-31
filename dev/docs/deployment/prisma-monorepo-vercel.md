# Prisma Monorepo Deployment on Vercel: Lessons Learned

## Executive Summary

Successfully deploying Prisma in a monorepo to Vercel requires explicit webpack configuration to copy engine binaries. The recommended approach uses `copy-webpack-plugin` to ensure Prisma engines are available where Vercel expects them, while maintaining a single centralized Prisma client.

## The Problem

When deploying a Next.js monorepo with Prisma to Vercel, you'll encounter this error:

```
Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```

This happens because:
1. Vercel aggressively optimizes serverless deployments
2. Prisma engines (.node files) aren't automatically copied from shared packages
3. The runtime looks for engines in specific locations that don't exist

### Failed Search Paths
```
/var/task/apps/web/generated
/var/task/apps/web/.next/server
/vercel/path0/internal-packages/db/generated  ← Should work but doesn't
/var/task/apps/web/.prisma/client
/tmp/prisma-engines
```

## Solutions Tested

### ❌ Failed Approaches

1. **Single client with no configuration**
   - Result: Engine not found errors
   - Issue: Vercel doesn't copy engines from shared packages

2. **`serverExternalPackages` only**
   ```js
   serverExternalPackages: ['@prisma/client', '@prisma/engines']
   ```
   - Result: Engine not found errors  
   - Issue: Marks packages as external but doesn't copy engines

3. **Prisma plugin alone**
   ```js
   new PrismaPlugin()
   ```
   - Result: Engine not found errors
   - Issue: Plugin handles resolution but not engine copying

### ✅ Working Solutions

1. **Dual Client Generation (Anti-Pattern)**
   ```prisma
   generator client {
     output = "../generated"
   }
   
   generator webClient {
     output = "../../../apps/web/generated"
   }
   ```
   - Works but creates maintenance burden
   - Can cause version conflicts
   - Not recommended

2. **Explicit Webpack Engine Copying (Recommended)**
   ```js
   const CopyPlugin = require('copy-webpack-plugin');
   
   new CopyPlugin({
     patterns: [{
       from: path.join(__dirname, '../../internal-packages/db/generated/*.node'),
       to: 'generated/[name][ext]',
       noErrorOnMissing: true,
     }],
   })
   ```
   - Maintains single client pattern
   - Explicitly controls engine placement
   - Clean and maintainable

## Recommended Configuration

### 1. Install Dependencies
```bash
pnpm add -D @prisma/nextjs-monorepo-workaround-plugin copy-webpack-plugin
```

### 2. Configure next.config.js
```js
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

module.exports = {
  // Enable monorepo file tracing
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  
  // Mark Prisma packages as external (Next.js 15: serverExternalPackages)
  serverExternalPackages: ['@prisma/client', '@prisma/engines', '@roast/db'],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 1. Handle client resolution
      config.plugins.push(new PrismaPlugin());
      
      // 2. Copy engine binaries
      const CopyPlugin = require('copy-webpack-plugin');
      config.plugins.push(
        new CopyPlugin({
          patterns: [{
            from: path.join(__dirname, '../../internal-packages/db/generated/*.node'),
            to: 'generated/[name][ext]',
            noErrorOnMissing: true,
          }],
        })
      );
    }
    return config;
  },
};
```

### 3. Prisma Schema Configuration
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../generated"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "rhel-openssl-3.0.x"]
}
```

### 4. Build-Time Environment Validation
```typescript
// lib/build-validation.ts
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'AUTH_SECRET', 'ANTHROPIC_API_KEY'];

export function validateBuildEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
}
```

## Key Insights

1. **Vercel's bundling is aggressive** - It won't automatically include binaries from workspace packages
2. **Multiple solutions needed** - Both PrismaPlugin (resolution) and CopyPlugin (binaries) are required
3. **Dual generation works but is an anti-pattern** - Creates maintenance burden and potential conflicts
4. **Modern Next.js features aren't enough** - `serverExternalPackages` alone doesn't solve the binary copying issue
5. **Explicit is better than implicit** - Directly copying engines with webpack is more reliable than relying on automatic detection

## Troubleshooting

### Still getting engine errors?
1. Verify engines exist: `ls internal-packages/db/generated/*.node`
2. Check build output includes copy step
3. Ensure `binaryTargets` includes `rhel-openssl-3.0.x`

### Environment variable issues?
1. Add to Vercel dashboard (not just .env files)
2. Use build-time validation to catch early
3. Check for `AUTH_SECRET` vs `NEXTAUTH_SECRET` naming

### Performance concerns?
1. Consider Prisma Accelerate for connection pooling
2. Use `prisma.$disconnect()` in serverless functions
3. Monitor cold starts with engine loading

## References

- [Prisma Next.js Monorepo Documentation](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-monorepo)
- [Vercel Deployment Guide](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel)
- [Next.js 15 serverExternalPackages](https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages)