-- AlterTable: Remove UUID default from id column to match document pattern
ALTER TABLE "public"."ClaimEvaluation" ALTER COLUMN "id" DROP DEFAULT;
