# MCP Server Development Workflow

This guide explains how to develop and test the Roast My Post MCP (Model Context Protocol) server efficiently.

## Understanding MCP Server Architecture

### How MCP Servers Work

- MCP servers are **child processes** managed by Claude Desktop/Claude Code
- They communicate via stdio (stdin/stdout) using JSON-RPC
- Each Claude window spawns its own MCP server instance
- Servers are started when Claude launches and terminated when it closes

### Key Files

- **Source**: `apps/mcp-server/src/index.ts` (TypeScript source)
- **Compiled**: `apps/mcp-server/dist/index.js` (Optional - we now use tsx directly)
- **Config**: `~/.../claude_desktop_config.json` (Tells Claude Code how to start the server)
- **Environment**: `apps/mcp-server/.env` (Local environment variables for testing)

## Development Setup

### Initial Setup

```bash
# Install dependencies (from project root)
pnpm install

# Build MCP server (optional - tsx can run TypeScript directly)
pnpm --filter @roast/mcp-server run build

# Ensure Prisma client is generated
pnpm --filter @roast/db run gen
```

### Development Mode

**IMPORTANT**: After monorepo migration and cache issue discovery, we now recommend using tsx directly instead of compilation:

**Current Working Configuration:**
```json
{
  "mcpServers": {
    "roast-my-post": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/apps/mcp-server/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "ROAST_MY_POST_MCP_USER_API_KEY": "rmp_...",
        "ROAST_MY_POST_MCP_API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

This command:

- Watches all TypeScript files in `src/`
- Automatically recompiles to `dist/index.js` on save
- Shows compilation errors in the terminal
- **Keep this running** during development

## Development Workflow

### 1. Two-Terminal Approach (Recommended)

**Terminal 1 - Auto-compilation:**

```bash
cd mcp-server
npm run dev  # Leave running
```

**Terminal 2 - Testing:**

```bash
# Test tools without restarting Claude
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/index.js

# Test specific tools
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "validate_auth", "arguments": {}}, "id": 1}' | node dist/index.js
```

### 2. Full Integration Testing

1. Make changes to `src/index.ts`
2. Save file (auto-compiles via `npm run dev`)
3. Restart Claude Code
4. Test your changes

### 3. Checking MCP Server Status

```bash
# See running MCP servers
ps aux | grep "mcp-server/dist/index.js"

# Check compilation output
ls -la mcp-server/dist/index.js  # Verify timestamp

# View logs
tail -f ~/Library/Logs/Claude/mcp-server-roast-my-post.log
```

## When to Use Each Command

### `npm run dev`

Use during active development:

- Auto-recompiles on file changes
- Shows TypeScript errors immediately
- No need to manually rebuild
- **This is all you need during development**

### `npm run build`

Use for one-time builds:

- Initial project setup
- After pulling changes from git
- Production deployment
- If dev watcher crashes

### `npm start`

Runs the compiled server directly (mainly for testing)

## Common Issues and Solutions

### ⚠ CRITICAL: MCP Server Cache Issue

**The #1 problem**: Claude Code has a persistent cache issue ([GitHub #3095](https://github.com/anthropics/claude-code/issues/3095)). 

**Symptoms**: 
- Changes don't reflect even after rebuilding
- Old errors persist (like "costInCents" column errors)
- Stale file paths or imports

**Solution**: **ALWAYS restart Claude Code completely** after MCP changes. The `/mcp` command is not sufficient.

### Changes Not Reflecting

1. **First check**: Are you using the correct file path in Claude config?
   ```bash
   # After monorepo migration, path should be:
   /full/path/to/apps/mcp-server/src/index.ts  # NOT mcp-server/
   ```

2. **Kill stale processes**:
   ```bash
   ps aux | grep "mcp-server" | grep -v grep
   pkill -f "old-path/mcp-server"  # Kill old processes
   ```

3. **Test directly**:
   ```bash
   echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | npx tsx apps/mcp-server/src/index.ts
   ```

4. **Full restart**: Exit ALL Claude Code instances and restart

### Module Resolution Errors

If you see `"Cannot find module '@roast/db'"` or similar:

1. **Use direct imports** instead of workspace imports:
   ```typescript
   // Instead of: import { prisma } from "@roast/db";
   import { PrismaClient } from "../../../internal-packages/db/generated/index.js";
   ```

2. **Ensure Prisma client is generated**:
   ```bash
   pnpm --filter @roast/db run gen
   ```

### Environment Variables Not Working

1. **Create local .env file** in MCP server directory:
   ```bash
   # apps/mcp-server/.env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roast_my_post?schema=public"
   ROAST_MY_POST_MCP_USER_API_KEY="rmp_..."
   ROAST_MY_POST_MCP_API_BASE_URL="http://localhost:3000"
   ```

2. **Avoid cross-package dependencies**:
   ```typescript
   // BAD: dotenv.config({ path: '../../apps/web/.env.local' });
   // GOOD: dotenv.config(); // Uses local .env
   ```

### Multiple MCP Server Processes

- Each Claude instance manages its own MCP server
- Check for processes from old paths: `ps aux | grep "mcp-server"`
- Old directories can cause confusion: `rm -rf mcp-server/` (old location)

## Best Practices (Updated 2025-08-01)

1. **Use tsx directly** - Avoid compilation step by running TypeScript source directly
2. **Self-contained packages** - Each package should have its own environment configuration
3. **Direct imports** - Avoid workspace imports in MCP servers due to module resolution issues
4. **Test locally first** - Always test MCP server directly before troubleshooting Claude issues
5. **Restart Claude completely** - Never assume changes will be picked up without full restart
6. **Clean up old processes** - Check for and kill stale MCP server processes
7. **Monitor logs** - MCP server logs reveal the actual errors vs cached errors

## Quick Reference (Updated)

```bash
# Test MCP server directly (most important debug step)
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | npx tsx apps/mcp-server/src/index.ts

# Check for stale processes
ps aux | grep "mcp-server" | grep -v grep

# Emergency reset
pkill -f "mcp-server" && rm -rf ~/Library/Logs/Claude/mcp-server-roast-my-post.log

# Regenerate Prisma after schema changes
pnpm --filter @roast/db run gen

# View real-time MCP logs
tail -f ~/Library/Logs/Claude/mcp-server-roast-my-post.log

# Check Claude MCP status (after restart)
# In Claude Code: /mcp
```

## Architecture Decisions

### Why tsx Instead of Compiled JavaScript?

1. **Module Resolution**: Workspace imports work better in tsx environment
2. **Development Speed**: No build step required for changes
3. **Error Clarity**: TypeScript errors are more informative than runtime import errors
4. **Environment Isolation**: Easier to manage environment variables per package

### Why Direct Prisma Imports?

1. **Reliability**: Workspace imports fail unpredictably in compiled environments
2. **Transparency**: Clear dependency chain from MCP server to generated client
3. **Monorepo Compatibility**: Works consistently across different execution contexts

## Important Notes

- **No hot reload** - Always restart Claude Code for changes
- **Separate processes** - Claude Desktop and Claude Code run independent MCP servers
- **Stdio communication** - MCP servers don't use network ports
- **Security isolation** - Each server runs in a controlled subprocess

This workflow may seem manual, but it ensures security and stability. The MCP protocol is still in beta, and developer experience improvements may come in future updates.
