# Git Worktree Management

This document describes the worktree management system for Roast My Post, which enables parallel development with automatic port allocation and tmux integration.

## Overview

The worktree system allows you to work on multiple branches simultaneously without constantly switching contexts. Each worktree:
- Gets its own directory with a full checkout
- Has dedicated ports (100 port range per worktree)
- Runs in an organized tmux session
- Shares the same database (be careful with migrations!)

## Quick Start

```bash
# Create a new worktree for a feature branch
./scripts/worktree-manager.sh create feature-awesome-thing

# Start all processes (dev server, workers)
./scripts/worktree-manager.sh start feature-awesome-thing

# Attach to see all running processes
./scripts/worktree-manager.sh attach feature-awesome-thing
```

## Port Allocation Strategy

Each worktree gets 100 dedicated ports to prevent conflicts:

| Worktree | Port Range | Dev Server |
|----------|------------|------------|
| Main repo | 3000-3099 | 3000 |
| Worktree 1 | 3100-3199 | 3100 |
| Worktree 2 | 3200-3299 | 3200 |
| Worktree 3 | 3300-3399 | 3300 |

Within each range, services use standard offsets:
- `:00` - Next.js dev server
- `:06` - Storybook (future)
- `:10` - MCP Server (future)
- `:20` - API documentation (future)
- `:30` - Test server (future)
- `:80` - Monitoring/metrics (future)

## tmux Session Layout

Each worktree runs in a tmux session named `<branch>` with 3 windows:

1. **dev** - Next.js development server
2. **workers** - Job processor (disabled in worktrees to avoid conflicts)
3. **claude** - Claude Code with workspace context and dev server URL

### tmux Navigation

- `Ctrl+B, D` - Detach from session (processes keep running)
- `Ctrl+B, 0-2` - Switch to window by number
- `Ctrl+B, N/P` - Next/Previous window
- `Ctrl+B, [` - Enter scroll mode (q to exit)
- `Ctrl+B, Z` - Toggle pane zoom
- `Ctrl+B, ?` - Show all keybindings

## Command Reference

### Create a Worktree
```bash
./scripts/worktree-manager.sh create <branch> [<base-commit>]
```
- Creates git worktree
- Installs dependencies (`npm install`)
- Generates Prisma client
- Copies and updates .env files
- Allocates unique ports

### Start tmux Session
```bash
./scripts/worktree-manager.sh start <branch>
```
- Starts all processes in tmux
- Each process in its own window
- Shows URLs for services

### Attach to Session
```bash
./scripts/worktree-manager.sh attach <branch>
```
- Attaches to running tmux session
- Use `Ctrl+B, D` to detach

### Stop Session
```bash
./scripts/worktree-manager.sh stop <branch>
```
- Kills all processes in the tmux session

### List Worktrees
```bash
./scripts/worktree-manager.sh list
```
- Shows all worktrees with their status
- Displays port assignments
- Indicates if tmux session is running

### Show Port Allocations
```bash
./scripts/worktree-manager.sh ports
```
- Displays port allocation table
- Shows which ports each worktree uses

### Remove Worktree
```bash
./scripts/worktree-manager.sh remove <branch>
```
- Stops tmux session
- Removes git worktree
- Cleans up configuration
- Optionally deletes branch

## Important Notes

### Database Sharing
All worktrees share the same database connection:
- Be careful with migrations - they affect all worktrees
- Data created in one worktree is visible in others
- Only run one migration at a time

### Environment Variables
The system automatically:
- Copies all `.env*` files (except `.env.example`)
- Updates `NEXTAUTH_URL` to use the correct port
- Updates API base URLs to match the dev server port

### Running Multiple Worktrees
You can run multiple worktrees simultaneously:
- Each has its own ports (no conflicts)
- Monitor all with `tmux ls`
- System resources permitting, run 3-4 worktrees at once

### Troubleshooting

**Port already in use**
- Check port allocation: `./scripts/worktree-manager.sh ports`
- Another worktree may be using the port
- Use `lsof -i :<port>` to find what's using it

**Can't attach to session**
- Make sure session is started first
- Check if session exists: `tmux ls | grep rmp-<branch>`

**Dependencies out of sync**
- Run `npm install` in the worktree directory
- Regenerate Prisma: `npx prisma generate`

## Example Workflow

```bash
# 1. Create a new feature branch worktree
./scripts/worktree-manager.sh create feature-new-ui

# 2. Start all processes
./scripts/worktree-manager.sh start feature-new-ui

# 3. Open the worktree in Claude Code
# Navigate to: ../feature-new-ui

# 4. Attach to monitor processes
./scripts/worktree-manager.sh attach feature-new-ui

# 5. Access services
# Dev server: http://localhost:3100
# (Use main repo's Prisma Studio on port 3055 if needed)

# 6. When done for the day, detach with Ctrl+B, D
# (processes keep running)

# 7. Stop everything when finished
./scripts/worktree-manager.sh stop feature-new-ui

# 8. Remove when feature is complete
./scripts/worktree-manager.sh remove feature-new-ui
```

## Note on npm Scripts

The worktree management scripts are standalone shell scripts and are intentionally **not** included as npm scripts. This prevents issues with Docker builds and keeps them as development-only tools. Always use the direct script paths as shown above.

## Implementation Details

The worktree system consists of:
1. **worktree-manager.sh** - Main unified management script
2. **worktree-port-manager.sh** - Port allocation utilities
3. **worktree-tmux.sh** - Original tmux integration (kept for reference)

Configuration is stored in `~/.config/roast-my-post-worktrees/` as JSON files.