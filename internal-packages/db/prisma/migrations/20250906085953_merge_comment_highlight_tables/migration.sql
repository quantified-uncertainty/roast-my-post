-- Merge EvaluationHighlight table into EvaluationComment
-- This migration moves highlight data directly into the comment table since it's a 1:1 relationship

-- Add highlight columns to EvaluationComment
ALTER TABLE "EvaluationComment" 
ADD COLUMN "highlightStartOffset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "highlightEndOffset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "highlightPrefix" TEXT,
ADD COLUMN "highlightQuotedText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "highlightIsValid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "highlightError" TEXT;

-- Copy data from EvaluationHighlight to EvaluationComment
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

-- Remove defaults after data migration
ALTER TABLE "EvaluationComment" 
ALTER COLUMN "highlightStartOffset" DROP DEFAULT,
ALTER COLUMN "highlightEndOffset" DROP DEFAULT,
ALTER COLUMN "highlightQuotedText" DROP DEFAULT,
ALTER COLUMN "highlightIsValid" DROP DEFAULT;

-- Drop the foreign key constraint
ALTER TABLE "EvaluationComment" 
DROP CONSTRAINT IF EXISTS "EvaluationComment_highlightId_fkey";

-- Drop the unique index on highlightId
DROP INDEX IF EXISTS "EvaluationComment_highlightId_key";

-- Drop the highlightId column
ALTER TABLE "EvaluationComment" 
DROP COLUMN "highlightId";

-- Drop the EvaluationHighlight table
DROP TABLE "EvaluationHighlight";