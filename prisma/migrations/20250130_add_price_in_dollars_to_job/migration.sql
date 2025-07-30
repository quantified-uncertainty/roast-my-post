-- AlterTable
ALTER TABLE "Job" ADD COLUMN "priceInDollars" DECIMAL(10,6);

-- Migrate existing data from costInCents to priceInDollars
UPDATE "Job" 
SET "priceInDollars" = CAST("costInCents" AS DECIMAL) / 100 
WHERE "costInCents" IS NOT NULL;