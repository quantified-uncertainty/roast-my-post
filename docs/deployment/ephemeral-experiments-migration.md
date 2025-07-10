# Ephemeral Experiments Migration Guide

## Overview

This guide covers the database migration required to enable ephemeral experiments functionality.

## Database Changes

The ephemeral experiments feature adds new fields to the `AgentEvalBatch` table:

- `trackingId` (String, nullable) - Human-friendly identifier for experiments
- `description` (String, nullable) - Description of the experiment
- `expiresAt` (DateTime, nullable) - When the experiment should be auto-deleted
- `isEphemeral` (Boolean, default: false) - Whether this is a temporary experiment

## Migration Steps

### 1. Apply Database Migration

The migration has already been created in:
```
prisma/migrations/manual_add_ephemeral_experiment_support/migration.sql
```

Apply it with:
```bash
npx prisma migrate deploy
```

### 2. Update Prisma Client

Generate the updated Prisma client:
```bash
npx prisma generate
```

### 3. Set Up Cleanup Job

For production environments, set up the cleanup job to run periodically:

#### Option A: Systemd Service

Create `/etc/systemd/system/ephemeral-cleanup.service`:
```ini
[Unit]
Description=Ephemeral Experiments Cleanup Service
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/app
ExecStart=/usr/bin/node /app/scripts/maintenance/scheduled-cleanup.js
Restart=on-failure
Environment="NODE_ENV=production"
Environment="CLEANUP_INTERVAL_MINUTES=60"
Environment="DATABASE_URL=postgresql://..."

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ephemeral-cleanup
sudo systemctl start ephemeral-cleanup
```

#### Option B: Cron Job

Add to crontab:
```bash
# Run cleanup every hour
0 * * * * cd /app && NODE_ENV=production node scripts/maintenance/cleanup-expired-batches.js >> /var/log/ephemeral-cleanup.log 2>&1
```

### 4. Environment Variables

Add to your production `.env`:
```env
# Cleanup configuration
CLEANUP_INTERVAL_MINUTES=60
CLEANUP_DRY_RUN=false
MAX_EXPERIMENTS_PER_USER=10
DEFAULT_EXPERIMENT_EXPIRY_DAYS=7
MAX_EXPERIMENT_EXPIRY_DAYS=30
```

## Verification

1. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

2. **Test cleanup (dry run)**:
   ```bash
   CLEANUP_DRY_RUN=true npx tsx scripts/maintenance/cleanup-expired-batches.ts
   ```

3. **Monitor cleanup logs**:
   - Check application logs for cleanup activity
   - Look for "Starting cleanup of expired ephemeral batches" messages

## Rollback

If needed, create a down migration:

```sql
-- Remove ephemeral experiment fields
ALTER TABLE "AgentEvalBatch" 
DROP COLUMN "trackingId",
DROP COLUMN "description", 
DROP COLUMN "expiresAt",
DROP COLUMN "isEphemeral";

-- Drop indexes if they exist
DROP INDEX IF EXISTS "AgentEvalBatch_trackingId_idx";
DROP INDEX IF EXISTS "AgentEvalBatch_isEphemeral_expiresAt_idx";
```

## Performance Considerations

- The cleanup job uses indexes on `isEphemeral` and `expiresAt` for efficient queries
- Cascade deletes may lock tables briefly - schedule cleanup during low-traffic periods
- Monitor cleanup duration and adjust `CLEANUP_INTERVAL_MINUTES` as needed

## Monitoring

Key metrics to track:
- Number of expired experiments cleaned up per cycle
- Cleanup job duration
- Failed cleanup attempts
- Database lock contention during cleanup