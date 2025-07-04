# Deployment Notes for AgentType Removal

## Pre-deployment Steps

1. **Create a backup of the agentType data** (CRITICAL):
   ```bash
   psql $DATABASE_URL < scripts/backup-agenttype-data.sql
   ```

2. Verify the backup was created:
   ```sql
   SELECT COUNT(*) FROM "AgentVersionBackup_20250704";
   ```

## Deployment Steps

1. Deploy the code changes (this PR)
2. Run the migration:
   ```bash
   npx prisma migrate deploy
   ```

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