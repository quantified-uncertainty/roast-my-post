# Environment Variables Setup

This monorepo follows best practices for environment variable management with app-scoped configuration.

## Structure

```
monorepo-migration/
├── .env                     # (Optional) Dev-only shared vars
├── apps/
│   ├── web/
│   │   ├── .env.example    # Template showing required vars
│   │   └── .env.local      # Your actual secrets (gitignored)
│   └── mcp-server/
│       ├── .env.example    # Template showing required vars
│       └── .env.local      # Your actual secrets (gitignored)
└── internal-packages/
    └── db/                  # Uses DATABASE_URL from app context
```

## Quick Start

### 1. Web Application Setup

```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your actual values
```

Key variables needed:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with: `openssl rand -base64 32`)
- `AUTH_RESEND_KEY` - For email authentication
- `ANTHROPIC_API_KEY` - For AI features

### 2. MCP Server Setup

```bash
cd apps/mcp-server
cp .env.example .env.local
# Edit .env.local with your actual values
```

Key variables needed:
- `DATABASE_URL` - Same PostgreSQL connection
- `ROAST_MY_POST_MCP_USER_API_KEY` - Your MCP API key

## Best Practices

1. **Never commit `.env.local` files** - These contain secrets
2. **Always update `.env.example`** when adding new variables
3. **Use app-scoped variables** - Each app manages its own environment
4. **Duplicate shared vars if needed** - Better than cross-app dependencies

## Environment Files Explained

- `.env.example` - Committed to git, shows required variables with dummy values
- `.env.local` - Never committed, contains your actual secrets
- `.env` - (Optional) Can be used for non-secret dev defaults

## Common Issues

### Auth Secret Missing
If you see "MissingSecret" errors, ensure `AUTH_SECRET` is in `apps/web/.env.local`

### Database Connection
Both apps need `DATABASE_URL`. Yes, it's duplicated - this is intentional for isolation.

### MCP Server Not Connecting
Check that `ROAST_MY_POST_MCP_USER_API_KEY` matches between the web app and MCP server.

## Production Deployment

For production (e.g., Vercel):
1. Set environment variables in your hosting platform
2. Don't rely on `.env` files in production
3. Use different values for production secrets