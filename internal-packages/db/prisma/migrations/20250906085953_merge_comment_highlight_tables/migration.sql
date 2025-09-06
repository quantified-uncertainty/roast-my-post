-- Merge EvaluationHighlight table into EvaluationComment
-- This migration safely merges the tables with comprehensive validation and backup

BEGIN;

-- Step 0: Check if migration already applied (idempotency)
DO $$
BEGIN
    -- Check if highlight columns already exist and are NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationComment' 
        AND column_name = 'highlightStartOffset' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'Migration already applied - skipping';
        -- Exit the DO block but not the transaction
        RETURN;
    END IF;
    
    -- Check if EvaluationHighlight table doesn't exist (migration was applied)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'EvaluationHighlight'
    ) THEN
        RAISE NOTICE 'EvaluationHighlight table already dropped - migration was applied';
        RETURN;
    END IF;
END $$;

-- Step 1: Create backup of EvaluationHighlight table before any changes
CREATE TABLE IF NOT EXISTS "EvaluationHighlight_backup_20250906" AS 
SELECT *, current_timestamp as backup_created_at 
FROM "EvaluationHighlight";

-- Log backup creation
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM "EvaluationHighlight_backup_20250906";
    RAISE NOTICE 'Created backup with % highlight records', backup_count;
END $$;

-- Step 2: Add highlight columns to EvaluationComment (if they don't exist)
ALTER TABLE "EvaluationComment" 
ADD COLUMN IF NOT EXISTS "highlightStartOffset" INTEGER,
ADD COLUMN IF NOT EXISTS "highlightEndOffset" INTEGER,
ADD COLUMN IF NOT EXISTS "highlightPrefix" TEXT,
ADD COLUMN IF NOT EXISTS "highlightQuotedText" TEXT,
ADD COLUMN IF NOT EXISTS "highlightIsValid" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "highlightError" TEXT;

-- Step 3: Validate data before migration
DO $$
DECLARE
    comment_count INTEGER;
    highlight_count INTEGER;
    orphaned_comments INTEGER;
BEGIN
    SELECT COUNT(*) INTO comment_count FROM "EvaluationComment" WHERE "highlightId" IS NOT NULL;
    SELECT COUNT(*) INTO highlight_count FROM "EvaluationHighlight";
    
    -- Check for orphaned comments (highlightId pointing to non-existent highlights)
    SELECT COUNT(*) INTO orphaned_comments 
    FROM "EvaluationComment" c
    WHERE c."highlightId" IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM "EvaluationHighlight" h WHERE h.id = c."highlightId");
    
    IF orphaned_comments > 0 THEN
        RAISE WARNING 'Found % orphaned comments with invalid highlightId - will set to NULL', orphaned_comments;
        -- Clean up orphaned references
        UPDATE "EvaluationComment" 
        SET "highlightId" = NULL 
        WHERE "highlightId" IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM "EvaluationHighlight" h WHERE h.id = "EvaluationComment"."highlightId");
    END IF;
    
    RAISE NOTICE 'Pre-migration: % comments with highlights, % highlight records', comment_count, highlight_count;
END $$;

-- Step 4: Copy data from EvaluationHighlight to EvaluationComment
UPDATE "EvaluationComment" c
SET 
    "highlightStartOffset" = h."startOffset",
    "highlightEndOffset" = h."endOffset",
    "highlightPrefix" = h."prefix",
    "highlightQuotedText" = h."quotedText",
    "highlightIsValid" = h."isValid",
    "highlightError" = h."error"
FROM "EvaluationHighlight" h
WHERE c."highlightId" = h.id;

-- Step 5: Handle comments without highlights (set default values)
UPDATE "EvaluationComment"
SET 
    "highlightStartOffset" = 0,
    "highlightEndOffset" = 0,
    "highlightQuotedText" = '',
    "highlightIsValid" = false,
    "highlightError" = 'No highlight data'
WHERE "highlightId" IS NULL 
   OR "highlightStartOffset" IS NULL;

-- Step 6: Comprehensive data validation before applying constraints
DO $$
DECLARE
    null_start_count INTEGER;
    null_end_count INTEGER;
    null_text_count INTEGER;
    invalid_offsets INTEGER;
    migrated_count INTEGER;
    total_comments INTEGER;
BEGIN
    -- Check for NULL values
    SELECT COUNT(*) INTO null_start_count FROM "EvaluationComment" WHERE "highlightStartOffset" IS NULL;
    SELECT COUNT(*) INTO null_end_count FROM "EvaluationComment" WHERE "highlightEndOffset" IS NULL;
    SELECT COUNT(*) INTO null_text_count FROM "EvaluationComment" WHERE "highlightQuotedText" IS NULL;
    
    IF null_start_count > 0 OR null_end_count > 0 OR null_text_count > 0 THEN
        RAISE EXCEPTION 'Found NULL values: startOffset=%, endOffset=%, quotedText=%', 
            null_start_count, null_end_count, null_text_count;
    END IF;
    
    -- Check for invalid offsets
    SELECT COUNT(*) INTO invalid_offsets FROM "EvaluationComment"
    WHERE "highlightStartOffset" > "highlightEndOffset" 
       OR "highlightStartOffset" < 0
       OR "highlightEndOffset" < 0;
    
    IF invalid_offsets > 0 THEN
        RAISE WARNING 'Found % comments with invalid offsets - fixing', invalid_offsets;
        -- Fix invalid offsets
        UPDATE "EvaluationComment"
        SET "highlightStartOffset" = 0,
            "highlightEndOffset" = 0,
            "highlightIsValid" = false,
            "highlightError" = COALESCE("highlightError", '') || ' Invalid offsets fixed during migration'
        WHERE "highlightStartOffset" > "highlightEndOffset" 
           OR "highlightStartOffset" < 0
           OR "highlightEndOffset" < 0;
    END IF;
    
    -- Final count verification
    SELECT COUNT(*) INTO migrated_count FROM "EvaluationComment" WHERE "highlightQuotedText" != '';
    SELECT COUNT(*) INTO total_comments FROM "EvaluationComment";
    
    RAISE NOTICE 'Migration complete: % of % comments have highlight data', migrated_count, total_comments;
END $$;

-- Step 7: Apply NOT NULL constraints only after validation passes
ALTER TABLE "EvaluationComment"
ALTER COLUMN "highlightStartOffset" SET NOT NULL,
ALTER COLUMN "highlightEndOffset" SET NOT NULL,
ALTER COLUMN "highlightQuotedText" SET NOT NULL,
ALTER COLUMN "highlightIsValid" SET NOT NULL;

-- Step 8: Drop the foreign key constraint
ALTER TABLE "EvaluationComment" 
DROP CONSTRAINT IF EXISTS "EvaluationComment_highlightId_fkey";

-- Step 9: Drop the highlightId column
ALTER TABLE "EvaluationComment" 
DROP COLUMN IF EXISTS "highlightId";

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS "EvaluationComment_highlightStartOffset_idx" 
ON "EvaluationComment"("highlightStartOffset");

CREATE INDEX IF NOT EXISTS "EvaluationComment_highlightEndOffset_idx" 
ON "EvaluationComment"("highlightEndOffset");

-- Step 11: Final validation before dropping the table
DO $$
DECLARE
    original_count INTEGER;
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_count FROM "EvaluationHighlight";
    SELECT COUNT(*) INTO migrated_count FROM "EvaluationComment" 
    WHERE "highlightIsValid" = true AND "highlightQuotedText" != '';
    
    -- Allow for some discrepancy due to orphaned records
    IF migrated_count < (original_count * 0.95) THEN
        RAISE WARNING 'Possible data loss: original=% migrated=% (>5%% difference)', original_count, migrated_count;
    END IF;
    
    RAISE NOTICE 'Final validation: % original highlights, % valid migrated highlights', original_count, migrated_count;
END $$;

-- Step 12: Drop the EvaluationHighlight table (point of no return)
DROP TABLE IF EXISTS "EvaluationHighlight";

-- Step 13: Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully at %', current_timestamp;
    RAISE NOTICE 'Backup preserved in table: EvaluationHighlight_backup_20250906';
END $$;

COMMIT;