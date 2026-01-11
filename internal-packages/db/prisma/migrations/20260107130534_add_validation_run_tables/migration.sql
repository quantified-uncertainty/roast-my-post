-- CreateTable
CREATE TABLE "public"."ValidationRun" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "name" TEXT,
    "commitHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValidationRunSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "baselineSnapshotId" TEXT NOT NULL,
    "newEvaluationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "keptCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "lostCount" INTEGER NOT NULL DEFAULT 0,
    "comparisonData" JSONB,

    CONSTRAINT "ValidationRunSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidationRun_baselineId_idx" ON "public"."ValidationRun"("baselineId");

-- CreateIndex
CREATE INDEX "ValidationRun_createdAt_idx" ON "public"."ValidationRun"("createdAt");

-- CreateIndex
CREATE INDEX "ValidationRun_status_idx" ON "public"."ValidationRun"("status");

-- CreateIndex
CREATE INDEX "ValidationRunSnapshot_runId_idx" ON "public"."ValidationRunSnapshot"("runId");

-- CreateIndex
CREATE INDEX "ValidationRunSnapshot_baselineSnapshotId_idx" ON "public"."ValidationRunSnapshot"("baselineSnapshotId");

-- CreateIndex
CREATE INDEX "ValidationRunSnapshot_status_idx" ON "public"."ValidationRunSnapshot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationRunSnapshot_runId_baselineSnapshotId_key" ON "public"."ValidationRunSnapshot"("runId", "baselineSnapshotId");

-- AddForeignKey
ALTER TABLE "public"."ValidationRun" ADD CONSTRAINT "ValidationRun_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "public"."ValidationBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationRunSnapshot" ADD CONSTRAINT "ValidationRunSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationRunSnapshot" ADD CONSTRAINT "ValidationRunSnapshot_baselineSnapshotId_fkey" FOREIGN KEY ("baselineSnapshotId") REFERENCES "public"."ValidationBaselineSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationRunSnapshot" ADD CONSTRAINT "ValidationRunSnapshot_newEvaluationId_fkey" FOREIGN KEY ("newEvaluationId") REFERENCES "public"."EvaluationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
