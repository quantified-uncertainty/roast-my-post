// Add Node.js shims for OpenAI
import 'openai/shims/node';

import { analyzeDocument } from "../analyzeDocument";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// To run: npm test -- --testNamePattern="Comprehensive Analysis E2E"
describe("Comprehensive Analysis E2E", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Writing Coach",
    version: "1.0",
    purpose: "ADVISOR",
    description: "A test agent for providing writing feedback on blog posts and articles",
    primaryInstructions: "You are a helpful writing coach focused on improving clarity and engagement. Provide detailed analysis with specific examples.",
    providesGrades: false,
  };

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-blog-post",
    title: "The Future of AI in Education",
    content: `Artificial intelligence is transforming education in unprecedented ways. From personalized learning platforms to intelligent tutoring systems, AI is making education more accessible and effective.

The key benefits include:

1. **Personalized Learning**: AI can adapt to individual student needs
2. **Automated Grading**: Reducing teacher workload for routine assessments  
3. **Intelligent Tutoring**: Providing 24/7 support for students
4. **Predictive Analytics**: Identifying at-risk students early

However, there are also significant challenges to consider:

- Privacy and data security concerns
- The risk of over-reliance on technology
- Potential job displacement for educators
- Ensuring equitable access across socioeconomic groups

Looking ahead, the most successful implementations will likely be those that augment rather than replace human teachers. The goal should be to enhance the educational experience while preserving the irreplaceable human elements of teaching.

What are your thoughts on AI in education? How can we balance innovation with the essential human aspects of learning?`,
    author: "Test Author",
    publishedDate: "2024-01-15",
    reviews: [],
    intendedAgents: ["test-agent-1"]
  };

  it("uses comprehensive analysis workflow successfully", async () => {
    // This test will make real API calls - only run when ANTHROPIC_API_KEY is set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping E2E test - ANTHROPIC_API_KEY not set");
      return;
    }

    const targetWordCount = 1000; // Comprehensive analysis should be longer
    const targetComments = 3;

    const result = await analyzeDocument(
      mockDocument,
      mockAgent,
      targetWordCount,
      targetComments
    );

    // Check that we got results
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.comments).toBeDefined();
    expect(result.tasks).toBeDefined();

    // Verify the comprehensive analysis structure
    expect(result.analysis.length).toBeGreaterThan(1000); // Should be comprehensive
    expect(result.analysis).toContain("# "); // Should have markdown headers
    expect(result.analysis).toContain("## "); // Should have subheaders
    
    // Check if analysis includes key sections - be flexible as the API may return different formats
    expect(result.analysis.toLowerCase()).toMatch(/summary|overview|assessment|analysis/i);
    expect(result.analysis.toLowerCase()).toMatch(/insight|commentary|recommendation|observation/i);
    
    // Verify we have a summary
    expect(result.summary.length).toBeGreaterThan(50);
    expect(result.summary.length).toBeLessThan(500); // Summary should be concise

    // Check comments
    expect(result.comments).toHaveLength(targetComments);
    result.comments.forEach((comment, i) => {
      expect(comment.title).toBeDefined();
      expect(comment.description).toBeDefined();
      expect(comment.highlight).toBeDefined();
      expect(comment.highlight.startOffset).toBeGreaterThanOrEqual(0);
      expect(comment.highlight.endOffset).toBeGreaterThan(comment.highlight.startOffset);
      
      console.log(`Comment ${i + 1}: {
      title: '${comment.title}',
      importance: ${comment.importance},
      quotedText: '${comment.highlight.quotedText.slice(0, 50)}...'
    }`);
    });

    // Verify tasks
    expect(result.tasks.length).toBe(2); // Comprehensive analysis + comment extraction
    expect(result.tasks[0].name).toBe("generateComprehensiveAnalysis");
    expect(result.tasks[1].name).toBe("extractCommentsFromAnalysis");

    // Log some details for inspection
    console.log(`\n=== Analysis Preview ===`);
    console.log(result.analysis.slice(0, 500) + "...\n");
    
    console.log(`=== Summary ===`);
    console.log(result.summary + "\n");
    
    console.log(`=== Task Performance ===`);
    result.tasks.forEach(task => {
      console.log(`${task.name}: ${task.timeInSeconds}s, $${(task.priceInCents / 100).toFixed(2)}`);
    });
  }, 120000); // 120 second timeout for comprehensive analysis API calls
});