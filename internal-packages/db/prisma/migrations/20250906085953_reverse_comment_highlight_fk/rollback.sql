-- ROLLBACK MIGRATION - Reverses the FK relationship back to original
-- Run this if you need to undo the FK reversal

BEGIN;

-- Step 1: Add highlightId back to EvaluationComment
ALTER TABLE "EvaluationComment" 
ADD COLUMN IF NOT EXISTS "highlightId" TEXT;

-- Step 2: Populate highlightId from the reversed relationship
UPDATE "EvaluationComment" c
SET "highlightId" = h.id
FROM "EvaluationHighlight" h
WHERE h."commentId" = c.id
AND c."highlightId" IS NULL;

-- Step 3: Check for comments without highlights (these would become orphaned)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count 
    FROM "EvaluationComment" 
    WHERE "highlightId" IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE WARNING 'Found % comments without highlights', orphan_count;
        -- You may want to handle these specially
    END IF;
END $$;

-- Step 4: Add UNIQUE constraint to highlightId
ALTER TABLE "EvaluationComment"
ADD CONSTRAINT "EvaluationComment_highlightId_key" UNIQUE ("highlightId");

-- Step 5: Add foreign key constraint (without CASCADE to match original)
ALTER TABLE "EvaluationComment"
ADD CONSTRAINT "EvaluationComment_highlightId_fkey" 
FOREIGN KEY ("highlightId") 
REFERENCES "EvaluationHighlight"("id") 
ON UPDATE CASCADE;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS "EvaluationComment_highlightId_idx" 
ON "EvaluationComment"("highlightId");

-- Step 7: Drop the new constraints and column from EvaluationHighlight
ALTER TABLE "EvaluationHighlight" 
DROP CONSTRAINT IF EXISTS "EvaluationHighlight_commentId_fkey";

DROP INDEX IF EXISTS "EvaluationHighlight_commentId_idx";

ALTER TABLE "EvaluationHighlight"
DROP CONSTRAINT IF EXISTS "EvaluationHighlight_commentId_key";

ALTER TABLE "EvaluationHighlight" 
DROP COLUMN IF EXISTS "commentId";

-- Verify the rollback succeeded
DO $$
DECLARE
    comment_has_highlight BOOLEAN;
    highlight_has_comment BOOLEAN;
BEGIN
    -- Check that highlightId column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationComment' 
        AND column_name = 'highlightId'
    ) INTO comment_has_highlight;
    
    -- Check that commentId column is gone
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationHighlight' 
        AND column_name = 'commentId'
    ) INTO highlight_has_comment;
    
    IF NOT comment_has_highlight THEN
        RAISE EXCEPTION 'Rollback failed: highlightId not restored on EvaluationComment';
    END IF;
    
    IF highlight_has_comment THEN
        RAISE EXCEPTION 'Rollback failed: commentId still exists on EvaluationHighlight';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully';
END $$;

COMMIT;