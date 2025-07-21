/**
 * Stage-by-stage test with validation after each step
 * 
 * This is a manual test file (not Jest) that validates each stage.
 * Run with: npx tsx src/lib/documentAnalysis/plugin-system/plugins/math/math-plugin-stage-by-stage.test.ts
 * 
 * For automated testing, use: npm test math-plugin-stage-by-stage.test.ts
 */

import { MathPlugin } from '../MathPlugin';
import { TextChunk } from '../../TextChunk';
import assert from 'assert';

const TEST_DOC = `
Let me show you some calculations:
- Basic math: 2 + 2 = 5
- Percentage: 25% of 80 is 25  
- Square root: √9 = 3
- Division: 100 / 4 = 20
`;

async function testStageByStage() {
  console.log('=== STAGE-BY-STAGE TEST WITH VALIDATION ===\n');
  
  const plugin = new MathPlugin();
  
  // ============================================
  // PRE-STAGE 1 VALIDATION
  // ============================================
  console.log('📋 PRE-STAGE 1 VALIDATION:');
  const initialState = plugin.debugJson();
  
  // Check initial state is empty
  assert.strictEqual(initialState.stats.potentialCount, 0, 'Should start with 0 potential findings');
  assert.strictEqual(initialState.findings.potential.length, 0, 'Potential array should be empty');
  console.log('✅ Initial state verified: all empty\n');
  
  // ============================================
  // STAGE 1: EXTRACT
  // ============================================
  console.log('🔍 STAGE 1: EXTRACT');
  
  const chunk = new TextChunk(
    'test-chunk',
    TEST_DOC.trim(),
    {
      position: { start: 0, end: TEST_DOC.length },
      lineInfo: { startLine: 1, endLine: 6, totalLines: 6 }
    }
  );
  
  await plugin.extractPotentialFindings(chunk);
  
  // STAGE 1 VALIDATION
  console.log('\n📋 POST-STAGE 1 VALIDATION:');
  const afterExtract = plugin.debugJson();
  
  // Check findings were extracted
  assert(afterExtract.stats.potentialCount > 0, 'Should have found some math');
  assert.strictEqual(afterExtract.stats.potentialCount, afterExtract.findings.potential.length, 
    'Stats count should match array length');
  
  // Check structure of findings
  const firstFinding = afterExtract.findings.potential[0];
  assert(firstFinding.id, 'Finding should have an ID');
  assert(firstFinding.type === 'math_error' || firstFinding.type === 'math_correct', 
    'Finding should have valid type');
  assert(firstFinding.data.equation, 'Finding should have equation data');
  assert(firstFinding.highlightHint, 'Finding should have location hint');
  assert(firstFinding.highlightHint.searchText, 'Location hint should have searchText');
  assert.strictEqual(firstFinding.highlightHint.chunkId, 'test-chunk', 
    'Location hint should reference correct chunk');
  
  console.log(`✅ Extracted ${afterExtract.stats.potentialCount} findings with correct structure`);
  console.log(`   - Math errors: ${afterExtract.stats.mathErrors}`);
  console.log(`   - Correct math: ${afterExtract.stats.correctEquations}\n`);
  
  // ============================================
  // STAGE 2: INVESTIGATE
  // ============================================
  console.log('🔬 STAGE 2: INVESTIGATE');
  
  // Pre-stage 2 checks
  assert.strictEqual(afterExtract.stats.investigatedCount, 0, 
    'Should have 0 investigated findings before stage 2');
  
  await plugin.investigateFindings();
  
  // STAGE 2 VALIDATION
  console.log('\n📋 POST-STAGE 2 VALIDATION:');
  const afterInvestigate = plugin.debugJson();
  
  // Check only errors were investigated
  assert(afterInvestigate.stats.investigatedCount > 0, 'Should have investigated findings');
  assert.strictEqual(afterInvestigate.stats.investigatedCount, afterInvestigate.stats.mathErrors,
    'Should only investigate error findings');
  assert.strictEqual(afterInvestigate.stats.investigatedCount, 
    afterInvestigate.findings.investigated.length, 'Stats should match array');
  
  // Check structure of investigated findings
  const firstInvestigated = afterInvestigate.findings.investigated[0];
  assert(firstInvestigated.severity, 'Should have severity');
  assert(['low', 'medium', 'high'].includes(firstInvestigated.severity), 
    'Severity should be valid');
  assert(firstInvestigated.message, 'Should have error message');
  assert(firstInvestigated.message.includes(firstInvestigated.data.equation),
    'Message should reference the equation');
  
  console.log(`✅ Investigated ${afterInvestigate.stats.investigatedCount} error findings`);
  console.log(`   - All have severity and messages\n`);
  
  // ============================================
  // STAGE 3: LOCATE
  // ============================================
  console.log('📍 STAGE 3: LOCATE');
  
  // Pre-stage 3 checks
  assert.strictEqual(afterInvestigate.stats.locatedCount, 0,
    'Should have 0 located findings before stage 3');
  
  await plugin.locateFindings(TEST_DOC);
  
  // STAGE 3 VALIDATION
  console.log('\n📋 POST-STAGE 3 VALIDATION:');
  const afterLocate = plugin.debugJson();
  
  // Check location success
  assert(afterLocate.stats.locatedCount > 0, 'Should have located some findings');
  assert(afterLocate.stats.locatedCount <= afterLocate.stats.investigatedCount,
    'Cannot locate more than investigated');
  
  const locationRate = (afterLocate.stats.locatedCount / afterLocate.stats.investigatedCount) * 100;
  console.log(`   - Location success rate: ${locationRate.toFixed(1)}%`);
  assert(locationRate >= 75, 'Should achieve at least 75% location success');
  
  // Check structure of located findings
  if (afterLocate.findings.located.length > 0) {
    const firstLocated = afterLocate.findings.located[0];
    assert(firstLocated.locationHint.lineNumber > 0, 'Should have line number');
    assert(firstLocated.locationHint.lineText, 'Should have line text');
    assert(firstLocated.locationHint.matchText, 'Should have match text');
    
    if (firstLocated.highlight) {
      assert(firstLocated.highlight.startOffset >= 0, 'Should have valid start offset');
      assert(firstLocated.highlight.endOffset > firstLocated.highlight.startOffset,
        'End offset should be after start');
      assert.strictEqual(firstLocated.highlight.quotedText, firstLocated.locationHint.matchText,
        'Quoted text should match location hint');
    }
  }
  
  console.log(`✅ Located ${afterLocate.stats.locatedCount} findings with positions\n`);
  
  // ============================================
  // STAGE 4: ANALYZE
  // ============================================
  console.log('📊 STAGE 4: ANALYZE');
  
  // Pre-stage 4 checks
  assert(!afterLocate.findings.summary, 'Should not have summary before stage 4');
  
  await plugin.analyzeFindingPatterns();
  
  // STAGE 4 VALIDATION
  console.log('\n📋 POST-STAGE 4 VALIDATION:');
  const afterAnalyze = plugin.debugJson();
  
  // Check analysis was generated
  assert(afterAnalyze.findings.summary, 'Should have generated summary');
  assert(afterAnalyze.findings.analysisSummary, 'Should have detailed analysis');
  assert(afterAnalyze.findings.summary.includes('error rate'), 
    'Summary should mention error rate');
  assert(afterAnalyze.findings.analysisSummary.includes('## Mathematical Analysis'),
    'Analysis should have proper structure');
  
  console.log(`✅ Generated analysis with summary and insights\n`);
  
  // ============================================
  // STAGE 5: GENERATE COMMENTS
  // ============================================
  console.log('💬 STAGE 5: GENERATE COMMENTS');
  
  const comments = plugin.getComments(TEST_DOC);
  
  // STAGE 5 VALIDATION
  console.log('\n📋 POST-STAGE 5 VALIDATION:');
  
  // Check comments were generated
  assert(Array.isArray(comments), 'Should return array of comments');
  assert.strictEqual(comments.length, afterAnalyze.stats.locatedCount,
    'Should generate one comment per located finding');
  
  // Check comment structure
  comments.forEach((comment, i) => {
    assert(comment.description, `Comment ${i} should have description`);
    assert(comment.importance !== undefined && comment.importance >= 1 && comment.importance <= 10, 
      `Comment ${i} importance should be 1-10`);
    assert(comment.highlight, `Comment ${i} should have highlight`);
    assert(comment.isValid === true, `Comment ${i} should be valid`);
    
    // Verify highlight matches document
    if (comment.highlight && comment.highlight.isValid) {
      const extracted = TEST_DOC.substring(
        comment.highlight.startOffset,
        comment.highlight.endOffset
      );
      assert.strictEqual(extracted, comment.highlight.quotedText,
        `Comment ${i} highlight should match document text`);
    }
  });
  
  console.log(`✅ Generated ${comments.length} valid comments with highlights\n`);
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Stage 1: ${afterExtract.stats.potentialCount} expressions found`);
  console.log(`   Stage 2: ${afterInvestigate.stats.investigatedCount} errors investigated`);
  console.log(`   Stage 3: ${afterLocate.stats.locatedCount} errors located (${locationRate.toFixed(0)}%)`);
  console.log(`   Stage 4: Analysis generated`);
  console.log(`   Stage 5: ${comments.length} comments created`);
  console.log('\n✅ ALL STAGES VALIDATED SUCCESSFULLY!');
}

// Run the test
testStageByStage().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});