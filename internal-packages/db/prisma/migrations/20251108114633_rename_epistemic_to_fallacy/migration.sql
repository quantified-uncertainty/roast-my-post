-- Rename agent IDs from epistemic to fallacy
-- This migration updates the agent IDs in the Agent table to reflect the new naming convention

-- Update old agents' plugin IDs to use the new plugin names for backward compatibility
UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'epistemic-critic', 'fallacy-check')
WHERE 'epistemic-critic' = ANY("pluginIds");

UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'epistemic-verification', 'fallacy-verification')
WHERE 'epistemic-verification' = ANY("pluginIds");

UPDATE "AgentVersion"
SET "pluginIds" = array_replace("pluginIds", 'ea-epistemic-auditor', 'ea-fallacy-auditor')
WHERE 'ea-epistemic-auditor' = ANY("pluginIds");

-- Only rename agents if the new IDs don't already exist (idempotent)
-- Update system-epistemic-critic to system-fallacy-check
UPDATE "Agent"
SET "id" = 'system-fallacy-check'
WHERE "id" = 'system-epistemic-critic'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'system-fallacy-check');

-- Update system-epistemic-verification to system-fallacy-verification
UPDATE "Agent"
SET "id" = 'system-fallacy-verification'
WHERE "id" = 'system-epistemic-verification'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'system-fallacy-verification');

-- Update ea-epistemic-auditor to ea-fallacy-auditor
UPDATE "Agent"
SET "id" = 'ea-fallacy-auditor'
WHERE "id" = 'ea-epistemic-auditor'
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "id" = 'ea-fallacy-auditor');

-- Note: Foreign key constraints in Job and Comment tables will automatically
-- update to reference the new agent IDs due to ON UPDATE CASCADE
