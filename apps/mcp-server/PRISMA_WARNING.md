# ⚠️ IMPORTANT: Prisma Usage Warning

## DO NOT run Prisma commands in this directory!

This MCP server uses the parent project's Prisma client to prevent version conflicts and data loss.

### ❌ NEVER run these commands here:
- `npx prisma generate`
- `npx prisma db push`
- `npx prisma migrate`
- `npm install prisma`
- `npm install @prisma/client`

### ✅ Instead, run ALL Prisma commands from the parent directory:
```bash
cd ..  # Go to project root
npm run db:push      # Uses safe wrapper
npm run db:migrate   # Uses safe wrapper
npx prisma generate  # Generate client
```

### Why this matters:
Running Prisma commands in subdirectories with different Prisma versions can cause:
- Complete data loss
- Schema corruption
- Version conflicts
- Unexpected behavior

### If you need to update the Prisma client:
1. Go to the project root: `cd ..`
2. Run: `npx prisma generate`
3. Come back here: `cd mcp-server`
4. Build: `npm run build`

This directory intentionally has no local Prisma installation to prevent accidents.