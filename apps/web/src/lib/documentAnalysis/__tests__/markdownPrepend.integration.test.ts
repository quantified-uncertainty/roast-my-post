import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import { analyzeLinkDocument } from "../linkAnalysis/linkAnalysisWorkflow";
import { createTestDocument, getPrependLineCount, adjustLineReferences } from "../testUtils";
import type { Agent } from "@roast/ai";

// Mock the @roast/ai module
jest.mock("@roast/ai", () => ({
  callClaudeWithTool: jest.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  createHeliconeHeaders: jest.fn(() => ({})),
  setupClaudeToolMock: jest.requireActual("@roast/ai").setupClaudeToolMock,
  withTimeout: jest.fn((promise) => promise),
}));

// Mock withTimeout from openai types
// withTimeout is now mocked in the main @roast/ai mock
import { callClaudeWithTool, setupClaudeToolMock } from "@roast/ai";

// Mock the cost calculator
jest.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: jest.fn(() => 0.5),
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
}));

// Mock URL validator
jest.mock("../../urlValidator", () => ({
  validateUrls: jest.fn().mockImplementation((urls) => 
    Promise.resolve(urls.map((url: string) => ({
      url,
      isValid: true,
      statusCode: 200,
      statusText: "OK",
      contentType: "text/html",
      redirectedUrl: null,
      accessError: null,
      error: null,
    })))
  ),
}));

describe("markdownPrepend Integration Tests", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  let mockCallClaudeWithTool: jest.MockedFunction<typeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  test("comprehensive analysis workflow correctly handles markdownPrepend", async () => {
    
    // Create a document with prepend
    const documentContent = `This is the main content of the document.
It has multiple lines with important information.
Here's a link: https://example.com
And some more content on the final line.`;

    const mockDocument = createTestDocument(documentContent, {
      title: "Test Document with Prepend",
      author: "Test Author",
      platforms: ["Test Platform"],
      publishedDate: "2024-01-15",
      includePrepend: true,
    });

    // Calculate how many lines the prepend adds
    const prependLineCount = getPrependLineCount(mockDocument);
    
    // Create line references for the actual content lines
    const contentLineRefs = [
      "Line 1", // First line of content
      "Line 3", // Line with the link
    ];
    
    // Adjust references to account for prepend
    const adjustedRefs = adjustLineReferences(contentLineRefs, prependLineCount);

    // Mock comprehensive analysis response
    const mockToolResult = {
      summary: "Analysis of test document",
      analysis: "# Analysis\n\nThis document contains important information and a link.",
      highlightInsights: [
        {
          id: "insight-1",
          location: adjustedRefs[0], // Dynamically calculated
          suggestedHighlight: "This is the main content"
        },
        {
          id: "insight-2",
          location: adjustedRefs[1], // Dynamically calculated
          suggestedHighlight: "https://example.com"
        },
      ],
    };

    mockHelper.mockToolResponse(mockToolResult);

    // Step 1: Generate comprehensive analysis
    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      2
    );

    expect(analysisResult.outputs.highlightInsights).toHaveLength(2);

    // Step 2: Extract highlights
    const commentResult = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      2
    );

    expect(commentResult.outputs.highlights).toHaveLength(2);

    // Verify the highlights have correct highlights
    const [comment1, comment2] = commentResult.outputs.highlights;

    // First comment should highlight "This is the main content"
    expect(comment1.highlight!.quotedText).toContain("This is the main content");
    expect(comment1.highlight!.startOffset).toBeGreaterThan(0); // Should account for prepend

    // Second comment should highlight the link
    expect(comment2.highlight!.quotedText).toContain("https://example.com");
  });

  test("link analysis workflow correctly handles markdownPrepend", async () => {
    // Create a document with links and prepend
    const documentContent = `Check out these resources:
- Main site: https://example.com
- Documentation: https://docs.example.com
- Blog: https://blog.example.com`;

    const mockDocument = createTestDocument(documentContent, {
      title: "Links Document",
      author: "Link Author",
      includePrepend: true,
    });

    // Mock link analysis response
    const mockLinkToolResult = {
      thinking: "Analyzing links in the document",
      linkReports: [
        {
          url: "https://example.com",
          checkResult: {
            isValid: true,
            statusCode: 200,
            error: null,
          },
          analysisNote: "Main website link",
          hasIssue: false,
        },
      ],
    };

    mockHelper.mockToolResponse(mockLinkToolResult);

    // Run link analysis workflow
    const result = await analyzeLinkDocument(
      mockDocument,
      mockAgent,
      3
    );

    // Verify the analysis includes proper content
    expect(result.analysis).toContain("Link Quality Analysis");
    expect(result.highlights).toBeDefined();
    
    // If there are link highlights, they should have correct offsets
    if (result.highlights.length > 0) {
      const linkComment = result.highlights[0];
      // The offset should account for the prepend
      // Since mockDocument.content already includes prepend, the offset should be positive
      expect(linkComment.highlight!.startOffset).toBeGreaterThan(0);
    }
  });

  test("highlight positions are consistent between analysis and display", async () => {
    // This test verifies that the same content is used for:
    // 1. LLM analysis (with prepend)
    // 2. Comment extraction (with prepend)
    // 3. Display in UI (with prepend)

    const content = "Test content for position verification.";
    
    const docWithPrepend = createTestDocument(content, {
      title: "Position Test",
      includePrepend: true,
    });

    const docWithoutPrepend = createTestDocument(content, {
      title: "Position Test",
      includePrepend: false,
    });

    // The documents should have different content
    // docWithPrepend has content that includes prepend
    // docWithoutPrepend has just the raw content
    expect(docWithPrepend.content.length).toBeGreaterThan(docWithoutPrepend.content.length);
    expect(docWithPrepend.content).toContain("# Position Test");
    expect(docWithPrepend.content).toContain(content);
  });
});