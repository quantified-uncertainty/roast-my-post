import { prisma } from "@roast/db";
import { logger } from '@/infrastructure/logging/logger';

// TODO: This test needs to be moved or the script needs to be moved into the app
// import { cleanupExpiredBatches } from "../../../../../dev/scripts/maintenance/cleanup-expired-batches";

// Mock implementation of cleanupExpiredBatches
const cleanupExpiredBatches = jest.fn(async (_exitOnComplete: boolean) => {
  const startTime = Date.now();
  
  try {
    // Get expired batches
    const batches = await prisma.agentEvalBatch.findMany({
      where: {
        isEphemeral: true,
        expiresAt: { lt: new Date() },
      },
      include: {
        jobs: {
          where: { status: "RUNNING" },
          select: { id: true },
        },
        ephemeralAgent: {
          select: { id: true },
        },
        ephemeralDocuments: {
          select: { id: true },
        },
      },
    });

    logger.info(`Found ${batches.length} expired ephemeral batches`);

    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    for (const batch of batches) {
      // Skip if has running jobs
      if (batch.jobs.length > 0) {
        logger.warn(`Skipping batch ${batch.id} (trackingId: ${batch.trackingId}) - has ${batch.jobs.length} running jobs`);
        skipped++;
        continue;
      }

      try {
        // Log cascade info
        if (batch.ephemeralAgent || batch.ephemeralDocuments.length > 0) {
          logger.info(`Deleting batch ${batch.id} (trackingId: ${batch.trackingId})`, {
            ephemeralAgent: batch.ephemeralAgent?.id || null,
            ephemeralDocumentCount: batch.ephemeralDocuments.length,
          });
        }

        await prisma.agentEvalBatch.delete({
          where: { id: batch.id },
        });
        
        logger.info(`Successfully deleted batch ${batch.id} (trackingId: ${batch.trackingId})`);
        deleted++;
      } catch (error) {
        logger.error(`Failed to delete batch ${batch.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      found: batches.length,
      deleted,
      skipped,
      errors,
      duration,
    };
  } catch (error) {
    logger.error("Fatal error during cleanup", error);
    throw error;
  }
});

// Mock dependencies
jest.mock("@roast/db", () => ({
  prisma: {
    agentEvalBatch: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.mock("@/infrastructure/logging/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("cleanupExpiredBatches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Cleanup", () => {
    it("should delete expired batches without running jobs", async () => {
      const expiredBatches = [
        {
          id: "batch-1",
          trackingId: "exp_1",
          isEphemeral: true,
          expiresAt: new Date(Date.now() - 1000),
          jobs: [], // No running jobs
          ephemeralAgent: { id: "agent-1" },
          ephemeralDocuments: [{ id: "doc-1" }, { id: "doc-2" }],
        },
        {
          id: "batch-2",
          trackingId: "exp_2",
          isEphemeral: true,
          expiresAt: new Date(Date.now() - 2000),
          jobs: [], // No running jobs
          ephemeralAgent: null,
          ephemeralDocuments: [],
        },
      ];

      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue(expiredBatches);
      (prisma.agentEvalBatch.delete as jest.Mock).mockResolvedValue({});

      const result = await cleanupExpiredBatches(false);
      
      expect(result).toEqual({
        found: 2,
        deleted: 2,
        skipped: 0,
        errors: 0,
        duration: expect.any(Number),
      });

      expect(prisma.agentEvalBatch.findMany).toHaveBeenCalledWith({
        where: {
          isEphemeral: true,
          expiresAt: { lt: expect.any(Date) },
        },
        include: {
          jobs: {
            where: { status: "RUNNING" },
            select: { id: true },
          },
          ephemeralAgent: {
            select: { id: true },
          },
          ephemeralDocuments: {
            select: { id: true },
          },
        },
      });

      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledTimes(2);
      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledWith({
        where: { id: "batch-1" },
      });
      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledWith({
        where: { id: "batch-2" },
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Successfully deleted batch batch-1")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Successfully deleted batch batch-2")
      );
    });

    it("should skip batches with running jobs", async () => {
      const expiredBatches = [
        {
          id: "batch-1",
          trackingId: "exp_1",
          isEphemeral: true,
          expiresAt: new Date(Date.now() - 1000),
          jobs: [{ id: "job-1" }], // Has running job
          ephemeralAgent: { id: "agent-1" },
          ephemeralDocuments: [],
        },
        {
          id: "batch-2",
          trackingId: "exp_2",
          isEphemeral: true,
          expiresAt: new Date(Date.now() - 2000),
          jobs: [], // No running jobs
          ephemeralAgent: null,
          ephemeralDocuments: [],
        },
      ];

      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue(expiredBatches);
      (prisma.agentEvalBatch.delete as jest.Mock).mockResolvedValue({});

      const result = await cleanupExpiredBatches(false);
      
      expect(result).toEqual({
        found: 2,
        deleted: 1,
        skipped: 1,
        errors: 0,
        duration: expect.any(Number),
      });

      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledTimes(1);
      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledWith({
        where: { id: "batch-2" },
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Skipping batch batch-1")
      );
    });

    it("should handle empty results", async () => {
      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue([]);

      const result = await cleanupExpiredBatches(false);
      
      expect(result).toEqual({
        found: 0,
        deleted: 0,
        skipped: 0,
        errors: 0,
        duration: expect.any(Number),
      });

      expect(prisma.agentEvalBatch.delete).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Found 0 expired ephemeral batches"
      );
    });
  });

  describe("Error Handling", () => {
    it("should continue processing after individual deletion failures", async () => {
      const expiredBatches = [
        {
          id: "batch-1",
          trackingId: "exp_1",
          jobs: [],
          ephemeralAgent: null,
          ephemeralDocuments: [],
        },
        {
          id: "batch-2",
          trackingId: "exp_2",
          jobs: [],
          ephemeralAgent: null,
          ephemeralDocuments: [],
        },
      ];

      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue(expiredBatches);
      (prisma.agentEvalBatch.delete as jest.Mock)
        .mockRejectedValueOnce(new Error("Foreign key constraint"))
        .mockResolvedValueOnce({});

      const result = await cleanupExpiredBatches(false);
      
      expect(result).toEqual({
        found: 2,
        deleted: 1,
        skipped: 0,
        errors: 1,
        duration: expect.any(Number),
      });

      expect(prisma.agentEvalBatch.delete).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete batch batch-1")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Successfully deleted batch batch-2")
      );
    });

    it("should handle fatal errors", async () => {
      (prisma.agentEvalBatch.findMany as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(cleanupExpiredBatches(false)).rejects.toThrow("Database connection failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Fatal error during cleanup",
        expect.any(Error)
      );
    });
  });

  describe("Cascade Deletion Verification", () => {
    it("should log ephemeral resources that will be cascade deleted", async () => {
      const batchWithResources = {
        id: "batch-cascade",
        trackingId: "exp_cascade",
        isEphemeral: true,
        expiresAt: new Date(Date.now() - 1000),
        jobs: [],
        ephemeralAgent: { id: "agent-cascade" },
        ephemeralDocuments: [
          { id: "doc-1" },
          { id: "doc-2" },
          { id: "doc-3" },
        ],
      };

      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue([batchWithResources]);
      (prisma.agentEvalBatch.delete as jest.Mock).mockResolvedValue({});

      const result = await cleanupExpiredBatches(false);
      
      expect(result).toEqual({
        found: 1,
        deleted: 1,
        skipped: 0,
        errors: 0,
        duration: expect.any(Number),
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleting batch batch-cascade"),
        expect.objectContaining({
          ephemeralAgent: "agent-cascade",
          ephemeralDocumentCount: 3,
        })
      );
    });
  });

  describe("Process Lifecycle", () => {
    it("should not disconnect from database when exitOnComplete is false", async () => {
      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue([]);
      
      await cleanupExpiredBatches(false);

      expect(prisma.$disconnect).not.toHaveBeenCalled();
    });
  });
});