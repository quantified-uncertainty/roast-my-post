-- Rename FallacyCheckerProfile -> PluginProfile (preserves all existing data)

-- Rename table
ALTER TABLE "FallacyCheckerProfile" RENAME TO "PluginProfile";

-- Add pluginType column with default for existing rows
ALTER TABLE "PluginProfile" ADD COLUMN "pluginType" TEXT NOT NULL DEFAULT 'fallacy-check';

-- Drop old unique constraint and indexes
DROP INDEX IF EXISTS "FallacyCheckerProfile_agentId_name_key";
DROP INDEX IF EXISTS "FallacyCheckerProfile_agentId_idx";
DROP INDEX IF EXISTS "FallacyCheckerProfile_isDefault_idx";

-- Create new constraints with pluginType
CREATE UNIQUE INDEX "PluginProfile_pluginType_agentId_name_key" ON "PluginProfile"("pluginType", "agentId", "name");
CREATE INDEX "PluginProfile_pluginType_agentId_idx" ON "PluginProfile"("pluginType", "agentId");
CREATE INDEX "PluginProfile_isDefault_idx" ON "PluginProfile"("isDefault");
