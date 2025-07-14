/**
 * Simple debug test to quickly reproduce chunk 1 issue and capture logs
 */

import { SpellingGrammarLLMClient } from "../infrastructure/llmClient";
import { DocumentChunk, DocumentConventions, AnalysisContext } from "../domain";
import { buildSystemPrompt, buildUserPrompt } from "../application";

describe("Simple Chunk 1 Debug", () => {
  const TIMEOUT = 60000; // 1 minute

  // First ~20 lines of the problematic content to test quickly
  const CHUNK_1_SAMPLE = `# The Enchanting World of Butterfies: A Lepidopteran Jurney

In the vast tapestry of nature's most delicate creations, butterfies stand as a testiment to the intricate beauty of biological diversty. These winged marvels have captivated human imagination for millenia, dancing through ecosystms with an elegance that defies simple comprehension.

## The Metamorphic Miricle

The life cycle of a buterfly is perhaps one of the most fasinating transformational processes in the animal kingdom. Beginning as a tiny, almost invisable egg deposited carefully on the underside of a leaf, these creatures undergo a remarkeable metamorphosis that challenges our understanding of biological potentail.

### Egg Stage: The Begining of Wonder

Female butterfies are incredably strategic in their egg placement. They typically chuse specific host plants that will provide optimal nutrition for there emerging caterpillars.`;

  test("Quick debug test - chunk 1 sample", async () => {
    console.log("\n=== QUICK DEBUG TEST ===");
    console.log(`Sample content length: ${CHUNK_1_SAMPLE.length} characters`);
    
    const lines = CHUNK_1_SAMPLE.split('\n');
    const chunk = new DocumentChunk(CHUNK_1_SAMPLE, 1, lines);
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext(
      "Quick Debug Agent",
      "Find all spelling, grammar, punctuation, and capitalization errors.",
      conventions
    );

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(chunk);
    
    console.log(`System prompt: ${systemPrompt.length} chars`);
    console.log(`User prompt: ${userPrompt.length} chars`);
    console.log(`System prompt preview:`, systemPrompt.substring(0, 200) + '...');

    const llmClient = new SpellingGrammarLLMClient();
    const startTime = Date.now();

    try {
      const response = await llmClient.analyzeText(systemPrompt, userPrompt);
      const duration = (Date.now() - startTime) / 1000;

      console.log("\n=== RESULTS ===");
      console.log(`Duration: ${duration}s`);
      console.log(`Input tokens: ${response.usage.input_tokens}`);
      console.log(`Output tokens: ${response.usage.output_tokens}`);
      console.log(`Errors found: ${response.errors.length}`);
      console.log(`Response keys:`, Object.keys(response));

      // Check if this is high output tokens (indicating plain text response)
      if (response.usage.output_tokens > 500) {
        console.log("⚠️ HIGH OUTPUT TOKENS - likely plain text response!");
      }

      if (response.errors.length > 0) {
        console.log("✅ TOOL USE SUCCESSFUL - Found errors:", response.errors.length);
        console.log("First error:", response.errors[0]);
      } else {
        console.log("ℹ️ No errors found - this could be correct or a tool failure");
      }

      // Check if llmInteraction exists and what it contains
      if (response.llmInteraction) {
        console.log("llmInteraction exists, keys:", Object.keys(response.llmInteraction));
        if (response.llmInteraction.messages) {
          const assistantMsg = response.llmInteraction.messages.find(m => m.role === 'assistant');
          if (assistantMsg) {
            console.log(`\nAssistant response preview: ${assistantMsg.content.substring(0, 300)}...`);
            
            if (assistantMsg.content.includes('"errors"') || assistantMsg.content.includes('tool_use')) {
              console.log("✅ Structured response detected");
            } else {
              console.log("❌ Plain text response detected");
            }
          }
        }
      } else {
        console.log("❌ No llmInteraction in response");
      }

      // The test passes regardless - we're just debugging
      expect(response).toBeDefined();
      
    } catch (error) {
      console.log(`\n❌ Error: ${error}`);
      throw error;
    }
  }, TIMEOUT);

  test("Compare with simple content", async () => {
    console.log("\n=== CONTROL TEST ===");
    
    const simpleContent = `This is simpler content with erors.
Speling mistakes should be found here.`;

    const lines = simpleContent.split('\n');
    const chunk = new DocumentChunk(simpleContent, 100, lines);
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext(
      "Control Agent",
      "Find all spelling, grammar, punctuation, and capitalization errors.",
      conventions
    );

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(chunk);
    
    const llmClient = new SpellingGrammarLLMClient();
    const startTime = Date.now();

    const response = await llmClient.analyzeText(systemPrompt, userPrompt);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`Control - Duration: ${duration}s`);
    console.log(`Control - Input tokens: ${response.usage.input_tokens}`);
    console.log(`Control - Output tokens: ${response.usage.output_tokens}`);
    console.log(`Control - Errors found: ${response.errors.length}`);

    // Should be fast and structured
    expect(response.errors.length).toBeGreaterThan(0);
    expect(response.usage.output_tokens).toBeLessThan(500);
  }, TIMEOUT);
});