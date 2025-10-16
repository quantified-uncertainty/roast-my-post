-- Change variationOf foreign key from SET NULL to CASCADE
-- This allows the database to automatically cascade delete variations when parent is deleted
-- instead of requiring manual cascade in application code

-- Drop existing constraint
ALTER TABLE "ClaimEvaluation" DROP CONSTRAINT "ClaimEvaluation_variationOf_fkey";

-- Add new constraint with CASCADE
ALTER TABLE "ClaimEvaluation"
ADD CONSTRAINT "ClaimEvaluation_variationOf_fkey"
FOREIGN KEY ("variationOf") REFERENCES "ClaimEvaluation"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
