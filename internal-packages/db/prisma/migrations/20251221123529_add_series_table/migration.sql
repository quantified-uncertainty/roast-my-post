-- AlterTable
ALTER TABLE "public"."AgentEvalBatch" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "public"."Series" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Series_documentId_idx" ON "public"."Series"("documentId");

-- CreateIndex
CREATE INDEX "Series_createdAt_idx" ON "public"."Series"("createdAt");

-- CreateIndex
CREATE INDEX "AgentEvalBatch_seriesId_idx" ON "public"."AgentEvalBatch"("seriesId");

-- AddForeignKey
ALTER TABLE "public"."AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Series" ADD CONSTRAINT "Series_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
