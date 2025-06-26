import { NextRequest } from "next/server";
import { GET } from "../route";
import { authenticateRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth-helpers");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
    evaluationVersion: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockPrismaAgent = prisma.agent as jest.Mocked<typeof prisma.agent>;
const mockPrismaEvalVersion = prisma.evaluationVersion as jest.Mocked<typeof prisma.evaluationVersion>;

describe("GET /api/agents/[agentId]/export-data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should require authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 404 if agent not found", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockPrismaAgent.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Agent not found");
  });

  it("should export agent data when authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    
    const mockAgent = {
      id: "test-agent",
      name: "Test Agent",
      purpose: "ASSESSOR",
      versions: [{
        id: "version-1",
        version: 1,
        name: "Test Agent",
        agentType: "ASSESSOR",
        description: "Test description",
        primaryInstructions: "Test instructions",
        selfCritiqueInstructions: "Test self critique",
        providesGrades: true,
        extendedCapabilityId: null,
      }],
      submittedBy: {
        id: "user-1",
        name: "Test User",
      },
    };

    const mockEvaluations = [{
      id: "eval-1",
      evaluationId: "eval-id-1",
      version: 1,
      summary: "Test summary",
      grade: 4.5,
      comments: [],
      documentVersion: {
        document: {
          id: "doc-1",
          title: "Test Document",
        },
      },
      agentVersion: {
        version: 1,
      },
      job: null,
    }];

    mockPrismaAgent.findUnique.mockResolvedValue(mockAgent as any);
    mockPrismaEvalVersion.findMany.mockResolvedValue(mockEvaluations as any);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);
    const data = await response.json();

    if (response.status !== 200) {
      console.error('Response error:', data);
    }

    expect(response.status).toBe(200);
    expect(data.agent.name).toBe("Test Agent");
    expect(data.evaluations).toHaveLength(1);
    expect(data.evaluations[0].summary).toBe("Test summary");
  });

  it("should filter by version when provided", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    
    const mockAgent = {
      id: "test-agent",
      name: "Test Agent",
      versions: [{
        id: "version-1",
        version: 1,
      }],
      submittedBy: null,
    };

    mockPrismaAgent.findUnique.mockResolvedValue(mockAgent as any);
    mockPrismaEvalVersion.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data?version=1");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(mockPrismaEvalVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: "test-agent",
        }),
      })
    );
  });

  it("should handle errors gracefully", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockPrismaAgent.findUnique.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to export agent data");
  });
});