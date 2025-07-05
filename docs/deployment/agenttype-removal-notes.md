# Deployment Notes for AgentType Removal

## Automated Backup System

**GitHub Actions will automatically create a backup before running migrations!** The workflow:
1. Creates a database backup when migrations are detected
2. Stores backup as GitHub artifact (30 days retention)
3. Optionally uploads to S3 if configured
4. Only runs migrations after successful backup

### Manual Pre-deployment Steps (Optional)

If you want an additional manual backup:
1. **Create a backup of the agentType data**:
   ```bash
   psql $DATABASE_URL < scripts/backup-agenttype-data.sql
   ```

2. Verify the backup was created:
   ```sql
   SELECT COUNT(*) FROM "AgentVersionBackup_20250704";
   ```

## Deployment Steps

1. **Merge to main branch** - This triggers:
   - Automatic database backup via GitHub Actions
   - Migration deployment after successful backup
   - Backup artifact stored for 30 days

2. **Monitor the GitHub Actions workflow**:
   - Check the "Prisma Migrate Production DB" workflow
   - Verify backup completed successfully
   - Confirm migrations applied

## Rollback Plan

If you need to rollback:

1. First, rollback the code deployment
2. Then restore the database schema:
   ```bash
   psql $DATABASE_URL < scripts/rollback-agenttype-migration.sql
   ```

## Post-deployment Cleanup

After confirming the deployment is stable (e.g., after 1 week):

1. Drop the backup table:
   ```sql
   DROP TABLE IF EXISTS "AgentVersionBackup_20250704";
   ```

## Notes

- The AgentType column and enum are completely removed
- All code references to agentType/purpose have been removed
- The migration uses IF EXISTS clauses for safety