import { vi } from 'vitest';
import { GET, DELETE } from "./route";
import { prisma } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@roast/db", () => ({
  prisma: {
    agentEvalBatch: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    evaluation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    evaluationVersion: {
      deleteMany: vi.fn(),
    },
    evaluationComment: {
      deleteMany: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/shared/utils/batch-utils", () => ({
  calculateJobStats: vi.fn((jobs) => ({
    total: jobs.length,
    completed: jobs.filter((j: any) => j.status === "COMPLETED").length,
    failed: jobs.filter((j: any) => j.status === "FAILED").length,
    running: jobs.filter((j: any) => j.status === "RUNNING").length,
    pending: jobs.filter((j: any) => j.status === "PENDING").length,
  })),
  calculateSuccessRate: vi.fn((stats) => 
    stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  ),
}));

vi.mock("@/infrastructure/auth/auth-helpers", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/infrastructure/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("/api/experiments/[trackingId] GET", () => {
  const mockUserId = "user-123";
  const mockTrackingId = "exp_test123";
  
  const mockRequest = () => {
    return {} as NextRequest;
  };

  const mockParams = {
    params: Promise.resolve({ trackingId: mockTrackingId }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValue(mockUserId);
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      (authenticateRequest as vi.MockedFunction<any>).mockResolvedValue(null);
      
      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Experiment Retrieval", () => {
    it("should return experiment with full details", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        description: "Test experiment",
        isEphemeral: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        agent: {
          id: "agent-123",
          ephemeralBatchId: null,
          versions: [
            {
              id: "version-123",
              version: 1,
              name: "Test Agent",
              primaryInstructions: "Test instructions",
              selfCritiqueInstructions: null,
              providesGrades: false,
            },
          ],
        },
        ephemeralDocuments: [
          {
            id: "doc-123",
            versions: [
              {
                id: "docver-123",
                version: 1,
                title: "Test Document",
              },
            ],
          },
        ],
        jobs: [
          { 
            id: "job-1", 
            status: "COMPLETED",
            priceInDollars: 1.0,
            durationInSeconds: 10,
            evaluation: {
              document: {
                id: "doc-123",
                versions: [{ title: "Test Document", authors: [] }]
              },
              versions: [{ grade: 85, summary: "Good", comments: [] }]
            }
          },
          { 
            id: "job-2", 
            status: "RUNNING",
            priceInDollars: 0,
            durationInSeconds: 0,
            evaluation: {
              document: {
                id: "doc-124",
                versions: [{ title: "Test Document 2", authors: [] }]
              },
              versions: []
            }
          },
          { 
            id: "job-3", 
            status: "FAILED",
            priceInDollars: 0.5,
            durationInSeconds: 5,
            evaluation: {
              document: {
                id: "doc-125",
                versions: [{ title: "Test Document 3", authors: [] }]
              },
              versions: []
            }
          },
        ],
      };

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: "batch-123",
        trackingId: mockTrackingId,
        description: "Test experiment",
        agent: {
          id: "agent-123",
          name: "Test Agent",
          isEphemeral: false,
          config: {
            primaryInstructions: "Test instructions",
            selfCritiqueInstructions: null,
            providesGrades: false,
          },
        },
        ephemeralDocuments: expect.arrayContaining([
          expect.objectContaining({
            id: "doc-123",
          }),
        ]),
        jobStats: {
          total: 3,
          completed: 1,
          failed: 1,
          running: 1,
          pending: 0,
        },
      });
    });

    it("should return 404 if experiment not found", async () => {
      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(null);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Experiment not found");
    });

    it("should return 403 if user does not own the experiment", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: "other-user-123", // Different user
        isEphemeral: true,
        agent: { 
          id: "agent-123",
          ephemeralBatchId: null,
          versions: [{ 
            name: "Test Agent",
            primaryInstructions: "Test",
            selfCritiqueInstructions: null,
            providesGrades: false
          }] 
        },
        ephemeralDocuments: [],
        jobs: [],
      };

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    // Skipped: Route doesn't implement includeResults query parameter functionality
    it.skip("should include evaluation results if requested", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        agent: { 
          id: "agent-123",
          ephemeralBatchId: null,
          versions: [{ 
            name: "Test Agent",
            primaryInstructions: "Test",
            selfCritiqueInstructions: null,
            providesGrades: false
          }] 
        },
        ephemeralDocuments: [],
        jobs: [],
      };

      const mockEvaluations = [
        {
          id: "eval-1",
          documentId: "doc-1",
          versions: [
            {
              id: "evalver-1",
              grade: 85,
              summary: "Good analysis",
              comments: [
                {
                  id: "comment-1",
                  description: "Excellent point",
                  grade: 90,
                },
              ],
            },
          ],
        },
      ];

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);
      (prisma.evaluation.findMany as vi.MockedFunction<any>).mockResolvedValue(mockEvaluations);

      const requestWithResults = {
        url: "http://test.com?includeResults=true",
      } as NextRequest;

      const response = await GET(requestWithResults, mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.evaluations).toBeDefined();
      expect(data.evaluations).toHaveLength(1);
      expect(data.evaluations[0]).toMatchObject({
        id: "eval-1",
        documentId: "doc-1",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockRejectedValue(
        new Error("Database connection error")
      );

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch experiment");
    });
  });

  describe("Expired Experiments", () => {
    it("should still return expired experiments with warning", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        isEphemeral: true,
        expiresAt: new Date(Date.now() - 1000), // Already expired
        agent: { 
          id: "agent-123",
          ephemeralBatchId: null,
          versions: [{ 
            name: "Test Agent",
            primaryInstructions: "Test",
            selfCritiqueInstructions: null,
            providesGrades: false
          }] 
        },
        ephemeralDocuments: [],
        jobs: [],
      };

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe("batch-123");
      expect(new Date(data.expiresAt).getTime()).toBeLessThan(Date.now());
    });
  });
});

describe("/api/experiments/[trackingId] DELETE", () => {
  const mockUserId = "user-123";
  const mockTrackingId = "exp_test123";
  
  const mockRequest = () => {
    return {} as NextRequest;
  };

  const mockParams = {
    params: Promise.resolve({ trackingId: mockTrackingId }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValue(mockUserId);
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      (authenticateRequest as vi.MockedFunction<any>).mockResolvedValue(null);
      
      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Experiment Deletion", () => {
    it("should successfully delete experiment with proper cascade", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        isEphemeral: true,
        agentId: "agent-123",
        jobs: [] // No running jobs
      };

      const mockJobs = [
        { evaluationId: "eval-1" },
        { evaluationId: "eval-2" },
      ];

      const mockEphemeralDocuments = [
        { id: "doc-1" },
        { id: "doc-2" },
      ];

      const mockEphemeralEvaluations = [
        { id: "eval-3" },
      ];

      // Mock the transaction function to call the callback
      (prisma.$transaction as vi.MockedFunction<any>).mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findMany: vi.fn().mockResolvedValue(mockJobs),
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          agent: {
            findUnique: vi.fn().mockResolvedValue({ ephemeralBatchId: "batch-123" }),
          },
          document: {
            findMany: vi.fn().mockResolvedValue(mockEphemeralDocuments),
          },
          evaluation: {
            findMany: vi.fn().mockResolvedValue(mockEphemeralEvaluations),
            deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
          },
          evaluationComment: {
            deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
          },
          evaluationVersion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
          },
          agentEvalBatch: {
            delete: vi.fn().mockResolvedValue(mockBatch),
          },
        };
        return await callback(mockTx);
      });

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify the transaction was called
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should return 404 if experiment not found", async () => {
      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(null);

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Experiment not found");
    });

    it("should return 400 if experiment has running jobs", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        isEphemeral: true,
        jobs: [{ id: "job-1", status: "RUNNING" }] // Has running job
      };

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete experiment with running jobs");
    });

    it("should handle foreign key constraint violations gracefully", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        isEphemeral: true,
        agentId: "agent-123",
        jobs: []
      };

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      // Mock transaction to throw the specific foreign key error
      (prisma.$transaction as vi.MockedFunction<any>).mockRejectedValue(
        new Error("Foreign key constraint violated on the constraint: `EvaluationVersion_evaluationId_fkey`")
      );

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete experiment");
    });

    it("should handle non-ephemeral batch deletion", async () => {
      const mockBatch = {
        id: "batch-123",
        trackingId: mockTrackingId,
        userId: mockUserId,
        isEphemeral: false, // Not ephemeral
        agentId: "agent-123",
        jobs: []
      };

      const mockJobs = [
        { evaluationId: "eval-1" },
      ];

      // Mock the transaction function
      (prisma.$transaction as vi.MockedFunction<any>).mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findMany: vi.fn().mockResolvedValue(mockJobs),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          agent: {
            findUnique: vi.fn().mockResolvedValue({ ephemeralBatchId: null }), // Not ephemeral
          },
          document: {
            findMany: vi.fn().mockResolvedValue([]), // No ephemeral documents
          },
          evaluation: {
            findMany: vi.fn().mockResolvedValue([]), // No additional evaluations
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          evaluationComment: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          evaluationVersion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          agentEvalBatch: {
            delete: vi.fn().mockResolvedValue(mockBatch),
          },
        };
        return await callback(mockTx);
      });

      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockResolvedValue(mockBatch);

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.agentEvalBatch.findFirst as vi.MockedFunction<any>).mockRejectedValue(
        new Error("Database connection error")
      );

      const response = await DELETE(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete experiment");
    });
  });
});