-- Reverse the foreign key relationship between EvaluationComment and EvaluationHighlight
-- This ensures that highlights are deleted when their parent comments are deleted

-- Step 1: Drop the existing foreign key constraint and index from EvaluationComment
ALTER TABLE "EvaluationComment" DROP CONSTRAINT IF EXISTS "EvaluationComment_highlightId_fkey";
DROP INDEX IF EXISTS "EvaluationComment_highlightId_idx";
DROP INDEX IF EXISTS "EvaluationComment_highlightId_key";

-- Step 2: Add commentId to EvaluationHighlight (if not exists)
ALTER TABLE "EvaluationHighlight" 
ADD COLUMN IF NOT EXISTS "commentId" TEXT;

-- Step 3: Populate commentId in EvaluationHighlight from existing relationships
UPDATE "EvaluationHighlight" h
SET "commentId" = c.id
FROM "EvaluationComment" c
WHERE c."highlightId" = h.id
AND h."commentId" IS NULL;

-- Step 3b: Delete orphaned highlights that have no corresponding comments
DELETE FROM "EvaluationHighlight" WHERE "commentId" IS NULL;

-- Step 4: Make commentId NOT NULL and UNIQUE
ALTER TABLE "EvaluationHighlight" 
ALTER COLUMN "commentId" SET NOT NULL;

ALTER TABLE "EvaluationHighlight"
ADD CONSTRAINT "EvaluationHighlight_commentId_key" UNIQUE ("commentId");

-- Step 5: Add foreign key constraint with CASCADE DELETE
ALTER TABLE "EvaluationHighlight"
ADD CONSTRAINT "EvaluationHighlight_commentId_fkey" 
FOREIGN KEY ("commentId") 
REFERENCES "EvaluationComment"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS "EvaluationHighlight_commentId_idx" ON "EvaluationHighlight"("commentId");

-- Step 7: Drop highlightId from EvaluationComment
ALTER TABLE "EvaluationComment" 
DROP COLUMN IF EXISTS "highlightId";