import { POST } from "./route";
import { prisma } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@roast/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    agentEvalBatch: {
      create: jest.fn(),
    },
    agent: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    agentVersion: {
      create: jest.fn(),
    },
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
    },
    job: {
      createMany: jest.fn(),
    },
  },
  generateId: jest.fn((length = 21) => {
    // Generate a mock ID similar to what our real function would produce
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

jest.mock("@/infrastructure/auth/auth-helpers", () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock("@/infrastructure/logging/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/application/services/ServiceFactory", () => ({
  getServices: jest.fn(() => ({
    createTransactionalServices: jest.fn(() => ({
      jobService: {
        createJob: jest.fn().mockResolvedValue({ id: "job-123" }),
      },
    })),
  })),
}));

describe("/api/batches POST", () => {
  const mockUserId = "user-123";
  const mockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateRequest as jest.Mock).mockResolvedValue(mockUserId);
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue(null);
      
      const response = await POST(mockRequest({}));
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Validation", () => {
    it("should reject request without agentId or ephemeralAgent", async () => {
      const response = await POST(mockRequest({
        targetCount: 5,
      }));
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("Must specify either agentId or ephemeralAgent");
    });

    it("should reject invalid ephemeral agent data", async () => {
      const response = await POST(mockRequest({
        ephemeralAgent: {
          // Missing required fields
          name: "",
        },
      }));
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should reject expiresInDays outside valid range", async () => {
      const response = await POST(mockRequest({
        agentId: "agent-123",
        isEphemeral: true,
        expiresInDays: 100, // Max is 90
      }));
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });
  });

  describe("Regular Batch Creation", () => {
    it("should create a regular batch with existing agent", async () => {
      const mockAgent = { id: "agent-123", submittedById: mockUserId };
      const mockBatch = { 
        id: "batch-123",
        agentId: "agent-123",
        userId: mockUserId,
        isEphemeral: false,
        trackingId: null,
        expiresAt: null,
        agent: {
          id: "agent-123",
          ephemeralBatchId: null,
        },
        _count: {
          jobs: 10,
          ephemeralDocuments: 0,
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          agent: {
            findUnique: jest.fn().mockResolvedValue(mockAgent),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue(mockBatch),
            findUnique: jest.fn().mockResolvedValue(mockBatch),
          },
          document: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          evaluation: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "eval-123" }),
          },
          job: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const response = await POST(mockRequest({
        agentId: "agent-123",
        targetCount: 10,
        name: "Test Batch",
      }));
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.batch.id).toBe("batch-123");
      expect(data.batch.jobCount).toBe(10);
      expect(data.agent.id).toBe("agent-123");
      expect(data.agent.isEphemeral).toBe(false);
    });
  });

  describe("Ephemeral Batch Creation", () => {
    it("should create ephemeral batch with new agent", async () => {
      const mockBatch = {
        id: "batch-123",
        isEphemeral: true,
        trackingId: "test-experiment",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        agent: {
          id: "exp_agent_123",
          ephemeralBatchId: "batch-123",
        },
        _count: {
          jobs: 0,
          ephemeralDocuments: 0,
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            create: jest.fn().mockResolvedValue({ id: "exp_agent_123" }),
            update: jest.fn().mockResolvedValue({ id: "exp_agent_123", ephemeralBatchId: "batch-123" }),
          },
          agentVersion: {
            create: jest.fn().mockResolvedValue({ id: "version-123" }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue(mockBatch),
            findUnique: jest.fn().mockResolvedValue(mockBatch),
          },
          evaluation: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "eval-123" }),
          },
          job: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await POST(mockRequest({
        ephemeralAgent: {
          name: "Test Agent",
          primaryInstructions: "Test instructions",
          description: "Test description",
        },
        trackingId: "test-experiment",
        description: "Test experiment",
        isEphemeral: true,
        expiresInDays: 7,
      }));
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.batch.isEphemeral).toBe(true);
      expect(data.batch.trackingId).toBe("test-experiment");
      expect(data.batch.jobCount).toBe(0);
      expect(data.agent.id).toBe("exp_agent_123");
      expect(data.agent.isEphemeral).toBe(true);
    });

    // Skipped: URL import for ephemeral documents is not yet implemented in the API
    it.skip("should create ephemeral documents from URLs - not implemented", async () => {
      const mockBatch = { 
        id: "batch-123",
        isEphemeral: true,
        trackingId: "exp_generated",
        agent: {
          id: "agent-123",
          ephemeralBatchId: null,
        },
        _count: {
          jobs: 2,
          ephemeralDocuments: 2,
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123", submittedById: mockUserId }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue(mockBatch),
            findUnique: jest.fn().mockResolvedValue(mockBatch),
          },
          document: {
            create: jest.fn().mockResolvedValue({ id: "doc-123" }),
          },
          documentVersion: {
            create: jest.fn().mockResolvedValue({ id: "version-123" }),
          },
          evaluation: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "eval-123" }),
          },
          job: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const response = await POST(mockRequest({
        agentId: "agent-123",
        isEphemeral: true,
        ephemeralDocuments: {
          urls: ["https://example.com/article1", "https://example.com/article2"],
        },
      }));
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.batch.isEphemeral).toBe(true);
      expect(data.batch.jobCount).toBe(2);
      expect(data.agent.isEphemeral).toBe(false);
    });

    it("should create ephemeral documents from inline content", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123", submittedById: mockUserId }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue({ 
              id: "batch-123",
              isEphemeral: true,
            }),
            findUnique: jest.fn().mockResolvedValue({ 
              id: "batch-123",
              isEphemeral: true,
              agent: { id: "agent-123" },
              _count: { jobs: 0, ephemeralDocuments: 1 },
            }),
          },
          document: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `doc_${data.id.split('_')[2]}`,
              ...data,
            })),
          },
          documentVersion: {
            create: jest.fn().mockResolvedValue({ id: "version-123" }),
          },
          evaluation: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "eval-123" }),
          },
          job: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const response = await POST(mockRequest({
        agentId: "agent-123",
        isEphemeral: true,
        ephemeralDocuments: {
          inline: [
            {
              title: "Test Document 1",
              content: "This is test content",
              author: "Test Author",
            },
          ],
        },
      }));
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.batch.isEphemeral).toBe(true);
      expect(data.agent).toBeDefined();
    });

    it("should auto-generate trackingId if not provided", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123", submittedById: mockUserId }),
          },
          agentEvalBatch: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: "batch-123",
              ...data,
            })),
            findUnique: jest.fn().mockResolvedValue({
              id: "batch-123",
              isEphemeral: true,
              trackingId: "exp_12345678",
              agent: { id: "agent-123" },
              _count: { jobs: 0, ephemeralDocuments: 0 },
            }),
          },
        };
        return callback(tx);
      });

      const response = await POST(mockRequest({
        agentId: "agent-123",
        isEphemeral: true,
        // No trackingId provided
      }));
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.batch.trackingId).toMatch(/^exp_/); // Should start with exp_
      expect(data.batch.isEphemeral).toBe(true);
      expect(data.agent).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle transaction failures", async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await POST(mockRequest({
        agentId: "agent-123",
      }));
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create batch");
    });

    it("should handle agent not found", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          agent: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      const response = await POST(mockRequest({
        agentId: "non-existent",
      }));
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Agent not found");
    });
  });
});