/*
  Warnings:

  - Added the required column `documentVersionId` to the `EvaluationVersion` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "EvaluationVersion" ADD COLUMN "documentVersionId" TEXT;

-- Update existing records to link to the latest document version
UPDATE "EvaluationVersion" ev
SET "documentVersionId" = (
    SELECT dv.id
    FROM "DocumentVersion" dv
    JOIN "Evaluation" e ON e."documentId" = dv."documentId"
    WHERE e.id = ev."evaluationId"
    ORDER BY dv.version DESC
    LIMIT 1
);

-- Add the foreign key constraint
ALTER TABLE "EvaluationVersion" ADD CONSTRAINT "EvaluationVersion_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make the column required
ALTER TABLE "EvaluationVersion" ALTER COLUMN "documentVersionId" SET NOT NULL;

-- Create index
CREATE INDEX "EvaluationVersion_documentVersionId_idx" ON "EvaluationVersion"("documentVersionId");
