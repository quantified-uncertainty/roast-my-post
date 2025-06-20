import "dotenv/config";
import { generateThinking } from "../thinking";
import { generateAnalysis } from "../analysis";
import { getCommentData } from "../commentGeneration";
import { analyzeDocument } from "../analyzeDocument";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// Integration tests for the document analysis pipeline
describe("Document Analysis Pipeline Integration", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Writing Coach",
    version: "1.0",
    purpose: "ADVISOR",
    description: "A test agent for providing writing feedback on blog posts and articles",
    genericInstructions: "You are a helpful writing coach focused on improving clarity and engagement",
    summaryInstructions: "Provide a brief summary highlighting the main points and overall quality",
    commentInstructions: "Focus on specific areas where the writing could be improved, such as clarity, flow, evidence, and engagement",
    gradeInstructions: "Grade based on clarity, structure, evidence quality, and overall impact"
  };

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-blog-post",
    title: "The Impact of Remote Work on Team Collaboration",
    content: `Remote work has fundamentally changed how teams collaborate. This shift presents both opportunities and challenges that organizations must navigate carefully.

**Key Benefits:**

1. **Increased Flexibility**: Team members can work from anywhere, leading to better work-life balance
2. **Access to Global Talent**: Companies can hire the best people regardless of location
3. **Reduced Overhead**: Lower office costs and commuting expenses
4. **Focus Time**: Fewer interruptions can lead to deeper work

**Main Challenges:**

- Communication barriers and misunderstandings
- Difficulty building team culture and relationships
- Time zone coordination issues
- Technology dependency and potential failures

**Best Practices for Success:**

The most successful remote teams establish clear communication protocols. They use a mix of synchronous and asynchronous communication tools. Regular video calls help maintain personal connections, while written documentation ensures nothing gets lost.

Setting boundaries is crucial. Team members need designated work spaces and clear expectations about availability. Managers must learn to measure output rather than hours worked.

**Looking Forward:**

The future likely holds a hybrid model where teams combine remote and in-person work. This approach could capture the benefits of both while mitigating the drawbacks.

What strategies has your organization found most effective for remote collaboration?`,
    author: "Test Author",
    publishedDate: "2024-01-15",
    reviews: [],
    intendedAgents: ["test-agent-1"]
  };

  beforeEach(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping integration test - ANTHROPIC_API_KEY not set");
      return;
    }
  });

  test("Step 1: generateThinking produces comprehensive thinking", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    const result = await generateThinking(mockDocument, mockAgent);

    expect(result.task).toBeDefined();
    expect(result.task.name).toBe("generateThinking");
    expect(result.task.modelName).toBeDefined();
    expect(result.task.priceInCents).toBeGreaterThan(0);
    expect(result.task.timeInSeconds).toBeGreaterThan(0);
    expect(result.task.llmInteractions).toHaveLength(1);

    expect(result.outputs).toBeDefined();
    expect(result.outputs.thinking).toBeDefined();
    expect(typeof result.outputs.thinking).toBe("string");
    expect(result.outputs.thinking.length).toBeGreaterThan(500);
    
    // Should contain markdown formatting
    expect(result.outputs.thinking).toMatch(/#{1,3}\s/); // Headers
    expect(result.outputs.thinking).toMatch(/\*\*.*\*\*/); // Bold text
    
    console.log("✅ Thinking generated successfully");
    console.log(`📊 Length: ${result.outputs.thinking.length} characters`);
    console.log(`💰 Cost: ${result.task.priceInCents} cents`);
    console.log(`⏱️ Time: ${result.task.timeInSeconds} seconds`);
  }, 60000);

  test("Step 2: generateAnalysis uses thinking data", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    // First generate thinking
    const thinkingResult = await generateThinking(mockDocument, mockAgent);
    
    // Then generate analysis based on thinking
    const result = await generateAnalysis(
      mockDocument,
      mockAgent,
      thinkingResult.outputs,
      300
    );

    expect(result.task).toBeDefined();
    expect(result.task.name).toBe("generateAnalysis");
    expect(result.task.modelName).toBeDefined();
    expect(result.task.priceInCents).toBeGreaterThan(0);
    expect(result.task.timeInSeconds).toBeGreaterThan(0);
    expect(result.task.llmInteractions).toHaveLength(1);

    expect(result.outputs).toBeDefined();
    expect(result.outputs.analysis).toBeDefined();
    expect(result.outputs.summary).toBeDefined();
    expect(typeof result.outputs.analysis).toBe("string");
    expect(typeof result.outputs.summary).toBe("string");
    
    // Analysis should be substantial but shorter than thinking
    expect(result.outputs.analysis.length).toBeGreaterThan(100);
    expect(result.outputs.analysis.length).toBeLessThan(thinkingResult.outputs.thinking.length);
    
    // Summary should be concise
    expect(result.outputs.summary.length).toBeGreaterThan(50);
    expect(result.outputs.summary.length).toBeLessThan(500);
    
    // Should contain markdown formatting
    expect(result.outputs.analysis).toMatch(/#{1,3}\s|[-*]\s|\*\*.*\*\*/);
    
    console.log("✅ Analysis generated successfully");
    console.log(`📊 Analysis length: ${result.outputs.analysis.length} characters`);
    console.log(`📝 Summary length: ${result.outputs.summary.length} characters`);
    console.log(`💰 Cost: ${result.task.priceInCents} cents`);
    console.log(`⏱️ Time: ${result.task.timeInSeconds} seconds`);
  }, 60000);

  test("Step 3: getCommentData uses thinking data", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    // First generate thinking
    const thinkingResult = await generateThinking(mockDocument, mockAgent);
    
    // Then generate comments based on thinking
    const result = await getCommentData(
      mockDocument,
      mockAgent,
      thinkingResult.outputs,
      3,
      2
    );

    expect(result.task).toBeDefined();
    expect(result.task.name).toBe("getCommentData");
    expect(result.task.modelName).toBeDefined();
    expect(result.task.priceInCents).toBeGreaterThan(0);
    expect(result.task.timeInSeconds).toBeGreaterThan(0);
    expect(result.task.llmInteractions.length).toBeGreaterThan(0);

    expect(result.outputs).toBeDefined();
    expect(result.outputs.comments).toBeDefined();
    expect(Array.isArray(result.outputs.comments)).toBe(true);
    expect(result.outputs.comments.length).toBeGreaterThan(0);
    expect(result.outputs.comments.length).toBeLessThanOrEqual(3);

    // Validate comment structure
    for (const comment of result.outputs.comments) {
      expect(comment.title).toBeDefined();
      expect(comment.description).toBeDefined();
      expect(comment.highlight).toBeDefined();
      expect(comment.highlight.startOffset).toBeGreaterThanOrEqual(0);
      expect(comment.highlight.endOffset).toBeGreaterThan(comment.highlight.startOffset);
      expect(comment.importance).toBeGreaterThanOrEqual(0);
      expect(comment.importance).toBeLessThanOrEqual(100);
      
      if (comment.grade !== undefined) {
        expect(comment.grade).toBeGreaterThanOrEqual(0);
        expect(comment.grade).toBeLessThanOrEqual(100);
      }
    }
    
    console.log("✅ Comments generated successfully");
    console.log(`📊 Number of comments: ${result.outputs.comments.length}`);
    console.log(`💰 Cost: ${result.task.priceInCents} cents`);
    console.log(`⏱️ Time: ${result.task.timeInSeconds} seconds`);
  }, 120000);

  test("Full Pipeline: analyzeDocument integrates all steps", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    const result = await analyzeDocument(
      mockDocument,
      mockAgent,
      300, // targetWordCount
      2    // targetComments
    );

    // Validate structure
    expect(result.thinking).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.comments).toBeDefined();
    expect(result.tasks).toBeDefined();

    // Should have 3 tasks (thinking, analysis, comments)
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].name).toBe("generateThinking");
    expect(result.tasks[1].name).toBe("generateAnalysis");
    expect(result.tasks[2].name).toBe("getCommentData");

    // Validate content quality
    expect(result.thinking.length).toBeGreaterThan(500);
    expect(result.analysis.length).toBeGreaterThan(100);
    expect(result.summary.length).toBeGreaterThan(50);
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments.length).toBeLessThanOrEqual(2);

    // Validate that analysis is shorter than thinking
    expect(result.analysis.length).toBeLessThan(result.thinking.length);
    expect(result.summary.length).toBeLessThan(result.analysis.length);

    const totalCost = result.tasks.reduce((sum, task) => sum + task.priceInCents, 0);
    const totalTime = result.tasks.reduce((sum, task) => sum + task.timeInSeconds, 0);

    console.log("✅ Full pipeline completed successfully");
    console.log(`📊 Thinking: ${result.thinking.length} chars`);
    console.log(`📊 Analysis: ${result.analysis.length} chars`);
    console.log(`📊 Summary: ${result.summary.length} chars`);
    console.log(`📊 Comments: ${result.comments.length} items`);
    console.log(`💰 Total cost: ${totalCost} cents`);
    console.log(`⏱️ Total time: ${totalTime} seconds`);
  }, 180000);
});