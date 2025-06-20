// Add Node.js shims for OpenAI
import 'openai/shims/node';

import { getCommentData } from "../index";
import type { Agent } from "../../../../types/agentSchema";
import type { Document } from "../../../../types/documents";

// To run: npm test -- --testNamePattern="getCommentData E2E"
describe("getCommentData E2E", () => {
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

  test("generates comments successfully for a real document", async () => {
    // This test will make real API calls - only run when ANTHROPIC_API_KEY is set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping E2E test - ANTHROPIC_API_KEY not set");
      return;
    }

    const mockThinkingData = {
      thinking: "This is a comprehensive analysis of the AI in education topic. The article presents a balanced view of both benefits and challenges. The structure is clear with good use of bullet points and sections. The content addresses key concerns like privacy and equity while maintaining an optimistic but realistic tone about AI's role in education."
    };

    let result;
    try {
      result = await getCommentData(
        mockDocument,
        mockAgent,
        mockThinkingData,
        3, // targetComments
        2  // maxAttempts
      );
    } catch (error) {
      console.error("=== E2E TEST FAILURE ===");
      console.error("Error:", error);
      console.error("\n=== INPUT DATA ===");
      console.error("Document:", JSON.stringify(mockDocument, null, 2));
      console.error("Agent:", JSON.stringify(mockAgent, null, 2));
      console.error("Target Comments: 3");
      console.error("Max Attempts: 2");
      throw error;
    }

    // Verify the task result structure
    expect(result.task).toBeDefined();
    expect(result.task.name).toBe("getCommentData");
    expect(result.task.modelName).toBeDefined();
    expect(result.task.priceInCents).toBeGreaterThanOrEqual(0);
    expect(result.task.timeInSeconds).toBeGreaterThan(0);
    expect(result.task.log).toBeDefined();
    expect(result.task.llmInteractions).toBeDefined();
    expect(Array.isArray(result.task.llmInteractions)).toBe(true);

    // Verify the outputs structure
    expect(result.outputs).toBeDefined();
    expect(result.outputs.comments).toBeDefined();
    expect(Array.isArray(result.outputs.comments)).toBe(true);
    
    // Should have generated at least some comments
    expect(result.outputs.comments.length).toBeGreaterThan(0);
    expect(result.outputs.comments.length).toBeLessThanOrEqual(3);

    // Verify each comment has the required structure
    result.outputs.comments.forEach((comment, index) => {
      expect(comment.title).toBeDefined();
      expect(typeof comment.title).toBe("string");
      expect(comment.title.length).toBeGreaterThan(0);
      
      expect(comment.description).toBeDefined();
      expect(typeof comment.description).toBe("string");
      expect(comment.description.length).toBeGreaterThan(0);
      
      expect(comment.highlight).toBeDefined();
      expect(typeof comment.highlight.startOffset).toBe("number");
      expect(typeof comment.highlight.endOffset).toBe("number");
      expect(comment.highlight.startOffset).toBeLessThan(comment.highlight.endOffset);
      expect(comment.highlight.quotedText).toBeDefined();
      expect(comment.highlight.quotedText.length).toBeGreaterThan(0);
      
      expect(typeof comment.importance).toBe("number");
      expect(comment.importance).toBeGreaterThanOrEqual(0);
      expect(comment.importance).toBeLessThanOrEqual(100);

      // Verify the quoted text actually exists in the document
      expect(mockDocument.content).toContain(comment.highlight.quotedText);
      
      console.log(`Comment ${index + 1}:`, {
        title: comment.title,
        importance: comment.importance,
        quotedText: comment.highlight.quotedText.substring(0, 50) + "..."
      });
    });

    // Verify LLM interactions were recorded
    expect(result.task.llmInteractions.length).toBeGreaterThan(0);
    
    result.task.llmInteractions.forEach((interaction, index) => {
      expect(interaction.messages).toBeDefined();
      expect(Array.isArray(interaction.messages)).toBe(true);
      expect(interaction.messages.length).toBeGreaterThanOrEqual(2); // At least system + user
      
      expect(interaction.usage).toBeDefined();
      expect(typeof interaction.usage.input_tokens).toBe("number");
      expect(typeof interaction.usage.output_tokens).toBe("number");
      expect(interaction.usage.input_tokens).toBeGreaterThan(0);
      expect(interaction.usage.output_tokens).toBeGreaterThan(0);

      // Print interaction details for debugging
      console.log(`\n=== LLM Interaction ${index + 1} ===`);
      interaction.messages.forEach((message, msgIndex) => {
        console.log(`Message ${msgIndex + 1} (${message.role}):`);
        console.log(message.content.substring(0, 200) + "...");
      });
      console.log(`Tokens: ${interaction.usage.input_tokens} in, ${interaction.usage.output_tokens} out`);
    });

    console.log("\n=== E2E Test Results ===");
    console.log({
      commentsGenerated: result.outputs.comments.length,
      costInCents: result.task.priceInCents,
      timeInSeconds: result.task.timeInSeconds,
      totalInteractions: result.task.llmInteractions.length
    });
    
    // Print full result on success for debugging
    console.log("\n=== FULL RESULT ===");
    console.log("Task:", JSON.stringify(result.task, null, 2));
    console.log("Comments:", JSON.stringify(result.outputs.comments, null, 2));
  }, 30000); // 30 second timeout for API calls
});