-- Rollback script for agentType removal
-- Only use this if you need to rollback the deployment

-- 1. Recreate the AgentType enum
CREATE TYPE "AgentType" AS ENUM ('ASSESSOR', 'ADVISOR', 'ENRICHER', 'EXPLAINER');

-- 2. Re-add the agentType column
ALTER TABLE "AgentVersion" ADD COLUMN "agentType" "AgentType";

-- 3. Restore data from backup (if backup was created)
UPDATE "AgentVersion" av 
SET "agentType" = b."agentType"
FROM "AgentVersionBackup_20250704" b 
WHERE av.id = b.id;

-- 4. If no backup exists, set a default value (this is risky!)
-- UPDATE "AgentVersion" SET "agentType" = 'ASSESSOR' WHERE "agentType" IS NULL;

-- 5. Make column NOT NULL after data is restored
-- ALTER TABLE "AgentVersion" ALTER COLUMN "agentType" SET NOT NULL;