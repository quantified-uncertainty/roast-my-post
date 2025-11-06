# System Pause Control GitHub Action

This GitHub Action allows you to quickly pause or unpause the RoastMyPost system in response to API rate limits or other issues.

## Features

- **Manual Trigger**: Run from GitHub Actions UI
- **Multi-Environment**: Support for production and staging
- **Safe Operations**: Validates inputs and confirms actions
- **Audit Trail**: All pauses/unpauses are recorded in database

## Setup

### 1. Configure GitHub Secrets

You need to set up environment-specific `DATABASE_URL` secrets:

#### For Production Environment

1. Go to: **Settings → Environments → production**
2. Add secret: `DATABASE_URL`
   ```
   postgresql://user:password@host:port/database
   ```

#### For Staging Environment

1. Go to: **Settings → Environments → staging**
2. Add secret: `DATABASE_URL`
   ```
   postgresql://user:password@host:port/database
   ```

> **Note**: Make sure the database user has INSERT and UPDATE permissions on the `SystemPause` table.

### 2. Verify Workflow Permissions

Ensure the workflow has permission to run:
- Go to: **Settings → Actions → General**
- Under "Workflow permissions", ensure "Read and write permissions" is enabled

## Usage

### How to Pause the System

1. Go to: **Actions → System Pause Control**
2. Click "Run workflow"
3. Select inputs:
   - **Action**: `pause`
   - **Environment**: `production` or `staging`
   - **Reason**: `"Claude API rate limit exceeded - pausing for 1 hour"`
4. Click "Run workflow"

### How to Unpause the System

1. Go to: **Actions → System Pause Control**
2. Click "Run workflow"
3. Select inputs:
   - **Action**: `unpause`
   - **Environment**: `production` or `staging`
   - **Reason**: (leave empty, not required)
4. Click "Run workflow"

## What Happens When Paused

### Backend
- ❌ All new LLM API calls blocked
- ❌ New evaluation requests return 503 error
- ❌ Document imports blocked
- ✅ Running background jobs continue to completion

### Frontend
- 🚨 Red warning banner appears site-wide
- 📝 Displays the pause reason to users
- 🔄 Updates on page load/navigation

## Workflow Details

The GitHub Action uses the same npm scripts available locally for consistency:

### Pause Action
```bash
pnpm --filter @roast/db run system:pause "your reason here"
```

Internally creates:
```sql
INSERT INTO "SystemPause" (id, reason, "startedAt")
VALUES (gen_random_uuid(), 'your reason here', NOW());
```

### Unpause Action
```bash
pnpm --filter @roast/db run system:unpause
```

Internally executes:
```sql
UPDATE "SystemPause"
SET "endedAt" = NOW()
WHERE "endedAt" IS NULL;
```

## Monitoring

After running the workflow:
1. Check the workflow run logs for confirmation
2. Visit the site to see the banner (for pause)
3. Try creating an evaluation to verify it's blocked (for pause)

## Troubleshooting

### "Error: Reason is required when pausing the system"
- You selected "pause" but didn't provide a reason
- Solution: Fill in the "Reason" field with a descriptive message

### "No active pauses found"
- You selected "unpause" but system wasn't paused
- Solution: This is expected behavior, no action needed

### Connection Failed
- Database URL secret might be incorrect
- Solution: Verify `DATABASE_URL` secret is correctly formatted
- Check database firewall allows GitHub Actions IPs (or use GitHub-hosted database)

### Permission Denied
- Database user doesn't have required permissions
- Solution: Grant INSERT/UPDATE on SystemPause table:
  ```sql
  GRANT INSERT, UPDATE ON "SystemPause" TO your_user;
  ```

## CLI Commands (Recommended)

The easiest way to manage system pauses locally or in development:

### Check Status
```bash
pnpm --filter @roast/db run system:status
```

### Pause System
```bash
pnpm --filter @roast/db run system:pause "Reason for pausing"
```

### Unpause System
```bash
pnpm --filter @roast/db run system:unpause
```

These commands provide:
- ✅ Colorful, formatted output
- ✅ Input validation
- ✅ Duration tracking
- ✅ Helpful tips and guidance

## Manual Database Access

If you need to manage pauses via SQL:

### Check Active Pauses
```sql
SELECT * FROM "SystemPause" WHERE "endedAt" IS NULL;
```

### View Pause History
```sql
SELECT id, reason, "startedAt", "endedAt"
FROM "SystemPause"
ORDER BY "startedAt" DESC
LIMIT 10;
```

### Manual Pause
```sql
INSERT INTO "SystemPause" (id, reason, "startedAt")
VALUES (gen_random_uuid(), 'Manual pause via SQL', NOW());
```

### Manual Unpause
```sql
UPDATE "SystemPause"
SET "endedAt" = NOW()
WHERE "endedAt" IS NULL;
```

## Security Considerations

- ✅ Uses GitHub Environment protection rules
- ✅ Requires manual approval for production (if configured)
- ✅ Database credentials stored as encrypted secrets
- ✅ All actions logged in GitHub audit trail
- ✅ All pauses recorded in database with timestamps

## Example Scenarios

### Scenario 1: Claude API Rate Limit Hit
```
Action: pause
Environment: production
Reason: Claude API rate limit exceeded - pausing until 3pm UTC
```

### Scenario 2: Scheduled Maintenance
```
Action: pause
Environment: production
Reason: Scheduled maintenance - database migration in progress
```

### Scenario 3: Emergency Unpause
```
Action: unpause
Environment: production
Reason: (empty)
```

## Related Files

- Workflow: `.github/workflows/system-pause-control.yml`
- Database utils: `internal-packages/db/src/utils/system-pause-utils.ts`
- Banner component: `apps/web/src/components/SystemPauseBanner.tsx`
- Migration: `internal-packages/db/prisma/migrations/20251106163419_add_system_pause_table/`
