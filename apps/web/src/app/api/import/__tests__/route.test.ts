import { NextRequest } from "next/server";
import { POST } from "../route";
import { authenticateRequest } from "@/lib/auth-helpers";
import { processArticle } from "@/lib/articleImport";
import { DocumentModel } from "@/models/Document";
import { prisma } from "@roast/db";

// Mock dependencies
jest.mock("@/lib/auth-helpers");
jest.mock("@/lib/articleImport");
jest.mock("@/models/Document");
jest.mock("@roast/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    agent: {
      findMany: jest.fn(),
    },
    job: {
      create: jest.fn(),
    },
    evaluation: {
      create: jest.fn(),
    },
  },
}));

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockProcessArticle = processArticle as jest.MockedFunction<typeof processArticle>;
const mockDocumentModel = DocumentModel as jest.Mocked<typeof DocumentModel>;

describe("POST /api/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should require authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/article" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("User must be logged in to import a document");
  });

  it("should require a URL", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL is required");
  });

  it("should validate agentIds is an array", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ 
        url: "https://example.com/article",
        agentIds: "not-an-array"
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("agentIds must be an array");
  });

  it("should successfully import an article without agents", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockProcessArticle.mockResolvedValue({
      title: "Test Article",
      author: "Test Author",
      content: "This is a test article with sufficient content to pass validation checks",
      date: "2024-01-01",
      platforms: [],
      url: "https://example.com/article",
    });
    
    const mockDocument = {
      id: "doc-123",
      title: "Test Article",
      slug: "test-article",
    };
    
    mockDocumentModel.create = jest.fn().mockResolvedValue({
      ...mockDocument,
      versions: [{
        title: "Test Article",
        authors: "Test Author",
      }]
    });

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/article" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.documentId).toBe("doc-123");
    expect(data.document).toEqual({
      id: "doc-123",
      title: "Test Article",
      authors: "Test Author"
    });
    expect(data.evaluations).toEqual([]);
    expect(mockProcessArticle).toHaveBeenCalledWith("https://example.com/article");
    expect(mockDocumentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Article",
        authors: "Test Author",
        content: "This is a test article with sufficient content to pass validation checks",
        urls: "https://example.com/article",
        platforms: "",
        importUrl: "https://example.com/article",
        submittedById: "test-user-id"
      })
    );
  });

  it("should create evaluations for specified agents", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockProcessArticle.mockResolvedValue({
      title: "Test Article",
      author: "Test Author",
      content: "This is a test article with sufficient content to pass validation checks",
      date: "2024-01-01",
      platforms: [],
      url: "https://example.com/article",
    });
    
    const mockDocument = {
      id: "doc-123",
      title: "Test Article",
      slug: "test-article",
    };
    
    mockDocumentModel.create = jest.fn().mockResolvedValue({
      ...mockDocument,
      versions: [{
        title: "Test Article",
        authors: "Test Author",
      }]
    });
    
    const mockAgents = [
      { id: "agent-1", name: "Agent 1" },
      { id: "agent-2", name: "Agent 2" },
    ];
    
    (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
    (prisma.job.create as jest.Mock).mockImplementation(({ data }) => 
      Promise.resolve({ id: `job-${data.agentId}`, ...data })
    );
    (prisma.evaluation.create as jest.Mock).mockImplementation(({ data }) => 
      Promise.resolve({ id: `eval-${data.agentId}`, ...data })
    );

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ 
        url: "https://example.com/article",
        agentIds: ["agent-1", "agent-2"]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.document).toEqual({
      id: "doc-123",
      title: "Test Article",
      authors: "Test Author",
    });
    expect(data.evaluations).toHaveLength(2);
    expect(data.evaluations[0].agentId).toBe("agent-1");
    expect(data.evaluations[1].agentId).toBe("agent-2");
    expect(prisma.job.create).toHaveBeenCalledTimes(2);
    expect(prisma.evaluation.create).toHaveBeenCalledTimes(2);
  });

  it("should handle article processing errors", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockProcessArticle.mockRejectedValue(new Error("Failed to fetch article"));

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/article" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Failed to fetch article");
  });

  it("should continue creating evaluations even if one fails", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    mockProcessArticle.mockResolvedValue({
      title: "Test Article",
      author: "Test Author",
      content: "This is a test article with sufficient content to pass validation checks",
      date: "2024-01-01",
      platforms: [],
      url: "https://example.com/article",
    });
    
    const mockDocument = {
      id: "doc-123",
      title: "Test Article",
      slug: "test-article",
    };
    
    mockDocumentModel.create = jest.fn().mockResolvedValue({
      ...mockDocument,
      versions: [{
        title: "Test Article",
        authors: "Test Author",
      }]
    });
    
    const mockAgents = [
      { id: "agent-1", name: "Agent 1" },
      { id: "agent-2", name: "Agent 2" },
    ];
    
    (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
    
    // First job creation succeeds, second fails
    (prisma.job.create as jest.Mock)
      .mockResolvedValueOnce({ id: "job-1", agentId: "agent-1" })
      .mockRejectedValueOnce(new Error("Job creation failed"));
      
    (prisma.evaluation.create as jest.Mock).mockResolvedValue({ 
      id: "eval-1", 
      agentId: "agent-1" 
    });

    const request = new NextRequest("http://localhost:3000/api/import", {
      method: "POST",
      body: JSON.stringify({ 
        url: "https://example.com/article",
        agentIds: ["agent-1", "agent-2"]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.document).toEqual({
      id: "doc-123",
      title: "Test Article",
      authors: "Test Author",
    });
    expect(data.evaluations).toHaveLength(1);
    expect(data.evaluations[0].agentId).toBe("agent-1");
  });
});