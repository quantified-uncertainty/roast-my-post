# MCP Server Development Workflow

This guide explains how to develop and test the Roast My Post MCP (Model Context Protocol) server efficiently.

## Understanding MCP Server Architecture

### How MCP Servers Work

- MCP servers are **child processes** managed by Claude Desktop/Claude Code
- They communicate via stdio (stdin/stdout) using JSON-RPC
- Each Claude window spawns its own MCP server instance
- Servers are started when Claude launches and terminated when it closes

### Key Files

- **Source**: `mcp-server/src/index.ts` (TypeScript source)
- **Compiled**: `mcp-server/dist/index.js` (What Claude actually runs)
- **Config**: `.mcp.json` (Tells Claude Code how to start the server)

## Development Setup

### Initial Setup

```bash
cd mcp-server
npm install
npm run build  # Creates initial dist/index.js
```

### Development Mode

```bash
cd mcp-server
npm run dev  # Starts TypeScript watcher
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

### Changes Not Reflecting

1. Ensure `npm run dev` is running and shows "Watching for file changes"
2. Check for TypeScript compilation errors in the terminal
3. Verify `dist/index.js` timestamp is recent
4. Restart Claude Code (required for changes to take effect)

### Multiple MCP Server Processes

- Normal if you have both Claude Desktop and Claude Code open
- Each Claude instance manages its own MCP server
- They don't interfere with each other

### Environment Variables Not Working

1. Check `.mcp.json` configuration
2. Ensure variables are in the `env` section
3. Restart Claude Code after config changes

## Best Practices

1. **Always run `npm run dev` during development** - It handles compilation automatically
2. **Test locally first** - Use echo commands before full integration testing
3. **One change at a time** - Easier to identify what broke if something goes wrong
4. **Check logs** - MCP server logs can reveal configuration issues
5. **Commit compiled code** - Include `dist/` in git for easier deployment

## Quick Reference

```bash
# Start development
cd mcp-server && npm run dev

# Test without Claude
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/index.js

# Restart Claude Code to load changes
# (No command - just quit and reopen Claude Code)

# Debug issues
tail -f ~/Library/Logs/Claude/mcp-server-roast-my-post.log
```

## Important Notes

- **No hot reload** - Always restart Claude Code for changes
- **Separate processes** - Claude Desktop and Claude Code run independent MCP servers
- **Stdio communication** - MCP servers don't use network ports
- **Security isolation** - Each server runs in a controlled subprocess

This workflow may seem manual, but it ensures security and stability. The MCP protocol is still in beta, and developer experience improvements may come in future updates.
