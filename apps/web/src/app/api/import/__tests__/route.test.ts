import { NextRequest } from "next/server";
import { POST } from "../route";
import { authenticateRequest } from "@/lib/auth-helpers";
import { importDocumentService } from "@/lib/services/documentImport";

// Mock dependencies
jest.mock("@/lib/auth-helpers");
jest.mock("@/lib/services/documentImport");

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockImportDocumentService = importDocumentService as jest.MockedFunction<typeof importDocumentService>;

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
    
    const mockResult = {
      success: true,
      documentId: "doc-123",
      document: {
        id: "doc-123",
        title: "Test Article",
        authors: "Test Author"
      },
      evaluations: []
    };
    
    mockImportDocumentService.mockResolvedValue(mockResult);

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
    expect(mockImportDocumentService).toHaveBeenCalledWith(
      "https://example.com/article",
      "test-user-id",
      undefined
    );
  });

  it("should create evaluations for specified agents", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    
    const mockResult = {
      success: true,
      documentId: "doc-123",
      document: {
        id: "doc-123",
        title: "Test Article",
        authors: "Test Author"
      },
      evaluations: [
        { evaluationId: "eval-1", agentId: "agent-1", jobId: "job-1" },
        { evaluationId: "eval-2", agentId: "agent-2", jobId: "job-2" }
      ]
    };
    
    mockImportDocumentService.mockResolvedValue(mockResult);

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
    expect(mockImportDocumentService).toHaveBeenCalledWith(
      "https://example.com/article",
      "test-user-id",
      ["agent-1", "agent-2"]
    );
  });

  it("should handle article processing errors", async () => {
    mockAuthenticateRequest.mockResolvedValue("test-user-id");
    
    mockImportDocumentService.mockResolvedValue({
      success: false,
      error: "Failed to fetch article"
    });

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
    
    const mockResult = {
      success: true,
      documentId: "doc-123",
      document: {
        id: "doc-123",
        title: "Test Article",
        authors: "Test Author"
      },
      evaluations: [
        { evaluationId: "eval-1", agentId: "agent-1", jobId: "job-1" }
      ]
    };
    
    mockImportDocumentService.mockResolvedValue(mockResult);

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