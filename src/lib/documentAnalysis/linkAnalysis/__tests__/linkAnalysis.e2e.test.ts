/**
 * End-to-end tests for link analysis with various link scenarios
 * 
 * This test suite uses small markdown documents, each containing one or more links
 * with different issues to ensure comprehensive coverage of all link validation cases.
 * Tests simple URL accessibility without content analysis.
 */

import { analyzeLinkDocument } from "../linkAnalysisWorkflow";
import type { Agent } from "../../../../types/agentSchema";
import type { Document } from "../../../../types/documents";

// Mock agent for testing
const mockAgent: Agent = {
  id: "test-agent",
  name: "Test Link Analyzer",
  version: "1",
  purpose: "ASSESSOR",
  description: "A test agent for analyzing links in documents to validate their accessibility and correctness",
  primaryInstructions: "Analyze the provided document focusing on link validation and accessibility",
  providesGrades: true,
};

// Helper to create test documents
function createTestDocument(title: string, content: string): Document {
  return {
    id: `test-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    content,
    author: "Test Author",
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    publishedDate: new Date().toISOString(),
    reviews: [],
    intendedAgents: [],
  };
}

// Test data - each scenario in its own small document
const testCases = [
  {
    name: "Valid working link",
    document: createTestDocument(
      "Valid Link Test",
      "Check out this great AI research resource: [OpenAI Research](https://openai.com/research) for the latest papers and findings."
    ),
    expectedComments: 1,
    expectedLinkStatus: "working",
    expectedGradeRange: { min: 80, max: 100 },
  },
  {
    name: "Broken domain link",
    document: createTestDocument(
      "Broken Link Test", 
      "This link is broken: [Fake AI Research](https://definitely-does-not-exist-12345.com/research) - should be flagged."
    ),
    expectedComments: 1,
    expectedLinkStatus: "broken",
    expectedGradeRange: { min: 0, max: 30 },
  },
  {
    name: "PDF link (treated as working)",
    document: createTestDocument(
      "PDF Link Test",
      "Here's the famous Attention paper: [Attention Is All You Need](https://arxiv.org/pdf/1706.03762.pdf) introducing transformers."
    ),
    expectedComments: 1,
    expectedLinkStatus: "working",
    expectedGradeRange: { min: 85, max: 95 },
  },
];

describe("Link Analysis End-to-End Tests", () => {
  testCases.forEach((testCase, index) => {
    test(`${testCase.name}`, async () => {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      const result = await analyzeLinkDocument(
        testCase.document,
        mockAgent
      );

      // Basic structure validation
      expect(result.thinking).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(Array.isArray(result.comments)).toBe(true);

      console.log(`📊 Generated ${result.comments.length} comments (expected ${testCase.expectedComments})`);
      console.log(`📝 Summary: ${result.summary}`);

      // Comments count validation
      if (testCase.expectedComments > 0) {
        expect(result.comments.length).toBeGreaterThanOrEqual(testCase.expectedComments);
        
        // Log comment details
        console.log("💬 Comments with grades:");
        result.comments.forEach((comment, commentIndex) => {
          console.log(`  ${commentIndex + 1}. ${comment.title} (Grade: ${comment.grade}/100)`);
        });

        // Grade validation for each comment if we have grade range expectations
        if (testCase.expectedGradeRange) {
          result.comments.forEach((comment, commentIndex) => {
            const grade = comment.grade;
            console.log(`✅ Comment ${commentIndex + 1} grade ${grade} is within expected range [${testCase.expectedGradeRange.min}, ${testCase.expectedGradeRange.max}]`);
            expect(grade).toBeGreaterThanOrEqual(testCase.expectedGradeRange.min);
            expect(grade).toBeLessThanOrEqual(testCase.expectedGradeRange.max);
          });
        }
      } else {
        expect(result.comments.length).toBe(0);
      }

      // Status validation based on expected link status
      if (testCase.expectedLinkStatus === "working") {
        expect(result.comments.some(c => c.title.includes("✅"))).toBe(true);
      } else if (testCase.expectedLinkStatus === "broken") {
        expect(result.comments.some(c => c.title.includes("❌"))).toBe(true);
      }

      // Document-level grade validation
      if (result.grade !== undefined) {
        expect(result.grade).toBeGreaterThanOrEqual(0);
        expect(result.grade).toBeLessThanOrEqual(100);
        console.log(`📈 Overall document grade: ${result.grade}/100`);
      }

      console.log("✅ Test completed successfully");
    }, 60000); // 60 second timeout for network requests
  });

  test("should handle documents with no links", async () => {
    const noLinksDoc = createTestDocument(
      "No Links Test",
      "This is a simple document with no external links. Just plain text content."
    );

    const result = await analyzeLinkDocument(noLinksDoc, mockAgent);

    expect(result.thinking).toContain("No URLs were found");
    expect(result.comments).toHaveLength(0);
    expect(result.summary).toContain("No external links found");
  });
});