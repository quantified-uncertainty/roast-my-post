-- Add isStale column to EvaluationVersion table
ALTER TABLE "EvaluationVersion" 
ADD COLUMN "isStale" BOOLEAN NOT NULL DEFAULT false;

-- Create index on isStale for better query performance
CREATE INDEX "EvaluationVersion_isStale_idx" ON "EvaluationVersion"("isStale");

-- Mark all existing evaluation versions as stale
-- (This is optional, depends on whether you want existing data to be considered stale)
-- UPDATE "EvaluationVersion" SET "isStale" = true;