-- DropColumn
ALTER TABLE "AgentVersion" DROP COLUMN IF EXISTS "agentType";

-- DropEnum
DROP TYPE IF EXISTS "AgentType";