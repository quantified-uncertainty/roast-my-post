-- CreateTable
CREATE TABLE "SystemPause" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,

    CONSTRAINT "SystemPause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemPause_endedAt_idx" ON "SystemPause"("endedAt");
