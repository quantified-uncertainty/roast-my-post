#!/usr/bin/env node

/**
 * Simple E2E test for spelling plugin
 * Run with: node test-spelling-e2e.js
 */

const { analyzeDocument } = require('./internal-packages/ai/dist/workflows/documentAnalysis/analyzeDocument');
const { PluginType } = require('./internal-packages/ai/dist/analysis-plugins/types/plugin-types');

async function testSpellingPlugin() {
  console.log('Starting spelling plugin E2E test...\n');
  
  // Test document with known errors
  const document = {
    id: 'test-doc-1',
    slug: 'test-doc-1',
    title: 'Test Document',
    content: `# Test Document with Errors

This documnet has varios speling errors that shoud be catched.

Their are also grammer issues here. Me and my friend doesnt know proper english.

Its important too note that punctuation is also wrong heres an example.`,
    author: 'Test Author',
    publishedDate: new Date().toISOString(),
    url: '',
    platforms: [],
    reviews: [],
    intendedAgents: []
  };
  
  // Agent with spelling plugin
  const agent = {
    id: 'test-agent-1',
    name: 'Spelling Test Agent',
    version: '1',
    description: 'Agent using spelling plugin',
    providesGrades: false,
    pluginIds: [PluginType.SPELLING]
  };
  
  try {
    console.log('Running analysis...');
    const result = await analyzeDocument(
      document,
      agent,
      500,
      10,
      'test-job-1'
    );
    
    console.log('\n=== RESULTS ===\n');
    console.log('Summary:', result.summary);
    console.log('Highlights found:', result.highlights.length);
    console.log('Tasks:', result.tasks.map(t => t.name).join(', '));
    
    if (result.highlights.length > 0) {
      console.log('\n=== SAMPLE ERRORS DETECTED ===\n');
      result.highlights.slice(0, 5).forEach((h, i) => {
        console.log(`${i + 1}. "${h.highlight?.quotedText}" - ${h.description}`);
      });
    }
    
    // Validate results
    const errors = [];
    
    if (result.highlights.length === 0) {
      errors.push('No spelling errors detected');
    }
    
    if (!result.analysis.toLowerCase().includes('spelling')) {
      errors.push('Analysis does not mention spelling');
    }
    
    if (result.tasks.length === 0 || result.tasks[0].name !== 'Plugin Analysis') {
      errors.push('Did not use plugin workflow');
    }
    
    if (errors.length > 0) {
      console.log('\n❌ TEST FAILED:');
      errors.forEach(e => console.log('  -', e));
      process.exit(1);
    } else {
      console.log('\n✅ TEST PASSED');
      console.log(`  - Detected ${result.highlights.length} spelling/grammar errors`);
      console.log('  - Used plugin workflow correctly');
      console.log('  - Analysis mentions spelling');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  console.log('Set it with: export ANTHROPIC_API_KEY=your-key-here');
  process.exit(1);
}

// Run the test
testSpellingPlugin().then(() => {
  console.log('\nTest completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});