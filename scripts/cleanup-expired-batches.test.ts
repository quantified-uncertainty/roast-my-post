import { cleanupExpiredBatches } from "./cleanup-expired-batches";
import { prisma } from "../src/lib/prisma";
import { logger } from "../src/lib/logger";

// Mock dependencies
jest.mock("../src/lib/prisma", () => ({
  prisma: {
    agentEvalBatch: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.mock("../src/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock process.exit
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`Process.exit(${code})`);
});

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(0)");

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(0)");

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(0)");

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(1)");

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(1)");

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

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(0)");

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
    it("should disconnect from database on completion", async () => {
      (prisma.agentEvalBatch.findMany as jest.Mock).mockResolvedValue([]);

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(0)");

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it("should disconnect from database on error", async () => {
      (prisma.agentEvalBatch.findMany as jest.Mock).mockRejectedValue(
        new Error("Test error")
      );

      await expect(cleanupExpiredBatches()).rejects.toThrow("Process.exit(1)");

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});