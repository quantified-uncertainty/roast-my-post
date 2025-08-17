-- AlterTable
ALTER TABLE "AgentVersion" ADD COLUMN     "pluginIds" TEXT[] DEFAULT ARRAY[]::TEXT[];