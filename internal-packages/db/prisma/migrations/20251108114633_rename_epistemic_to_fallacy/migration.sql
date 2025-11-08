-- Rename agent IDs from epistemic to fallacy
-- This migration updates the agent IDs in the Agent table to reflect the new naming convention

-- STEP 1: Add ON UPDATE CASCADE to foreign key constraints FIRST
-- This allows the subsequent agent ID renames to automatically propagate to related tables

ALTER TABLE "Evaluation" DROP CONSTRAINT IF EXISTS "Evaluation_agentId_fkey";
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "AgentVersion" DROP CONSTRAINT IF EXISTS "AgentVersion_agentId_fkey";
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "AgentEvalBatch" DROP CONSTRAINT IF EXISTS "AgentEvalBatch_agentId_fkey";
ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- STEP 2: Update plugin IDs for backward compatibility
UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'epistemic-critic', 'fallacy-check')
WHERE 'epistemic-critic' = ANY("pluginIds");

UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'epistemic-verification', 'fallacy-verification')
WHERE 'epistemic-verification' = ANY("pluginIds");

UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'ea-epistemic-auditor', 'ea-fallacy-auditor')
WHERE 'ea-epistemic-auditor' = ANY("pluginIds");

-- STEP 3: Rename agents (idempotent - only if new IDs don't exist)
-- The ON UPDATE CASCADE constraints above will automatically propagate these changes

-- Rename system-epistemic-critic to system-fallacy-check
UPDATE "Agent"
SET "id" = 'system-fallacy-check'
WHERE "id" = 'system-epistemic-critic'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'system-fallacy-check');

-- Rename system-epistemic-verification to system-comprehensive-check
-- (Not fallacy-verification, as this agent checks facts/math/forecasts, not fallacies)
UPDATE "Agent"
SET "id" = 'system-comprehensive-check'
WHERE "id" = 'system-epistemic-verification'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'system-comprehensive-check');

-- Rename ea-epistemic-auditor to ea-fallacy-auditor
UPDATE "Agent"
SET "id" = 'ea-fallacy-auditor'
WHERE "id" = 'ea-epistemic-auditor'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'ea-fallacy-auditor');
