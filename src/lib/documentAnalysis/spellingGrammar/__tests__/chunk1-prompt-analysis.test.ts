/**
 * Analysis of the exact prompts being sent for chunk 1 (no LLM calls)
 */

import { DocumentChunk, DocumentConventions, AnalysisContext } from "../domain";
import { buildSystemPrompt, buildUserPrompt } from "../application";

describe("Chunk 1 Prompt Analysis", () => {
  // The exact content from lines 1-53 that's causing issues
  const PROBLEMATIC_CHUNK_1_CONTENT = `# The Enchanting World of Butterfies: A Lepidopteran Jurney

In the vast tapestry of nature's most delicate creations, butterfies stand as a testiment to the intricate beauty of biological diversty. These winged marvels have captivated human imagination for millenia, dancing through ecosystms with an elegance that defies simple comprehension.

## The Metamorphic Miricle

The life cycle of a buterfly is perhaps one of the most fasinating transformational processes in the animal kingdom. Beginning as a tiny, almost invisable egg deposited carefully on the underside of a leaf, these creatures undergo a remarkeable metamorphosis that challenges our understanding of biological potentail.

### Egg Stage: The Begining of Wonder

Female butterfies are incredably strategic in their egg placement. They typically chuse specific host plants that will provide optimal nutrition for there emerging caterpillars. Each species has its own prefered ecosystem, with some butterfies laying eggs only on very particlar plant species.

### Caterpillar: The Hungy Transformation

Once hatched, the caterpillar enters a fase of voracious consumption. These larval forms are essentally eating machines, consuming leaves at an astounding rate. A single caterpillar can devour entire leafs in minuets, storing energy for its incredable transformation.

#### Nutritional Complexity

The diet of a caterpillar is far more complex then most people realize. Some species have highlly specialized dietary requirements, consuming only specific types of vegetation. This nutritional specilization is a critical aspect of there survival strategie.

### Pupation: Nature's Mirical Chamber

The pupal stage is where true magic hapens. Inside the chrysalis, the caterpillar compleatly dissolves its previous bodily structure, reforming into an entirely new organism. It's a proccess so remarkable that it continues to perplex scientists and poets alyke.

## Ecological Significance

Butterfies are far more then just beautifull creatures fluttering through gardens. They play critcal roles in ecosystems as:

1. Pollinaters of numerous plant species
2. Importent food sources for birds and other predators
3. Indicators of environmental helth and biodiversity

### Migration: An Epic Jurney

Some butterfly species undertake migrations that would make human travelers seem sedentary. The monarch buterfly, for instance, travels thousands of miles between North America and Mexico, navigating with a precision that challenges our understanding of insect navigation.

## Evolutionary Adaptations

The survival strategies of butterfies are a masterclass in evolutionary ingenuity. Consider the following adaptations:

- Camouflage that renders them invisable to predators
- Toxic chemicals developed to deter consumption
- Wing patterns that mimic more dangerous species
- Complex mating rituals involving intricate visual displays`;

  test("Analyze chunk 1 prompts without LLM call", () => {
    console.log("\n=== CHUNK 1 PROMPT ANALYSIS ===");
    
    const lines = PROBLEMATIC_CHUNK_1_CONTENT.split('\n');
    console.log(`Content stats:`);
    console.log(`- Lines: ${lines.length}`);
    console.log(`- Characters: ${PROBLEMATIC_CHUNK_1_CONTENT.length}`);
    console.log(`- Words: ~${PROBLEMATIC_CHUNK_1_CONTENT.split(/\s+/).length}`);
    
    const chunk = new DocumentChunk(PROBLEMATIC_CHUNK_1_CONTENT, 1, lines);
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext(
      "Chunk 1 Debug Agent",
      "Find all spelling, grammar, punctuation, and capitalization errors.",
      conventions
    );

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(chunk);

    console.log(`\nPrompt stats:`);
    console.log(`- System prompt: ${systemPrompt.length} characters`);
    console.log(`- User prompt: ${userPrompt.length} characters`);
    console.log(`- Total prompt: ${(systemPrompt + userPrompt).length} characters`);

    console.log(`\n=== SYSTEM PROMPT PREVIEW ===`);
    console.log(systemPrompt.substring(0, 300) + "...");

    console.log(`\n=== USER PROMPT PREVIEW ===`);
    console.log(userPrompt.substring(0, 500) + "...");
    
    console.log(`\n=== CONTENT PATTERNS THAT MIGHT CAUSE ISSUES ===`);
    
    // Check for patterns that might trigger analytical responses
    const problematicPatterns = [
      '# The Enchanting World',  // Main title
      'In the vast tapestry',    // Analytical opening
      'challenges our understanding', // Academic language
      'remarkable that it continues to perplex scientists', // Scientific discussion
      'Consider the following adaptations:', // List introduction
    ];
    
    problematicPatterns.forEach(pattern => {
      if (PROBLEMATIC_CHUNK_1_CONTENT.includes(pattern)) {
        console.log(`✗ Found potentially problematic pattern: "${pattern}"`);
      }
    });

    // Check if content looks more like analysis than simple text
    const analyticalWords = ['tapestry', 'understanding', 'challenges', 'remarkable', 'perplex', 'consider', 'significance', 'adaptations'];
    const analyticalCount = analyticalWords.filter(word => 
      PROBLEMATIC_CHUNK_1_CONTENT.toLowerCase().includes(word)
    ).length;
    
    console.log(`\nAnalytical words found: ${analyticalCount}/${analyticalWords.length}`);
    
    if (analyticalCount > 5) {
      console.log("⚠️ HIGH ANALYTICAL CONTENT - may trigger Claude to respond analytically instead of using tools");
    }

    // Verify basic test assertions
    expect(chunk.content).toBe(PROBLEMATIC_CHUNK_1_CONTENT);
    expect(chunk.startLineNumber).toBe(1);
    expect(chunk.lines.length).toBe(lines.length);
    // Note: system prompt doesn't contain "report_errors" - that's in the tool definition
    expect(systemPrompt).toContain("proofreader");
    expect(userPrompt).toContain("Line 1:");
  });

  test("Compare with simple content prompts", () => {
    console.log("\n=== CONTROL COMPARISON ===");
    
    const simpleContent = `This text has basic erors.
Speling mistakes are here.
Grammar problems to.`;

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

    console.log(`Simple content stats:`);
    console.log(`- Lines: ${lines.length}`);
    console.log(`- Characters: ${simpleContent.length}`);
    console.log(`- System prompt: ${systemPrompt.length} characters`);
    console.log(`- User prompt: ${userPrompt.length} characters`);

    console.log(`\nSimple content preview:`);
    console.log(simpleContent);

    // Simple content should have same system prompt but shorter user prompt than chunk 1
    console.log(`Simple user prompt length: ${userPrompt.length}`);
    expect(userPrompt.length).toBeLessThan(5000); // Much smaller than chunk 1
    expect(simpleContent).not.toContain('tapestry');
    expect(simpleContent).not.toContain('remarkable');
  });
});