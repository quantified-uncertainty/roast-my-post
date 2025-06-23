import "dotenv/config";
import { generateLinkAnalysis } from "../index";
import type { Agent } from "../../../../types/agentSchema";
import type { Document } from "../../../../types/documents";

// Integration test for the link analysis step (mocked LLM calls)
describe("Link Analysis Integration", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Link Checker",
    version: "1",
    purpose: "ASSESSOR",
    description: "A test agent for checking link validity and detecting broken or hallucinated URLs",
    primaryInstructions: "You are a link validation expert focused on detecting broken or hallucinated URLs",
    providesGrades: false,
  };

  const mockDocumentWithLinks: Document = {
    id: "test-doc-1",
    slug: "test-blog-post",
    title: "AI Research and Development Trends",
    content: `Recent research from OpenAI (https://openai.com/research) has shown progress.

You can also check out this non-existent site: https://broken-research-site-12345.fake/studies.`,
    author: "Test Author",
    publishedDate: new Date().toISOString(),
    reviews: [],
    intendedAgents: [],
  };

  const mockDocumentNoLinks: Document = {
    id: "test-doc-2",
    slug: "no-links-post", 
    title: "Simple Blog Post",
    content: `This is a simple blog post about productivity tips with no external links.`,
    author: "Test Author",
    publishedDate: new Date().toISOString(),
    reviews: [],
    intendedAgents: [],
  };


  test("analyzes document with links", async () => {
    const result = await generateLinkAnalysis(
      mockDocumentWithLinks,
      mockAgent
    );

    expect(result.task).toBeDefined();
    expect(result.task.name).toBe("generateLinkAnalysis");
    expect(result.outputs.thinking).toBeDefined();
    expect(result.outputs.thinking).toContain("# Link Analysis Report");
    expect(result.linkAnalysisResults).toBeDefined();
    expect(Array.isArray(result.linkAnalysisResults)).toBe(true);
    
    console.log("✅ Link analysis integration test completed");
  }, 60000);

  test("handles document with no links", async () => {
    const result = await generateLinkAnalysis(
      mockDocumentNoLinks,
      mockAgent
    );

    expect(result.task.priceInCents).toBe(0); // No LLM calls needed
    expect(result.outputs.thinking).toContain("No URLs were found");
    expect(result.linkAnalysisResults).toHaveLength(0);
    
    console.log("✅ No-links case handled correctly");
  }, 30000);
});