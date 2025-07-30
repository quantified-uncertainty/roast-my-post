# Deployment Configuration

## Vercel Setup for Monorepo

Since the application has been migrated to a monorepo structure, the Vercel deployment settings need to be updated:

### Required Changes:

1. **Root Directory**: Change from `./` to `apps/web`
   - This tells Vercel where to find the Next.js application's `package.json`
   - Without this change, Vercel will look in the repository root and fail to find Next.js

2. **Build Command**: Should automatically detect as `pnpm build` 
   - Vercel should automatically use pnpm since `pnpm-lock.yaml` is present

3. **Install Command**: Should automatically detect as `pnpm install`
   - Vercel should automatically use the workspace structure

### Steps to Update:

1. Go to Vercel Dashboard → Project Settings
2. Navigate to "General" tab
3. Find "Root Directory" setting
4. Change from `./` to `apps/web`
5. Save changes
6. Redeploy

### File Structure:
```
/                          # Repository root
├── apps/
│   └── web/              # Next.js app (NEW ROOT DIRECTORY)
│       ├── package.json
│       ├── next.config.js
│       └── src/
├── internal-packages/
│   └── db/               # Shared Prisma package
└── pnpm-workspace.yaml
```

### Troubleshooting:

If deployment still fails after changing the Root Directory:
- Ensure the `@roast/db` workspace dependency is properly built
- Check that Prisma client is generated during build
- Verify all import paths are correct for the monorepo structure