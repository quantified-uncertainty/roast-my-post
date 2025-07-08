import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
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
}));

jest.mock("@/lib/auth-helpers", () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
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
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          agent: {
            findUnique: jest.fn().mockResolvedValue(mockAgent),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue(mockBatch),
          },
        });
      });

      const response = await POST(mockRequest({
        agentId: "agent-123",
        targetCount: 10,
        name: "Test Batch",
      }));
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe("batch-123");
    });
  });

  describe("Ephemeral Batch Creation", () => {
    it("should create ephemeral batch with new agent", async () => {
      const mockBatch = {
        id: "batch-123",
        isEphemeral: true,
        trackingId: "test-experiment",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            create: jest.fn().mockResolvedValue({ id: "exp_agent_123" }),
          },
          agentVersion: {
            create: jest.fn().mockResolvedValue({ id: "version-123" }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue(mockBatch),
          },
          agent: {
            update: jest.fn(),
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
      
      expect(response.status).toBe(200);
      expect(data.isEphemeral).toBe(true);
      expect(data.trackingId).toBe("test-experiment");
    });

    it("should create ephemeral documents from URLs", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123" }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue({ 
              id: "batch-123",
              isEphemeral: true,
            }),
          },
          document: {
            create: jest.fn().mockResolvedValue({ id: "doc-123" }),
          },
          documentVersion: {
            create: jest.fn().mockResolvedValue({ id: "version-123" }),
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
      
      expect(response.status).toBe(200);
      expect(data.isEphemeral).toBe(true);
    });

    it("should create ephemeral documents from inline content", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123" }),
          },
          agentEvalBatch: {
            create: jest.fn().mockResolvedValue({ 
              id: "batch-123",
              isEphemeral: true,
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
      
      expect(response.status).toBe(200);
      expect(data.isEphemeral).toBe(true);
    });

    it("should auto-generate trackingId if not provided", async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          agent: {
            findUnique: jest.fn().mockResolvedValue({ id: "agent-123" }),
          },
          agentEvalBatch: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: "batch-123",
              ...data,
            })),
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
      
      expect(response.status).toBe(200);
      expect(data.trackingId).toMatch(/^exp_/); // Should start with exp_
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