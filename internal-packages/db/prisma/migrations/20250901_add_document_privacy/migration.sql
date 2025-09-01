-- AlterTable
ALTER TABLE "Document" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT true;

-- Update all existing documents to be private
UPDATE "Document" SET "isPrivate" = true;

-- CreateIndex
CREATE INDEX "Document_isPrivate_idx" ON "Document"("isPrivate");

-- CreateIndex
CREATE INDEX "Document_isPrivate_submittedById_idx" ON "Document"("isPrivate", "submittedById");