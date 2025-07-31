# Monorepo Migration to Vercel: Quick Reference

## Pre-Migration Checklist

- [ ] Update Terraform configuration to point to monorepo structure
- [ ] Verify all environment variables in Vercel dashboard
- [ ] Check for `AUTH_SECRET` vs `NEXTAUTH_SECRET` naming
- [ ] Ensure `DATABASE_URL` is set in Vercel

## Critical Configuration Files

### 1. apps/web/next.config.js
```js
// Required imports
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

// Required configuration
outputFileTracingRoot: require('path').join(__dirname, '../../'),
serverExternalPackages: ['@prisma/client', '@prisma/engines', '@roast/db'],

// Required webpack plugins (both needed!)
webpack: (config, { isServer }) => {
  if (isServer) {
    config.plugins.push(new PrismaPlugin());
    config.plugins.push(new CopyPlugin({...}));
  }
}
```

### 2. turbo.json
```json
{
  "globalEnv": [
    "DATABASE_URL",
    "AUTH_SECRET",
    "ANTHROPIC_API_KEY"
    // ... other env vars
  ]
}
```

### 3. apps/web/vercel.json
```json
{
  "buildCommand": "npx turbo build",
  "framework": "nextjs",
  "ignoreCommand": "npx turbo-ignore"
}
```

## Common Issues & Solutions

### Issue: 404 NOT_FOUND on deployment
**Solution**: Update Terraform to use new monorepo paths

### Issue: AUTH_SECRET not found
**Solution**: 
- Add fallback: `const authSecret = AUTH_SECRET || NEXTAUTH_SECRET`
- Update env var in Vercel to `AUTH_SECRET` (NextAuth v5)

### Issue: Prisma engine not found
**Solution**: Add both PrismaPlugin AND CopyPlugin to webpack config

### Issue: DATABASE_URL not available during build
**Solution**: 
- Ensure it's in turbo.json globalEnv
- Add build-time validation
- Mark pages as `export const dynamic = 'force-dynamic'`

## Deployment Commands

```bash
# Regenerate Prisma client after schema changes
pnpm --filter @roast/db run gen

# Test build locally
pnpm --filter @roast/web run build

# Run type checking
pnpm --filter @roast/web run typecheck

# Deploy (automatic on push to branch)
git push
```

## Environment Variables

### Required in Vercel
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (not NEXTAUTH_SECRET)
- `ANTHROPIC_API_KEY` - For AI features

### Optional but Recommended
- `AUTH_RESEND_KEY` - Email authentication
- `EMAIL_FROM` - Sender email
- `HELICONE_API_KEY` - LLM analytics
- `FIRECRAWL_KEY` - Web scraping

## Post-Deployment Verification

1. Check `/docs` page loads (tests database connection)
2. Check authentication works
3. Verify AI features work (agent creation/evaluation)
4. Monitor Vercel logs for any runtime errors

## Rollback Plan

If issues persist:
1. Revert to last known working commit
2. Use dual Prisma client generation as temporary fix
3. Update Terraform to previous configuration
4. Redeploy

## Key Learnings

1. **Terraform matters** - Build configuration in code must match repo structure
2. **Prisma needs help** - Monorepo deployments require explicit engine copying
3. **Environment variables are critical** - Missing vars cause cryptic errors
4. **Test incrementally** - Queue multiple experiments to find what works
5. **Dual generation is a last resort** - Works but creates maintenance burden