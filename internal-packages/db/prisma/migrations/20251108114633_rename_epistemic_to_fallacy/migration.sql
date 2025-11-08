-- Rename agent IDs from epistemic to fallacy
-- This migration updates the agent IDs in the Agent table to reflect the new naming convention

-- Update system-epistemic-critic to system-fallacy-check
UPDATE "Agent"
SET "id" = 'system-fallacy-check'
WHERE "id" = 'system-epistemic-critic';

-- Update system-epistemic-verification to system-fallacy-verification
UPDATE "Agent"
SET "id" = 'system-fallacy-verification'
WHERE "id" = 'system-epistemic-verification';

-- Note: Foreign key constraints in Job and Comment tables will automatically
-- update to reference the new agent IDs due to ON UPDATE CASCADE
