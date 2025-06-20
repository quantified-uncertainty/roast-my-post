import "dotenv/config";
import { generateThinking } from "../thinking";
import { generateAnalysis } from "../analysis";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// Smoke tests for the new document analysis pipeline
describe("Document Analysis Pipeline Smoke Tests", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Writing Coach",
    version: "1.0",
    purpose: "ADVISOR",
    description: "A test agent for providing writing feedback",
    genericInstructions: "You are a helpful writing coach",
    summaryInstructions: "Provide a brief summary",
    commentInstructions: "Focus on areas for improvement",
    gradeInstructions: "Grade based on clarity and structure"
  };

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-blog-post",
    title: "Sample Blog Post",
    content: `This is a sample blog post about productivity.

**Key Points:**
- Focus on important tasks first
- Eliminate distractions
- Take regular breaks

The research shows that these strategies work well for most people.`,
    author: "Test Author",
    publishedDate: "2024-01-15",
    reviews: [],
    intendedAgents: ["test-agent-1"]
  };

  beforeEach(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping smoke test - ANTHROPIC_API_KEY not set");
      return;
    }
  });

  test("thinking → analysis pipeline works correctly", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    // Step 1: Generate thinking
    const thinkingResult = await generateThinking(mockDocument, mockAgent);
    
    expect(thinkingResult.outputs.thinking).toBeDefined();
    expect(thinkingResult.outputs.thinking.length).toBeGreaterThan(200);
    expect(thinkingResult.task.name).toBe("generateThinking");
    
    console.log("✅ Step 1 - Thinking:", thinkingResult.outputs.thinking.length, "chars");

    // Step 2: Generate analysis based on thinking
    const analysisResult = await generateAnalysis(
      mockDocument,
      mockAgent,
      thinkingResult.outputs,
      200
    );
    
    expect(analysisResult.outputs.analysis).toBeDefined();
    expect(analysisResult.outputs.summary).toBeDefined();
    expect(analysisResult.outputs.analysis.length).toBeGreaterThan(50);
    expect(analysisResult.outputs.summary.length).toBeGreaterThan(30);
    expect(analysisResult.task.name).toBe("generateAnalysis");
    
    // Analysis should be more concise than thinking
    expect(analysisResult.outputs.analysis.length).toBeLessThan(thinkingResult.outputs.thinking.length);
    
    console.log("✅ Step 2 - Analysis:", analysisResult.outputs.analysis.length, "chars");
    console.log("✅ Step 2 - Summary:", analysisResult.outputs.summary.length, "chars");
    
    const totalCost = thinkingResult.task.priceInCents + analysisResult.task.priceInCents;
    const totalTime = thinkingResult.task.timeInSeconds + analysisResult.task.timeInSeconds;
    
    console.log(`💰 Total cost: ${totalCost} cents`);
    console.log(`⏱️ Total time: ${totalTime} seconds`);
    
    // Verify both steps have proper task structure
    expect(thinkingResult.task.llmInteractions).toHaveLength(1);
    expect(analysisResult.task.llmInteractions).toHaveLength(1);
    expect(thinkingResult.task.priceInCents).toBeGreaterThan(0);
    expect(analysisResult.task.priceInCents).toBeGreaterThan(0);
  }, 120000);
});