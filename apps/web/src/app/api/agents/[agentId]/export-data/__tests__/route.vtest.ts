import { vi } from 'vitest';

// Mock dependencies before imports
vi.mock("@/infrastructure/auth/auth-helpers", () => ({
  authenticateRequest: vi.fn(),
}));
vi.mock("@/infrastructure/logging/logger");
vi.mock("@roast/db", () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
    },
    evaluationVersion: {
      findMany: vi.fn(),
    },
    agentVersion: {
      findFirst: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { NextRequest } from "next/server";
import { GET } from "../route";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { prisma } from "@roast/db";

const mockAuthenticateRequest = vi.mocked(authenticateRequest);
const mockPrismaAgent = vi.mocked(prisma.agent);
const mockPrismaEvalVersion = vi.mocked(prisma.evaluationVersion);
const mockPrismaAgentVersion = vi.mocked(prisma.agentVersion);

describe("GET /api/agents/[agentId]/export-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      versions: [{
        id: "version-1",
        version: 1,
        name: "Test Agent",
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
      evaluation: {
        document: {
          id: "doc-1",
          versions: [{
            title: "Test Document",
            content: "Test content",
            urls: ["https://example.com"],
          }],
          submittedBy: {
            name: "Test Author",
          },
          publishedDate: new Date("2024-01-01"),
        },
      },
      agentVersion: {
        version: 1,
      },
      job: null,
      createdAt: new Date("2024-01-01"),
    }];

    mockPrismaAgent.findUnique.mockResolvedValue(mockAgent as any);
    mockPrismaEvalVersion.findMany.mockResolvedValue(mockEvaluations as any);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);

    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('Response error:', errorData);
    }

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/yaml');
    
    const yamlText = await response.text();
    expect(yamlText).toContain('agent_name: Test Agent');
    expect(yamlText).toContain('summary: Test summary');
    expect(yamlText).toContain('total_evaluations: 1');
  });

  it("should filter by version when provided", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    
    const mockAgent = {
      id: "test-agent",
      name: "Test Agent",
      versions: [{
        id: "version-1",
        version: 1,
        name: "Test Agent",
        description: "Test description",
        primaryInstructions: "Test instructions",
        selfCritiqueInstructions: "Test self critique",
        providesGrades: true,
        extendedCapabilityId: null,
      }],
      submittedBy: null,
    };

    mockPrismaAgent.findUnique.mockResolvedValue(mockAgent as any);
    mockPrismaAgentVersion.findFirst.mockResolvedValue({
      id: "version-1",
      agentId: "test-agent",
      version: 1,
    } as any);
    mockPrismaEvalVersion.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/agents/test-agent/export-data?version=1");
    const context = { params: Promise.resolve({ agentId: "test-agent" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(mockPrismaEvalVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentVersionId: "version-1",
          evaluation: expect.objectContaining({
            agentId: "test-agent",
          }),
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