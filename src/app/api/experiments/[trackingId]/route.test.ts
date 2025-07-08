import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    agentEvalBatch: {
      findFirst: jest.fn(),
    },
    job: {
      count: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
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
    jest.clearAllMocks();
    (authenticateRequest as jest.Mock).mockResolvedValue(mockUserId);
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue(null);
      
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
            evaluation: {
              document: {
                id: "doc-123",
                versions: [{ title: "Test Document", authors: [] }]
              },
              versions: [{ grade: 85, summary: "Good" }]
            }
          },
          { 
            id: "job-2", 
            status: "RUNNING",
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

      (prisma.agentEvalBatch.findFirst as jest.Mock).mockResolvedValue(mockBatch);
      (prisma.job.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // completed
        .mockResolvedValueOnce(1)  // running
        .mockResolvedValueOnce(2)  // failed
        .mockResolvedValueOnce(2); // pending

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: "batch-123",
        trackingId: mockTrackingId,
        description: "Test experiment",
        isEphemeral: true,
        agent: expect.objectContaining({
          id: "agent-123",
          latestVersion: expect.objectContaining({
            name: "Test Agent",
          }),
        }),
        ephemeralDocuments: expect.arrayContaining([
          expect.objectContaining({
            id: "doc-123",
          }),
        ]),
        stats: {
          totalJobs: 10,
          completedJobs: 5,
          runningJobs: 1,
          failedJobs: 2,
          pendingJobs: 2,
        },
      });
    });

    it("should return 404 if experiment not found", async () => {
      (prisma.agentEvalBatch.findFirst as jest.Mock).mockResolvedValue(null);

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

      (prisma.agentEvalBatch.findFirst as jest.Mock).mockResolvedValue(mockBatch);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("should include evaluation results if requested", async () => {
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

      (prisma.agentEvalBatch.findFirst as jest.Mock).mockResolvedValue(mockBatch);
      (prisma.evaluation.findMany as jest.Mock).mockResolvedValue(mockEvaluations);
      (prisma.job.count as jest.Mock).mockResolvedValue(0);

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
      (prisma.agentEvalBatch.findFirst as jest.Mock).mockRejectedValue(
        new Error("Database connection error")
      );

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve experiment");
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

      (prisma.agentEvalBatch.findFirst as jest.Mock).mockResolvedValue(mockBatch);
      (prisma.job.count as jest.Mock).mockResolvedValue(0);

      const response = await GET(mockRequest(), mockParams);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe("batch-123");
      expect(new Date(data.expiresAt).getTime()).toBeLessThan(Date.now());
    });
  });
});