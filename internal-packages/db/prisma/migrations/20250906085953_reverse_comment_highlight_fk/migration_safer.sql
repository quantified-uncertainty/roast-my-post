-- SAFER VERSION WITH TRANSACTION SUPPORT
-- Note: Some DDL operations in PostgreSQL cannot be rolled back even in a transaction
-- This version minimizes the risk window

BEGIN;

-- Step 1: Add commentId column (safe, additive)
ALTER TABLE "EvaluationHighlight" 
ADD COLUMN IF NOT EXISTS "commentId" TEXT;

-- Step 2: Populate commentId from existing relationships
-- This preserves all data relationships
UPDATE "EvaluationHighlight" h
SET "commentId" = c.id
FROM "EvaluationComment" c
WHERE c."highlightId" = h.id
AND h."commentId" IS NULL;

-- Step 3: Backup orphaned highlights before deletion
-- (In production, consider creating a backup table instead)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count 
    FROM "EvaluationHighlight" 
    WHERE "commentId" IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned highlights that will be deleted', orphan_count;
        -- In production, you might want to:
        -- CREATE TABLE orphaned_highlights_backup AS 
        -- SELECT * FROM "EvaluationHighlight" WHERE "commentId" IS NULL;
    END IF;
END $$;

-- Step 4: Delete orphaned highlights
DELETE FROM "EvaluationHighlight" WHERE "commentId" IS NULL;

-- Step 5: Add constraints to new column
ALTER TABLE "EvaluationHighlight" 
ALTER COLUMN "commentId" SET NOT NULL;

ALTER TABLE "EvaluationHighlight"
ADD CONSTRAINT "EvaluationHighlight_commentId_key" UNIQUE ("commentId");

-- Step 6: Add foreign key with CASCADE
ALTER TABLE "EvaluationHighlight"
ADD CONSTRAINT "EvaluationHighlight_commentId_fkey" 
FOREIGN KEY ("commentId") 
REFERENCES "EvaluationComment"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS "EvaluationHighlight_commentId_idx" 
ON "EvaluationHighlight"("commentId");

-- Step 8: Drop old constraints and column
-- This is the most dangerous step - do it last
ALTER TABLE "EvaluationComment" 
DROP CONSTRAINT IF EXISTS "EvaluationComment_highlightId_fkey";

DROP INDEX IF EXISTS "EvaluationComment_highlightId_idx";
DROP INDEX IF EXISTS "EvaluationComment_highlightId_key";

ALTER TABLE "EvaluationComment" 
DROP COLUMN IF EXISTS "highlightId";

-- Verify the migration succeeded
DO $$
DECLARE
    comment_has_highlight BOOLEAN;
    highlight_has_comment BOOLEAN;
BEGIN
    -- Check that highlightId column is gone
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationComment' 
        AND column_name = 'highlightId'
    ) INTO comment_has_highlight;
    
    -- Check that commentId column exists and is NOT NULL
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationHighlight' 
        AND column_name = 'commentId'
        AND is_nullable = 'NO'
    ) INTO highlight_has_comment;
    
    IF comment_has_highlight THEN
        RAISE EXCEPTION 'Migration failed: highlightId still exists on EvaluationComment';
    END IF;
    
    IF NOT highlight_has_comment THEN
        RAISE EXCEPTION 'Migration failed: commentId not properly set on EvaluationHighlight';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

COMMIT;