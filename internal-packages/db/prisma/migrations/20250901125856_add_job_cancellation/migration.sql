-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "cancelledAt" TIMESTAMP(3),
                   ADD COLUMN "cancelledById" TEXT,
                   ADD COLUMN "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "Job_cancelledById_idx" ON "Job"("cancelledById");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;