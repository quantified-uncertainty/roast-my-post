# System Architecture Overview

## Overview

This document provides a comprehensive overview of the roast-my-post system architecture, including key components, data flow, and design decisions.

## Status: Under Construction 🚧

This documentation is currently being developed. Key topics to be covered:

### System Components
- **Frontend** (Next.js App Router) - `apps/web/`
- **Backend API Routes** - `apps/web/src/app/api/`
- **Database Layer** - PostgreSQL + Prisma (`internal-packages/db/`)
- **Job Processing System** - Asynchronous job queue
- **AI Integration Layer** - Claude/OpenAI wrappers
- **Authentication System** - NextAuth.js
- **MCP Server** - Database access (`apps/mcp-server/`)

### Monorepo Structure
- **Workspaces**: pnpm workspace monorepo
- **Shared Packages**: `@roast/db` for database access
- **Build System**: Turborepo for coordinated builds
- **Development Tools**: Centralized in `dev/` directory

### Architecture Patterns
- Request/Response Flow
- Asynchronous Job Processing
- State Management
- Caching Strategy
- Error Handling

### Key Design Decisions
- Why Next.js App Router
- Database schema choices
- Job queue implementation
- AI provider abstraction
- Security architecture

### Integration Points
- External AI Services (Claude, OpenAI)
- Content Import Sources
- Monitoring (Helicone)
- MCP Server for database access

## Quick References

While this documentation is being completed, refer to:
- [Agent System](./agents.md) - Core evaluation system
- [Claude Wrapper](./claude-wrapper-pattern.md) - AI integration pattern
- [Testing Strategy](./testing.md) - System testing approach

---
**Document Status**: In Progress  
**Last Updated**: 2024-01-21  
**Priority**: High