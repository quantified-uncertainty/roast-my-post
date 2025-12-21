-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_seriesId_fkey";

-- DropIndex
DROP INDEX "public"."Job_seriesId_idx";

-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "seriesId";

-- CreateTable
CREATE TABLE "public"."SeriesRun" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeriesRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeriesRun_jobId_key" ON "public"."SeriesRun"("jobId");

-- CreateIndex
CREATE INDEX "SeriesRun_seriesId_idx" ON "public"."SeriesRun"("seriesId");

-- AddForeignKey
ALTER TABLE "public"."SeriesRun" ADD CONSTRAINT "SeriesRun_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeriesRun" ADD CONSTRAINT "SeriesRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
