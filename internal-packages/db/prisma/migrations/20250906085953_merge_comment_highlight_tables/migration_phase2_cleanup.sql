-- PHASE 2: CLEANUP (RUN ONLY AFTER CONFIRMING PHASE 1 WORKS)
-- This removes the old structure after validating the new one works

BEGIN;

-- Step 1: Verify Phase 1 was completed
DO $$
DECLARE
    has_columns BOOLEAN;
    has_highlight_table BOOLEAN;
    data_match_count INTEGER;
BEGIN
    -- Check that highlight columns exist and are NOT NULL
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EvaluationComment' 
        AND column_name = 'highlightStartOffset' 
        AND is_nullable = 'NO'
    ) INTO has_columns;
    
    IF NOT has_columns THEN
        RAISE EXCEPTION 'Phase 1 not completed: highlight columns not found or still nullable';
    END IF;
    
    -- Check that old table still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'EvaluationHighlight'
    ) INTO has_highlight_table;
    
    IF NOT has_highlight_table THEN
        RAISE NOTICE 'EvaluationHighlight table already removed - cleanup may have been done';
        RETURN;
    END IF;
    
    -- Verify data consistency between old and new structures
    SELECT COUNT(*) INTO data_match_count
    FROM "EvaluationComment" c
    INNER JOIN "EvaluationHighlight" h ON c."highlightId" = h.id
    WHERE c."highlightStartOffset" = h."startOffset"
      AND c."highlightEndOffset" = h."endOffset"
      AND c."highlightQuotedText" = h."quotedText";
    
    RAISE NOTICE 'Verified % matching records between old and new structures', data_match_count;
END $$;

-- Step 2: Create final backup before cleanup
CREATE TABLE IF NOT EXISTS "EvaluationHighlight_final_backup" AS 
SELECT *, current_timestamp as backup_created_at 
FROM "EvaluationHighlight";

DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM "EvaluationHighlight_final_backup";
    RAISE NOTICE 'Created final backup with % records', backup_count;
END $$;

-- Step 3: Drop the foreign key constraint
ALTER TABLE "EvaluationComment" 
DROP CONSTRAINT IF EXISTS "EvaluationComment_highlightId_fkey";

-- Step 4: Drop the unique index on highlightId
DROP INDEX IF EXISTS "EvaluationComment_highlightId_key";

-- Step 5: Drop the highlightId column
ALTER TABLE "EvaluationComment" 
DROP COLUMN IF EXISTS "highlightId";

-- Step 6: Drop the original EvaluationHighlight table
DROP TABLE IF EXISTS "EvaluationHighlight";

-- Step 7: Final summary
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'PHASE 2 CLEANUP COMPLETED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Removed: EvaluationComment.highlightId column';
    RAISE NOTICE 'Removed: Foreign key constraint';
    RAISE NOTICE 'Removed: EvaluationHighlight table';
    RAISE NOTICE '';
    RAISE NOTICE 'Backups preserved:';
    RAISE NOTICE '  - EvaluationHighlight_backup_20250906';
    RAISE NOTICE '  - EvaluationHighlight_final_backup';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration fully complete!';
    RAISE NOTICE '===========================================';
END $$;

COMMIT;