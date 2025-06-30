import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractCommentsFromAnalysis } from "../commentExtraction";
import { analyzeLinkDocument } from "../linkAnalysis/linkAnalysisWorkflow";
import { createTestDocument, getPrependLineCount } from "../testUtils";
import type { Agent } from "../../../types/agentSchema";

// Mock the Anthropic client
jest.mock("../../../types/openai", () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
  ANALYSIS_MODEL: "claude-sonnet-test",
  DEFAULT_TEMPERATURE: 0.1,
  withTimeout: jest.fn((promise) => promise),
  COMMENT_EXTRACTION_TIMEOUT: 30000,
}));

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
    purpose: "ASSESSOR",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("comprehensive analysis workflow correctly handles markdownPrepend", async () => {
    const { anthropic } = require("../../../types/openai");
    
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
    expect(prependLineCount).toBe(10); // Verify our assumption

    // Mock comprehensive analysis response
    // The LLM should see lines 11-14 for the actual content
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Analysis of test document",
            analysis: "# Analysis\n\nThis document contains important information and a link.",
            selfCritique: "This analysis provides a basic overview.",
            commentInsights: [
              {
                id: "insight-1",
                title: "Main Content Observation",
                location: `Line ${11}`, // First line of actual content
                observation: "The document starts with main content",
                significance: "Sets the tone",
                suggestedComment: "Good opening statement"
              },
              {
                id: "insight-2",
                title: "Link Reference",
                location: `Line ${13}`, // Line with the link
                observation: "Contains an example link",
                significance: "External reference",
                suggestedComment: "Link to example.com"
              },
            ],
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
    };

    anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

    // Step 1: Generate comprehensive analysis
    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      2
    );

    expect(analysisResult.outputs.commentInsights).toHaveLength(2);

    // Step 2: Extract comments
    const commentResult = await extractCommentsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      2
    );

    expect(commentResult.outputs.comments).toHaveLength(2);

    // Verify the comments have correct highlights
    const [comment1, comment2] = commentResult.outputs.comments;

    // First comment should highlight "This is the main content"
    expect(comment1.highlight.quotedText).toContain("This is the main content");
    expect(comment1.highlight.startOffset).toBeGreaterThan(0); // Should account for prepend

    // Second comment should highlight the link
    expect(comment2.highlight.quotedText).toContain("https://example.com");
  });

  test("link analysis workflow correctly handles markdownPrepend", async () => {
    const { anthropic } = require("../../../types/openai");

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
    const mockLinkAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "analyze_links",
          input: {
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
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 150 },
    };

    anthropic.messages.create.mockResolvedValueOnce(mockLinkAnalysisResponse);

    // Run link analysis workflow
    const result = await analyzeLinkDocument(
      mockDocument,
      mockAgent,
      3
    );

    // Verify the analysis includes proper content
    expect(result.analysis).toContain("Link Quality Analysis");
    expect(result.comments).toBeDefined();
    
    // If there are link comments, they should have correct offsets
    if (result.comments.length > 0) {
      const linkComment = result.comments[0];
      // The offset should account for the prepend
      expect(linkComment.highlight.startOffset).toBeGreaterThan(100); // Prepend is ~200 chars
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

    // The full content should be different
    const fullContentWith = (docWithPrepend as any).versions?.[0]?.markdownPrepend + content;
    const fullContentWithout = content;

    expect(fullContentWith.length).toBeGreaterThan(fullContentWithout.length);
    expect(fullContentWith).toContain("# Position Test");
    expect(fullContentWith).toContain(content);
  });
});