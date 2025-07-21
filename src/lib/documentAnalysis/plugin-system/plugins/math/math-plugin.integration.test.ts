/**
 * Integration test for MathPlugin
 * 
 * This test runs each stage individually and verifies the state after each step.
 * It uses real LLM calls to ensure the entire pipeline works correctly.
 * 
 * Run with: ANTHROPIC_API_KEY=your-key npm test math-plugin.integration.test.ts
 */

import { MathPlugin } from '../MathPlugin';
import { TextChunk } from '../../TextChunk';

// This is an integration test that makes real API calls
// Skip if ANTHROPIC_API_KEY is not set
const SKIP_MESSAGE = 'Skipping integration test - set ANTHROPIC_API_KEY to run';
const shouldSkip = !process.env.ANTHROPIC_API_KEY;

// Test document with various math expressions
const TEST_DOCUMENT = `
Introduction to Mathematics

Let me show you some calculations:
- Basic math: 2 + 2 = 5
- Percentage: 25% of 80 is 25
- Division: 10 / 2 = 3

Some correct math:
- Addition: 5 + 5 = 10
- Multiplication: 3 × 4 = 12

More errors:
- Square root: √9 = 4
- Another error: 100 / 4 = 20
- Percentage mistake: 50% of 200 is 50
`;

describe('MathPlugin Integration Test', () => {
  let plugin: MathPlugin;
  
  beforeEach(() => {
    if (shouldSkip) {
      console.log(SKIP_MESSAGE);
    } else {
      plugin = new MathPlugin();
      console.log('\n=== Starting new MathPlugin test ===\n');
    }
  });

  (shouldSkip ? it.skip : it)('should process math through all stages with validation at each step', async () => {
    // ============================================
    // INITIAL STATE CHECK
    // ============================================
    console.log('INITIAL STATE:');
    let state = plugin.debugJson();
    expect(state.stats.potentialCount).toBe(0);
    expect(state.stats.investigatedCount).toBe(0);
    expect(state.stats.locatedCount).toBe(0);
    console.log('✓ Plugin initialized with empty state\n');

    // ============================================
    // STAGE 1: EXTRACT
    // ============================================
    console.log('STAGE 1: EXTRACT POTENTIAL FINDINGS');
    
    // Split document into chunks
    const lines = TEST_DOCUMENT.trim().split('\n');
    const chunks: TextChunk[] = [];
    
    // Create chunks of 3-4 lines each
    for (let i = 0; i < lines.length; i += 3) {
      const chunkLines = lines.slice(i, Math.min(i + 3, lines.length));
      if (chunkLines.some(line => line.trim())) {
        chunks.push(new TextChunk(
          `chunk-${chunks.length + 1}`,
          chunkLines.join('\n'),
          {
            position: {
              start: 0, // Not tracking exact positions in this test
              end: chunkLines.join('\n').length
            },
            lineInfo: {
              startLine: i + 1,
              endLine: Math.min(i + 3, lines.length),
              totalLines: lines.length
            }
          }
        ));
      }
    }
    
    console.log(`Created ${chunks.length} chunks from document`);
    
    // Process each chunk
    for (const chunk of chunks) {
      await plugin.extractPotentialFindings(chunk);
      console.log(`  Processed ${chunk.id}`);
    }
    
    state = plugin.debugJson();
    console.log(`\nExtraction complete:`);
    console.log(`  Potential findings: ${state.stats.potentialCount}`);
    console.log(`  Correct equations: ${state.stats.correctEquations}`);
    
    // Should find multiple math expressions
    expect(state.stats.potentialCount).toBeGreaterThan(5);
    expect(state.stats.correctEquations).toBeGreaterThan(0);
    console.log('✓ Stage 1 complete\n');

    // ============================================
    // STAGE 2: INVESTIGATE
    // ============================================
    console.log('STAGE 2: INVESTIGATE FINDINGS');
    
    await plugin.investigateFindings();
    
    state = plugin.debugJson();
    console.log(`Investigation complete:`);
    console.log(`  Investigated: ${state.stats.investigatedCount}`);
    console.log(`  Errors found: ${state.stats.errorCount}`);
    
    // Only error findings should be investigated (correct equations are not investigated)
    expect(state.stats.investigatedCount).toBe(state.stats.mathErrors);
    // Should find several errors
    expect(state.stats.mathErrors).toBeGreaterThan(3);
    expect(state.stats.investigatedCount).toBeGreaterThan(3);
    
    // Log some findings
    state.findings.investigated.slice(0, 3).forEach((finding: any) => {
      console.log(`  - ${finding.data.expression}: ${finding.data.isCorrect ? 'correct' : 'ERROR'}`);
    });
    console.log('✓ Stage 2 complete\n');

    // ============================================
    // STAGE 3: LOCATE
    // ============================================
    console.log('STAGE 3: LOCATE FINDINGS IN DOCUMENT');
    
    await plugin.locateFindings(TEST_DOCUMENT);
    
    state = plugin.debugJson();
    console.log(`Location complete:`);
    console.log(`  Located: ${state.stats.locatedCount}`);
    console.log(`  Success rate: ${((state.stats.locatedCount / state.stats.investigatedCount) * 100).toFixed(1)}%`);
    
    // Should locate most findings (allow some to fail due to fuzzy matching)
    expect(state.stats.locatedCount).toBeGreaterThan(0);
    expect(state.stats.locatedCount / state.stats.investigatedCount).toBeGreaterThan(0.7);
    
    console.log('✓ Stage 3 complete\n');

    // ============================================
    // STAGE 4: ANALYZE
    // ============================================
    console.log('STAGE 4: ANALYZE PATTERNS');
    
    await plugin.analyzeFindingPatterns();
    
    state = plugin.debugJson();
    console.log(`Analysis complete:`);
    console.log(`  Summary: ${state.findings.summary}`);
    
    // Should have analysis results
    expect(state.findings.summary).toBeTruthy();
    expect(state.findings.analysisSummary).toBeTruthy();
    
    console.log('✓ Stage 4 complete\n');

    // ============================================
    // STAGE 5: GENERATE COMMENTS
    // ============================================
    console.log('STAGE 5: GENERATE COMMENTS');
    
    const comments = plugin.getComments(TEST_DOCUMENT);
    
    console.log(`Generated ${comments.length} comments`);
    
    // Should generate comments for located errors
    expect(comments.length).toBeGreaterThan(0);
    expect(comments.length).toBeLessThanOrEqual(state.stats.locatedCount);
    
    // Verify comment structure
    comments.slice(0, 3).forEach((comment, i) => {
      console.log(`\nComment ${i + 1}:`);
      console.log(`  Description: ${comment.description}`);
      console.log(`  Importance: ${comment.importance}`);
      console.log(`  Quote: "${comment.highlight.quotedText}"`);
      console.log(`  Location: ${comment.highlight.startOffset}-${comment.highlight.endOffset}`);
      
      // Verify highlight matches document
      const extractedText = TEST_DOCUMENT.substring(
        comment.highlight.startOffset,
        comment.highlight.endOffset
      );
      console.log(`${i + 1}. Expected: "${comment.highlight!.quotedText}"`);
      console.log(`   Actual: "${extractedText}"`);
      console.log(`   Match: ${extractedText === comment.highlight!.quotedText ? '✓' : '✗'}`);
      
      expect(extractedText).toBe(comment.highlight!.quotedText);
    });
    
    console.log('\n=== All stages completed successfully! ===');
  }, 30000); // 30 second timeout for API calls

  (shouldSkip ? it.skip : it)('should handle edge cases gracefully', async () => {
    console.log('\n=== Testing edge cases ===\n');
    
    // Test with no math
    const noMathChunk = new TextChunk(
      'no-math',
      'This is just regular text without any mathematics.',
      {
        position: {
          start: 0,
          end: 51
        },
        lineInfo: {
          startLine: 1,
          endLine: 1,
          totalLines: 1
        }
      }
    );
    
    await plugin.extractPotentialFindings(noMathChunk);
    let state = plugin.debugJson();
    console.log(`No math chunk - findings: ${state.stats.potentialCount}`);
    
    // Test with complex math
    const complexChunk = new TextChunk(
      'complex',
      'The integral ∫(x²+1)dx from 0 to 1 equals 4/3.',
      {
        position: {
          start: 0,
          end: 47
        },
        lineInfo: {
          startLine: 1,
          endLine: 1,
          totalLines: 1
        }
      }
    );
    
    await plugin.extractPotentialFindings(complexChunk);
    state = plugin.debugJson();
    console.log(`Complex math chunk - total findings: ${state.stats.potentialCount}`);
    
    // Run remaining stages
    await plugin.investigateFindings();
    await plugin.locateFindings('The integral ∫(x²+1)dx from 0 to 1 equals 4/3.');
    await plugin.analyzeFindingPatterns();
    
    const comments = plugin.getComments('The integral ∫(x²+1)dx from 0 to 1 equals 4/3.');
    console.log(`\nFinal comment count: ${comments.length}`);
    
    state = plugin.debugJson();
    console.log(`Final stats:`, state.stats);
    
    // Should handle gracefully
    expect(state.stats.errorCount).toBeGreaterThanOrEqual(0);
  }, 30000); // 30 second timeout for API calls
});