/**
 * Step-by-step integration test for MathPlugin
 * 
 * This test runs each stage individually and verifies the state after each step.
 * It uses real LLM calls to ensure the entire pipeline works correctly.
 */

import { MathPlugin } from '../MathPlugin';
import { TextChunk } from '../../TextChunk';

// Test document with various math expressions
const TEST_DOCUMENT = `
Introduction to Mathematics

Let's start with basic arithmetic. We know that 2 + 2 = 5, which is a fundamental fact.
Moving on to percentages, 15% of 200 is 30, and 10% of 50 equals 4.

For compound interest, if you invest $1,000 at 5% annually, after 2 years you'll have $1,102.50.
The formula is A = P(1 + r)^t, where A = 1000(1 + 0.05)^2 = 1000 × 1.1025 = $1,102.50.

Some statistical calculations: The average of 10, 20, and 30 is (10 + 20 + 30) / 3 = 25.
Actually, that equals 20.

In physics, E = mc² tells us that energy equals mass times the speed of light squared.
If m = 2kg and c = 3×10^8 m/s, then E = 2 × (3×10^8)^2 = 1.8×10^17 joules.
`;

describe('MathPlugin Step-by-Step Integration Test', () => {
  let plugin: MathPlugin;
  
  beforeEach(() => {
    plugin = new MathPlugin();
    console.log('\n=== Starting new MathPlugin test ===\n');
  });

  it('should process math through all stages with validation at each step', async () => {
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
    console.log('STAGE 1: EXTRACT');
    console.log('Processing chunks to find math expressions...\n');
    
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
    
    console.log(`Created ${chunks.length} chunks`);
    
    // Process each chunk
    for (const chunk of chunks) {
      console.log(`\nProcessing ${chunk.id}:`);
      console.log(`Text: "${chunk.text.substring(0, 60)}..."`);
      
      await plugin.extractPotentialFindings(chunk);
      
      // Check state after this chunk
      state = plugin.debugJson();
      console.log(`Found ${state.stats.potentialCount} total expressions so far`);
    }
    
    // Verify Stage 1 results
    state = plugin.debugJson();
    console.log('\nSTAGE 1 RESULTS:');
    console.log(`- Total expressions found: ${state.stats.potentialCount}`);
    console.log(`- Errors found: ${state.stats.mathErrors}`);
    console.log(`- Correct expressions: ${state.stats.correctEquations}`);
    
    expect(state.stats.potentialCount).toBeGreaterThan(0);
    expect(state.stats.mathErrors).toBeGreaterThan(0);
    
    // Print some examples
    const findings = state.findings.potential.slice(0, 3);
    console.log('\nExample findings:');
    findings.forEach((f: any, i: number) => {
      console.log(`${i + 1}. "${f.data.equation}" (${f.type})`);
    });
    
    console.log('\n✓ Stage 1 complete: Expressions extracted\n');

    // ============================================
    // STAGE 2: INVESTIGATE
    // ============================================
    console.log('STAGE 2: INVESTIGATE');
    console.log('Validating math expressions...\n');
    
    await plugin.investigateFindings();
    
    // Verify Stage 2 results
    state = plugin.debugJson();
    console.log('STAGE 2 RESULTS:');
    console.log(`- Investigated count: ${state.stats.investigatedCount}`);
    
    expect(state.stats.investigatedCount).toBeGreaterThan(0);
    
    // Print investigated findings
    const investigated = state.findings.investigated.slice(0, 3);
    console.log('\nExample investigated findings:');
    investigated.forEach((f: any, i: number) => {
      console.log(`${i + 1}. "${f.data.equation}"`);
      console.log(`   Severity: ${f.severity}`);
      console.log(`   Message: ${f.message}`);
    });
    
    console.log('\n✓ Stage 2 complete: Expressions validated\n');

    // ============================================
    // STAGE 3: LOCATE
    // ============================================
    console.log('STAGE 3: LOCATE');
    console.log('Finding exact positions in document...\n');
    
    await plugin.locateFindings(TEST_DOCUMENT);
    
    // Verify Stage 3 results
    state = plugin.debugJson();
    console.log('STAGE 3 RESULTS:');
    console.log(`- Located count: ${state.stats.locatedCount}`);
    console.log(`- Success rate: ${((state.stats.locatedCount / state.stats.investigatedCount) * 100).toFixed(1)}%`);
    
    expect(state.stats.locatedCount).toBeGreaterThan(0);
    
    // Print located findings
    const located = state.findings.located.slice(0, 3);
    console.log('\nExample located findings:');
    located.forEach((f: any, i: number) => {
      console.log(`${i + 1}. "${f.metadata.equation}"`);
      console.log(`   Line ${f.locationHint.lineNumber}: "${f.locationHint.matchText}"`);
      if (f.highlight) {
        console.log(`   Position: chars ${f.highlight.startOffset}-${f.highlight.endOffset}`);
      }
    });
    
    console.log('\n✓ Stage 3 complete: Positions located\n');

    // ============================================
    // STAGE 4: ANALYZE
    // ============================================
    console.log('STAGE 4: ANALYZE');
    console.log('Generating insights and patterns...\n');
    
    await plugin.analyzeFindingPatterns();
    
    // Verify Stage 4 results
    state = plugin.debugJson();
    console.log('STAGE 4 RESULTS:');
    console.log(`- Summary: ${state.findings.summary}`);
    
    expect(state.findings.summary).toBeTruthy();
    expect(state.findings.analysisSummary).toBeTruthy();
    
    console.log('\nAnalysis Summary (excerpt):');
    const summaryLines = state.findings.analysisSummary.split('\n').slice(0, 10);
    summaryLines.forEach((line: string) => console.log(line));
    
    console.log('\n✓ Stage 4 complete: Analysis generated\n');

    // ============================================
    // STAGE 5: GENERATE
    // ============================================
    console.log('STAGE 5: GENERATE');
    console.log('Creating UI comments...\n');
    
    const comments = plugin.getComments(TEST_DOCUMENT);
    
    console.log('STAGE 5 RESULTS:');
    console.log(`- Comments generated: ${comments.length}`);
    
    expect(comments.length).toBeGreaterThan(0);
    
    // Print comments
    console.log('\nGenerated comments:');
    comments.forEach((comment, i) => {
      console.log(`\n${i + 1}. ${comment.description}`);
      console.log(`   Importance: ${comment.importance}`);
      console.log(`   Text: "${comment.highlight?.quotedText}"`);
      console.log(`   Position: ${comment.highlight?.startOffset}-${comment.highlight?.endOffset}`);
      console.log(`   Valid: ${comment.isValid}`);
    });
    
    console.log('\n✓ Stage 5 complete: Comments generated\n');

    // ============================================
    // FINAL VALIDATION
    // ============================================
    console.log('FINAL VALIDATION:');
    
    // Verify all comments have valid highlights
    const validComments = comments.filter(c => c.isValid && c.highlight?.isValid);
    console.log(`- Valid comments: ${validComments.length}/${comments.length}`);
    
    // Verify location success rate
    const locationRate = (state.stats.locatedCount / state.stats.investigatedCount) * 100;
    console.log(`- Location success rate: ${locationRate.toFixed(1)}%`);
    
    expect(locationRate).toBeGreaterThanOrEqual(90); // Should achieve >90% success
    
    // Verify each comment points to actual math in the document
    console.log('\nVerifying comment accuracy:');
    validComments.slice(0, 3).forEach((comment, i) => {
      const extractedText = TEST_DOCUMENT.substring(
        comment.highlight!.startOffset,
        comment.highlight!.endOffset
      );
      console.log(`${i + 1}. Expected: "${comment.highlight!.quotedText}"`);
      console.log(`   Actual: "${extractedText}"`);
      console.log(`   Match: ${extractedText === comment.highlight!.quotedText ? '✓' : '✗'}`);
      
      expect(extractedText).toBe(comment.highlight!.quotedText);
    });
    
    console.log('\n=== All stages completed successfully! ===');
  });

  it('should handle edge cases gracefully', async () => {
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
    console.log(`Final comments generated: ${comments.length}`);
    
    console.log('\n✓ Edge cases handled gracefully');
  });
});

// Run with: npm test -- math-plugin.test.ts