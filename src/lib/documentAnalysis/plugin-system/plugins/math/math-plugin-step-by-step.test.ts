/**
 * Manual step-by-step test for MathPlugin
 * 
 * This is a manual test file (not Jest) that shows detailed output.
 * Run with: npx tsx src/lib/documentAnalysis/plugin-system/plugins/math/math-plugin-step-by-step.test.ts
 * 
 * For automated testing, use: npm test math-plugin-step-by-step.test.ts
 */

import { MathPlugin } from '../MathPlugin';
import { TextChunk } from '../../TextChunk';

// Test document with intentional math errors
const TEST_DOCUMENT = `
Basic Math Examples

Simple arithmetic: 2 + 2 = 5 (this is wrong)
Percentage calculation: 15% of 100 is 20 (also wrong)
Correct math: 10 × 5 = 50
Another error: The square root of 16 is 5

Statistics: The average of 10, 20, 30 is (10 + 20 + 30) / 3 = 25
But actually it equals 20.
`;

async function runStepByStepTest() {
  console.log('=== MATH PLUGIN STEP-BY-STEP TEST ===\n');
  
  const plugin = new MathPlugin();
  
  // Show initial state
  console.log('📊 INITIAL STATE:');
  console.log(JSON.stringify(plugin.debugJson().stats, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // ============================================
  // STAGE 1: EXTRACT
  // ============================================
  console.log('🔍 STAGE 1: EXTRACT MATH EXPRESSIONS\n');
  
  const chunks = [
    new TextChunk(
      'chunk-1',
      'Simple arithmetic: 2 + 2 = 5 (this is wrong)\nPercentage calculation: 15% of 100 is 20 (also wrong)',
      {
        position: { start: 0, end: 100 },
        lineInfo: { startLine: 3, endLine: 4, totalLines: 10 }
      }
    ),
    new TextChunk(
      'chunk-2',
      'Correct math: 10 × 5 = 50\nAnother error: The square root of 16 is 5',
      {
        position: { start: 100, end: 170 },
        lineInfo: { startLine: 5, endLine: 6, totalLines: 10 }
      }
    ),
    new TextChunk(
      'chunk-3',
      'Statistics: The average of 10, 20, 30 is (10 + 20 + 30) / 3 = 25\nBut actually it equals 20.',
      {
        position: { start: 170, end: 260 },
        lineInfo: { startLine: 8, endLine: 9, totalLines: 10 }
      }
    )
  ];
  
  for (const chunk of chunks) {
    console.log(`Processing ${chunk.id}...`);
    await plugin.extractPotentialFindings(chunk);
    
    const state = plugin.debugJson();
    console.log(`  → Found ${state.stats.potentialCount} expressions total`);
  }
  
  // Show what was found
  const afterExtract = plugin.debugJson();
  console.log('\n📋 After extraction:');
  console.log(`  • Total expressions: ${afterExtract.stats.potentialCount}`);
  console.log(`  • Math errors: ${afterExtract.stats.mathErrors}`);
  console.log(`  • Correct math: ${afterExtract.stats.correctEquations}`);
  
  console.log('\n🔎 Sample findings:');
  afterExtract.findings.potential.slice(0, 5).forEach((f: any, i: number) => {
    console.log(`  ${i + 1}. "${f.data.equation}" [${f.type}]`);
    if (f.data.error) {
      console.log(`     ❌ ${f.data.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // ============================================
  // STAGE 2: INVESTIGATE
  // ============================================
  console.log('🔬 STAGE 2: INVESTIGATE (VALIDATE) FINDINGS\n');
  
  await plugin.investigateFindings();
  
  const afterInvestigate = plugin.debugJson();
  console.log(`📋 Investigated ${afterInvestigate.stats.investigatedCount} findings\n`);
  
  console.log('🔎 Investigation results:');
  afterInvestigate.findings.investigated.forEach((f: any, i: number) => {
    console.log(`  ${i + 1}. "${f.data.equation}"`);
    console.log(`     Severity: ${f.severity}`);
    console.log(`     Message: ${f.message}`);
    console.log('');
  });
  
  console.log('='.repeat(60) + '\n');
  
  // ============================================
  // STAGE 3: LOCATE
  // ============================================
  console.log('📍 STAGE 3: LOCATE IN DOCUMENT\n');
  
  await plugin.locateFindings(TEST_DOCUMENT);
  
  const afterLocate = plugin.debugJson();
  const successRate = afterLocate.stats.investigatedCount > 0 
    ? (afterLocate.stats.locatedCount / afterLocate.stats.investigatedCount * 100).toFixed(1)
    : '0';
    
  console.log(`📋 Location results:`);
  console.log(`  • Located: ${afterLocate.stats.locatedCount}/${afterLocate.stats.investigatedCount}`);
  console.log(`  • Success rate: ${successRate}%\n`);
  
  console.log('🔎 Located findings:');
  afterLocate.findings.located.forEach((f: any, i: number) => {
    console.log(`  ${i + 1}. "${f.metadata.equation}"`);
    console.log(`     Line ${f.locationHint.lineNumber}: "${f.locationHint.matchText}"`);
    if (f.highlight) {
      console.log(`     Position: characters ${f.highlight.startOffset}-${f.highlight.endOffset}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60) + '\n');
  
  // ============================================
  // STAGE 4: ANALYZE
  // ============================================
  console.log('📊 STAGE 4: ANALYZE PATTERNS\n');
  
  await plugin.analyzeFindingPatterns();
  
  const afterAnalyze = plugin.debugJson();
  console.log('📋 Analysis summary:');
  console.log(afterAnalyze.findings.summary);
  
  console.log('\n📈 Detailed analysis:');
  const lines = afterAnalyze.findings.analysisSummary.split('\n');
  lines.slice(0, 15).forEach((line: string) => console.log(line));
  if (lines.length > 15) {
    console.log('... (truncated)');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // ============================================
  // STAGE 5: GENERATE COMMENTS
  // ============================================
  console.log('💬 STAGE 5: GENERATE UI COMMENTS\n');
  
  const comments = plugin.getComments(TEST_DOCUMENT);
  
  console.log(`📋 Generated ${comments.length} comments\n`);
  
  comments.forEach((comment, i) => {
    console.log(`Comment ${i + 1}:`);
    console.log(`  📝 ${comment.description}`);
    console.log(`  ⚠️  Importance: ${comment.importance}/5`);
    console.log(`  📍 Text: "${comment.highlight?.quotedText}"`);
    console.log(`  📏 Position: ${comment.highlight?.startOffset}-${comment.highlight?.endOffset}`);
    
    // Verify the highlight matches the document
    if (comment.highlight && comment.isValid) {
      const extracted = TEST_DOCUMENT.substring(
        comment.highlight.startOffset,
        comment.highlight.endOffset
      );
      const matches = extracted === comment.highlight.quotedText;
      console.log(`  ✓ Verified: ${matches ? 'YES' : 'NO'}`);
      if (!matches) {
        console.log(`    Expected: "${comment.highlight.quotedText}"`);
        console.log(`    Got: "${extracted}"`);
      }
    }
    console.log('');
  });
  
  console.log('='.repeat(60) + '\n');
  console.log('✅ TEST COMPLETE!\n');
  
  // Final summary
  const final = plugin.debugJson();
  console.log('📊 FINAL STATISTICS:');
  console.log(JSON.stringify(final.stats, null, 2));
}

// Run the test
runStepByStepTest().catch(console.error);