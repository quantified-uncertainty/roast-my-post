-- Add retry tracking to Job table
ALTER TABLE "Job" ADD COLUMN "originalJobId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Job" ADD CONSTRAINT "Job_originalJobId_fkey" 
  FOREIGN KEY ("originalJobId") REFERENCES "Job"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "Job_originalJobId_idx" ON "Job"("originalJobId");

-- Update existing jobs to have NULL originalJobId (they are all original jobs)
UPDATE "Job" SET "originalJobId" = NULL WHERE "originalJobId" IS NULL;