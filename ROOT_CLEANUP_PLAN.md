# Root Directory Cleanup Plan

## Current Structure (Messy)
```
/
├── apps/               # ✅ Good - application code
├── internal-packages/  # ✅ Good - shared internal packages
├── claude/            # ❌ Project-specific, should move
├── data/              # ❌ Unclear purpose
├── docs/              # ❌ Mixed concerns (dev docs, operations, etc)
├── evaluations/       # ❌ Unclear if app or tool
├── mcp-server/        # ❌ Should be in apps/
├── scripts/           # ❌ Mixed utilities and tools
├── config/            # ❓ Might belong in internal-packages
├── knip.json         # ✅ Root config files are fine
├── turbo.json        # ✅ Root config files are fine
└── [other configs]    # ✅ Root config files are fine
```

## Proposed Structure (Clean)
```
/
├── apps/
│   ├── web/              # Next.js application
│   ├── mcp-server/       # MCP database server
│   └── evaluation-server/ # Python evaluation service (future)
│
├── internal-packages/
│   ├── db/              # Prisma database
│   └── configs/         # Shared ESLint, Jest configs
│
├── tools/               # Developer tools & scripts
│   ├── scripts/         # Utility scripts (backup, migrations)
│   ├── analysis/        # Claude analysis & ideation
│   └── docs/            # All documentation
│
├── [root config files]  # package.json, turbo.json, etc.
└── README.md
```

## Migration Plan

### Stage 1: Move MCP Server
- Move `/mcp-server` → `/apps/mcp-server`
- Update any references in package.json scripts
- Test that MCP server still works

### Stage 2: Create Dev Directory  
- Create `/dev` directory
- Move `/scripts` → `/dev/scripts`
- Move `/claude` → `/research`
- Move `/docs` → `/dev/docs`

### Stage 3: Handle Evaluations
- Determine if `/evaluations` is:
  - An app → move to `/apps/evaluation-server`
  - A tool → move to `/tools/evaluations`
  - Test data → move to `/tools/test-data`

### Stage 4: Clean Up Configs
- Move `/config` contents to `/internal-packages/configs`
- Or keep minimal configs at root if they're truly root-level

### Stage 5: Review Data Directory
- If it's test data → `/tools/test-data`
- If it's app data → appropriate app directory
- If it's documentation → `/tools/docs/data`

## Benefits
1. **Clear separation**: Apps vs tools vs packages
2. **Monorepo best practices**: Following patterns from Nx, Turborepo examples
3. **Easier navigation**: Know where to find things
4. **Better CI/CD**: Can target specific directories
5. **Cleaner root**: Only essential config files at root

## Alternative Considerations

### Option A: Keep scripts at root
- Some projects keep `/scripts` at root for easy access
- But it can get messy with many scripts

### Option B: Create separate repos
- `/claude` analysis could be a separate repo
- But loses context of being with the code

### Option C: Use `.github/` for some content
- GitHub-specific docs could go in `.github/docs`
- Keeps root even cleaner

## Next Steps
1. Fix current TypeScript errors first
2. Move MCP server (easiest, most clear-cut)
3. Gradually migrate other directories
4. Update all references and test