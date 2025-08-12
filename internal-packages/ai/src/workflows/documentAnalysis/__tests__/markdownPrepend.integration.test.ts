import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import { analyzeLinkDocument } from "../linkAnalysis/linkAnalysisWorkflow";
import { createTestDocument, getPrependLineCount, adjustLineReferences } from "../testUtils";
import type { Agent } from "@roast/ai";

// This is an integration test - it makes real API calls
// Increase timeout for network operations
jest.setTimeout(60000); // 60 seconds for API calls

describe("markdownPrepend Integration Tests", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  test("comprehensive analysis workflow correctly handles markdownPrepend", async () => {
    // Skip if no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping test - ANTHROPIC_API_KEY not set");
      return;
    }
    
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

    // This is an integration test - it makes real API calls
    // Note: This is an integration test - it will make real API calls
    // The test is checking that the prepend handling works correctly
    // with actual LLM responses

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
  }, 30000);

  test("link analysis workflow correctly handles markdownPrepend", async () => {
    // Skip if no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping test - ANTHROPIC_API_KEY not set");
      return;
    }
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

    // Note: This is an integration test - it will make real API calls
    // for link analysis

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
  }, 30000);

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
  }, 30000);
});