-- CreateTable
CREATE TABLE "public"."FallacyCheckerProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FallacyCheckerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FallacyCheckerProfile_agentId_idx" ON "public"."FallacyCheckerProfile"("agentId");

-- CreateIndex
CREATE INDEX "FallacyCheckerProfile_isDefault_idx" ON "public"."FallacyCheckerProfile"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "FallacyCheckerProfile_agentId_name_key" ON "public"."FallacyCheckerProfile"("agentId", "name");
