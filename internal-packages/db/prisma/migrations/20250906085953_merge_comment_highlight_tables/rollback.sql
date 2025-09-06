-- ROLLBACK MIGRATION: Restore EvaluationHighlight table from merged data
-- WARNING: This rollback can only work if the backup table exists!

BEGIN;

-- Step 0: Check if backup exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'EvaluationHighlight_backup_20250906'
    ) THEN
        RAISE EXCEPTION 'Cannot rollback: Backup table EvaluationHighlight_backup_20250906 does not exist!';
    END IF;
    
    -- Check if we're actually in the merged state
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationComment' 
        AND column_name = 'highlightStartOffset'
    ) THEN
        RAISE NOTICE 'Already rolled back - EvaluationComment does not have highlight columns';
        RETURN;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'EvaluationHighlight'
    ) THEN
        RAISE NOTICE 'EvaluationHighlight table already exists - appears to be rolled back';
        RETURN;
    END IF;
END $$;

-- Step 1: Recreate EvaluationHighlight table from backup
CREATE TABLE "EvaluationHighlight" AS 
SELECT 
    id,
    "startOffset",
    "endOffset",
    prefix,
    "quotedText",
    "isValid",
    error,
    "commentId"
FROM "EvaluationHighlight_backup_20250906";

-- Step 2: Add primary key
ALTER TABLE "EvaluationHighlight" ADD PRIMARY KEY (id);

-- Step 3: Add indexes
CREATE INDEX "EvaluationHighlight_commentId_idx" ON "EvaluationHighlight"("commentId");
CREATE UNIQUE INDEX "EvaluationHighlight_commentId_key" ON "EvaluationHighlight"("commentId");

-- Step 4: Add highlightId column back to EvaluationComment
ALTER TABLE "EvaluationComment" 
ADD COLUMN IF NOT EXISTS "highlightId" TEXT;

-- Step 5: Restore the foreign key relationships
-- Match comments with their original highlights
UPDATE "EvaluationComment" c
SET "highlightId" = h.id
FROM "EvaluationHighlight" h
WHERE h."commentId" = c.id;

-- Step 6: Add foreign key constraint
ALTER TABLE "EvaluationComment" 
ADD CONSTRAINT "EvaluationComment_highlightId_fkey" 
FOREIGN KEY ("highlightId") 
REFERENCES "EvaluationHighlight"(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Step 7: Create unique index on highlightId
CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationComment_highlightId_key" 
ON "EvaluationComment"("highlightId");

-- Step 8: Drop the merged columns from EvaluationComment
ALTER TABLE "EvaluationComment" 
DROP COLUMN IF EXISTS "highlightStartOffset",
DROP COLUMN IF EXISTS "highlightEndOffset",
DROP COLUMN IF EXISTS "highlightPrefix",
DROP COLUMN IF EXISTS "highlightQuotedText",
DROP COLUMN IF EXISTS "highlightIsValid",
DROP COLUMN IF EXISTS "highlightError";

-- Step 9: Drop indexes created by forward migration
DROP INDEX IF EXISTS "EvaluationComment_highlightStartOffset_idx";
DROP INDEX IF EXISTS "EvaluationComment_highlightEndOffset_idx";

-- Step 10: Verify restoration
DO $$
DECLARE
    highlight_count INTEGER;
    comment_with_highlight INTEGER;
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO highlight_count FROM "EvaluationHighlight";
    SELECT COUNT(*) INTO comment_with_highlight FROM "EvaluationComment" WHERE "highlightId" IS NOT NULL;
    SELECT COUNT(*) INTO backup_count FROM "EvaluationHighlight_backup_20250906";
    
    RAISE NOTICE 'Rollback complete: % highlights restored, % comments linked, % in backup', 
        highlight_count, comment_with_highlight, backup_count;
    
    IF highlight_count != backup_count THEN
        RAISE WARNING 'Highlight count mismatch: restored=% backup=%', highlight_count, backup_count;
    END IF;
END $$;

COMMIT;

-- Note: The backup table is preserved for safety
-- To fully clean up: DROP TABLE IF EXISTS "EvaluationHighlight_backup_20250906";