# Monorepo Environment Variable Strategy

## Overview

This monorepo uses a hierarchical environment variable loading strategy that allows for both shared and package-specific configuration.

## Environment File Locations

### Root Level (Shared)
- `/.env` - Shared environment variables for all packages
- `/.env.local` - Local overrides (not committed to git)
- `/.env.production` - Production environment variables
- `/.env.development` - Development environment variables

### Package Level (Specific)
- `/apps/web/.env.example` - Example env vars needed for web app
- `/apps/mcp-server/.env.example` - Example env vars needed for MCP server

## Loading Priority

Environment variables are loaded in this order (later overrides earlier):
1. Root `.env`
2. Root `.env.{NODE_ENV}` (e.g., `.env.production`)
3. Root `.env.local`
4. Package-specific `.env` (if any)
5. Process environment variables

## Best Practices

### 1. Shared Variables
Variables used by multiple packages should be in the root `.env`:
```bash
# Root .env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Package-Specific Variables
Variables used by only one package can be in that package's directory:
```bash
# apps/web/.env (if needed)
NEXT_PUBLIC_ANALYTICS_ID=...
```

### 3. Local Development
Use `.env.local` for personal overrides:
```bash
# .env.local (not committed)
DATABASE_URL=postgresql://localhost:5432/my_local_db
```

### 4. Security
- Never commit `.env` files with real secrets
- Use `.env.example` files to document required variables
- Add all `.env*` files (except `.env.example`) to `.gitignore`

## Required Environment Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Authentication
- `NEXTAUTH_URL` - NextAuth callback URL (e.g., http://localhost:3000)
- `AUTH_SECRET` - NextAuth secret for JWT signing
- `AUTH_RESEND_KEY` - Resend API key for email authentication

### AI Services
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `OPENROUTER_API_KEY` - OpenRouter API key (optional)
- `OPENAI_API_KEY` - OpenAI API key (optional)

### Monitoring (Optional)
- `HELICONE_API_KEY` - Helicone API key for AI monitoring
- `HELICONE_CACHE_ENABLED` - Enable prompt caching (true/false)
- `HELICONE_CACHE_MAX_AGE` - Cache TTL in seconds

### External Services (Optional)
- `FIRECRAWL_KEY` - Firecrawl API key for web scraping
- `DIFFBOT_KEY` - Diffbot API key for article extraction

## Script Usage

### With pnpm
pnpm automatically loads `.env` files from the workspace root:
```bash
pnpm --filter @roast/web dev
```

### With Direct Script Execution
Use dotenv-cli for scripts that need env vars:
```bash
# In package.json
"with-env": "dotenv -e ../../.env -- node script.js"
```

### In Docker
Pass environment variables explicitly:
```dockerfile
ENV DATABASE_URL=${DATABASE_URL}
```

Or use env_file in docker-compose:
```yaml
services:
  web:
    env_file:
      - .env
      - .env.production
```

## Turbo Integration

Turbo.json declares which env vars affect caching:
```json
{
  "globalEnv": [
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "NODE_ENV"
  ]
}
```

## Troubleshooting

### Variable Not Loading
1. Check file exists and has correct name
2. Verify loading order (root → package → local)
3. Ensure variable is exported: `export VAR=value`
4. Check if Turbo needs the var in `globalEnv`

### Different Values in Different Packages
This is by design - package-specific `.env` files override root values.

### Production Deployment
Ensure all required variables are set in your deployment platform (Vercel, Railway, etc.)