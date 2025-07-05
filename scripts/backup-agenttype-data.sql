-- Backup script to save agentType data before migration
-- Run this in production before deploying the migration

-- Create backup table
CREATE TABLE IF NOT EXISTS "AgentVersionBackup_20250704" AS 
SELECT id, "agentType" 
FROM "AgentVersion" 
WHERE "agentType" IS NOT NULL;

-- Verify backup
SELECT COUNT(*) as backed_up_records FROM "AgentVersionBackup_20250704";

-- To restore (if needed):
-- UPDATE "AgentVersion" av 
-- SET "agentType" = b."agentType"
-- FROM "AgentVersionBackup_20250704" b 
-- WHERE av.id = b.id;