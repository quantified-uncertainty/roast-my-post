# Scripts

This directory contains utility scripts for development, maintenance, and operations.

## Directory Structure

### `/maintenance`
Regular maintenance scripts that run periodically or are used for system upkeep.

- **`cleanup-expired-batches.ts`** - Manually trigger cleanup of expired ephemeral experiments
- **`scheduled-cleanup.ts`** - Continuous cleanup service that runs on a schedule
- **`cleanup-expired-batches.test.ts`** - Tests for the cleanup functionality

### `/dev`
Development utilities for debugging and analysis.

- **`list-agents.ts`** - List all agents in the database with their details
- **`test-article-import.ts`** - Test the article import functionality
- **`analyze-api-routes.ts`** - Analyze API route structure and dependencies

### `/migrations`
One-time scripts for data migrations and system setup.

- **`set-admin.ts`** - Grant admin privileges to a user
- **`add-agent-to-docs.ts`** - Bulk add agent evaluations to documents
- **`replace-console-logs.ts`** - Replace console.log statements with proper logging

## Running Scripts

Most scripts can be run with tsx:

```bash
# Run a maintenance script
npx tsx scripts/maintenance/cleanup-expired-batches.ts

# Run with environment variables
CLEANUP_DRY_RUN=true npx tsx scripts/maintenance/cleanup-expired-batches.ts

# Run the scheduled cleanup service
npx tsx scripts/maintenance/scheduled-cleanup.ts
```

## Maintenance Scripts

### Cleanup Expired Batches

Removes expired ephemeral experiments and all associated resources.

```bash
# Dry run (preview what would be deleted)
CLEANUP_DRY_RUN=true npx tsx scripts/maintenance/cleanup-expired-batches.ts

# Actually perform cleanup
npx tsx scripts/maintenance/cleanup-expired-batches.ts
```

### Scheduled Cleanup

Runs cleanup automatically on a schedule. Used for production deployments.

```bash
# Run with default 60-minute interval
npx tsx scripts/maintenance/scheduled-cleanup.ts

# Run with custom interval
CLEANUP_INTERVAL_MINUTES=30 npx tsx scripts/maintenance/scheduled-cleanup.ts
```

## Development Scripts

### List Agents

Shows all agents in the system with their metadata.

```bash
npx tsx scripts/dev/list-agents.ts
```

### Test Article Import

Tests importing articles from various sources.

```bash
npx tsx scripts/dev/test-article-import.ts <url>
```

## Migration Scripts

### Set Admin

Grant admin privileges to a user by email.

```bash
npm run set-admin <email>
# or
npx tsx scripts/migrations/set-admin.ts <email>
```

### Add Agent to Documents

Bulk create evaluations for documents.

```bash
npx tsx scripts/migrations/add-agent-to-docs.ts
```

## Testing

Scripts in the maintenance directory include tests:

```bash
npm test scripts/maintenance/cleanup-expired-batches.test.ts
```

## Production Deployment

For production, the scheduled cleanup service should be run as a daemon:

### Using systemd

```ini
[Unit]
Description=Ephemeral Cleanup Service
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/app
ExecStart=/usr/bin/node /app/scripts/maintenance/scheduled-cleanup.js
Restart=on-failure
Environment="NODE_ENV=production"
Environment="CLEANUP_INTERVAL_MINUTES=60"

[Install]
WantedBy=multi-user.target
```

### Using PM2

```bash
pm2 start scripts/maintenance/scheduled-cleanup.js --name cleanup-service
pm2 save
pm2 startup
```

### Using Docker

Include in your docker-compose.yml:

```yaml
cleanup:
  image: your-app-image
  command: node scripts/maintenance/scheduled-cleanup.js
  environment:
    - CLEANUP_INTERVAL_MINUTES=60
    - DATABASE_URL=${DATABASE_URL}
  restart: unless-stopped
```

## Environment Variables

Scripts may use these environment variables:

- `CLEANUP_INTERVAL_MINUTES` - Interval between cleanup runs (default: 60)
- `CLEANUP_DRY_RUN` - If "true", preview changes without executing (default: false)
- `DATABASE_URL` - Database connection string (required)