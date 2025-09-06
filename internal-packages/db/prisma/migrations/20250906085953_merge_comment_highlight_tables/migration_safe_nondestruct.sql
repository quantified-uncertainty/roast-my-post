-- SAFE NON-DESTRUCTIVE MIGRATION: Copy highlight data to EvaluationComment
-- Phase 1: Add columns and copy data WITHOUT dropping the original table
-- This allows testing and rollback without data loss

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
        RAISE NOTICE 'Migration already applied - highlight columns exist and are NOT NULL';
        RETURN;
    END IF;
END $$;

-- Step 1: Add highlight columns to EvaluationComment (if they don't exist)
ALTER TABLE "EvaluationComment" 
ADD COLUMN IF NOT EXISTS "highlightStartOffset" INTEGER,
ADD COLUMN IF NOT EXISTS "highlightEndOffset" INTEGER,
ADD COLUMN IF NOT EXISTS "highlightPrefix" TEXT,
ADD COLUMN IF NOT EXISTS "highlightQuotedText" TEXT,
ADD COLUMN IF NOT EXISTS "highlightIsValid" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "highlightError" TEXT;

-- Step 2: Validate data before migration
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
        RAISE WARNING 'Found % orphaned comments with invalid highlightId - will handle gracefully', orphaned_comments;
    END IF;
    
    RAISE NOTICE 'Pre-migration: % comments with highlights, % highlight records', comment_count, highlight_count;
END $$;

-- Step 3: Copy data from EvaluationHighlight to EvaluationComment
-- This DUPLICATES the data - original remains intact
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

-- Step 4: Handle comments without highlights (set default values)
UPDATE "EvaluationComment"
SET 
    "highlightStartOffset" = COALESCE("highlightStartOffset", 0),
    "highlightEndOffset" = COALESCE("highlightEndOffset", 0),
    "highlightQuotedText" = COALESCE("highlightQuotedText", ''),
    "highlightIsValid" = COALESCE("highlightIsValid", false),
    "highlightError" = CASE 
        WHEN "highlightId" IS NULL THEN 'No highlight data'
        WHEN "highlightStartOffset" IS NULL THEN 'Orphaned highlight reference'
        ELSE "highlightError"
    END
WHERE "highlightStartOffset" IS NULL;

-- Step 5: Comprehensive data validation before applying constraints
DO $$
DECLARE
    null_count INTEGER;
    invalid_offsets INTEGER;
    migrated_count INTEGER;
    total_comments INTEGER;
BEGIN
    -- Check for NULL values after migration
    SELECT COUNT(*) INTO null_count 
    FROM "EvaluationComment" 
    WHERE "highlightStartOffset" IS NULL 
       OR "highlightEndOffset" IS NULL 
       OR "highlightQuotedText" IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Found % comments with NULL highlight fields after migration', null_count;
    END IF;
    
    -- Check for invalid offsets
    SELECT COUNT(*) INTO invalid_offsets 
    FROM "EvaluationComment"
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
            "highlightError" = COALESCE("highlightError", '') || ' [Invalid offsets fixed during migration]'
        WHERE "highlightStartOffset" > "highlightEndOffset" 
           OR "highlightStartOffset" < 0
           OR "highlightEndOffset" < 0;
    END IF;
    
    -- Final count verification
    SELECT COUNT(*) INTO migrated_count 
    FROM "EvaluationComment" 
    WHERE "highlightQuotedText" != '';
    
    SELECT COUNT(*) INTO total_comments FROM "EvaluationComment";
    
    RAISE NOTICE 'Migration complete: % of % comments have highlight data', migrated_count, total_comments;
END $$;

-- Step 6: Apply NOT NULL constraints only after validation passes
ALTER TABLE "EvaluationComment"
ALTER COLUMN "highlightStartOffset" SET NOT NULL,
ALTER COLUMN "highlightEndOffset" SET NOT NULL,
ALTER COLUMN "highlightQuotedText" SET NOT NULL,
ALTER COLUMN "highlightIsValid" SET NOT NULL;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS "EvaluationComment_highlightStartOffset_idx" 
ON "EvaluationComment"("highlightStartOffset");

CREATE INDEX IF NOT EXISTS "EvaluationComment_highlightEndOffset_idx" 
ON "EvaluationComment"("highlightEndOffset");

-- Step 8: Verification and summary
DO $$
DECLARE
    original_count INTEGER;
    migrated_count INTEGER;
    comment_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_count FROM "EvaluationHighlight";
    SELECT COUNT(*) INTO migrated_count 
    FROM "EvaluationComment" 
    WHERE "highlightIsValid" = true AND "highlightQuotedText" != '';
    SELECT COUNT(*) INTO comment_total FROM "EvaluationComment";
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATION COMPLETED (NON-DESTRUCTIVE)';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Original highlights preserved: %', original_count;
    RAISE NOTICE 'Comments with valid highlights: %', migrated_count;
    RAISE NOTICE 'Total comments: %', comment_total;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: EvaluationHighlight table still exists!';
    RAISE NOTICE 'Foreign key from EvaluationComment still intact!';
    RAISE NOTICE 'Both old and new structures are working.';
    RAISE NOTICE '';
    RAISE NOTICE 'To complete migration later, run:';
    RAISE NOTICE '  migration_phase2_cleanup.sql';
    RAISE NOTICE '===========================================';
END $$;

COMMIT;

-- NOTE: We are NOT dropping the EvaluationHighlight table
-- NOTE: We are NOT dropping the highlightId column
-- NOTE: We are NOT dropping the foreign key constraint
-- This allows the application to work with BOTH structures during transition