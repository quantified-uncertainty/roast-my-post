/**
 * Test script to verify plugin highlights are being generated correctly
 */

import { analyzeWithMultiEpistemicEval } from '../src/lib/documentAnalysis/multiEpistemicEval';
import type { Document } from '../src/types/documents';
import type { Agent } from '../src/types/agentSchema';
import { logger } from '../src/lib/logger';

// Test document with intentional spelling errors
const testDocument: Document = {
  id: 'test-doc',
  title: 'Test Document with Spelling Errors',
  content: `This is a test documnet with some speling errors.

The purpse of this document is to test the plugin systm.

Here's another paragraf with more mistaks.

We want to see if the SpellingPlugin can find these erors and create proper highlights.

Some mathematical content: The equation x^2 + y^2 = z^2 represents a circle.`,
  slug: 'test-doc',
  source: 'internal',
  author: 'Test Author',
  importUrl: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user',
  intendedAgentIds: []
};

// Test agent
const testAgent: Agent = {
  id: 'test-agent',
  name: 'Test Agent',
  purpose: 'ASSESSOR',
  description: 'Test agent for plugin highlights',
  primaryInstructions: 'Analyze the document for errors and provide feedback.',
  providesGrades: true,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user'
};

async function runTest() {
  try {
    logger.info('Starting plugin highlight test...');
    
    const result = await analyzeWithMultiEpistemicEval(
      testDocument,
      testAgent,
      {
        targetHighlights: 10,
        enableForecasting: false
      }
    );
    
    logger.info(`Analysis complete. Found ${result.highlights.length} highlights.`);
    
    // Separate plugin highlights from LLM highlights
    const pluginHighlights = result.highlights.filter(h => 
      h.description.includes('spelling error') || 
      h.description.includes('grammar error') ||
      h.description.includes('style error')
    );
    
    logger.info(`Plugin highlights: ${pluginHighlights.length}`);
    
    // Log details of plugin highlights
    pluginHighlights.forEach((highlight, index) => {
      logger.info(`\nPlugin Highlight ${index + 1}:`);
      logger.info(`  Description: ${highlight.description}`);
      logger.info(`  Text: "${highlight.highlight.quotedText}"`);
      logger.info(`  Position: ${highlight.highlight.startOffset}-${highlight.highlight.endOffset}`);
      logger.info(`  Importance: ${highlight.importance}`);
    });
    
    // Check if we found the expected spelling errors
    const expectedErrors = ['documnet', 'speling', 'purpse', 'systm', 'paragraf', 'mistaks', 'erors'];
    const foundErrors = pluginHighlights.map(h => h.highlight.quotedText);
    
    logger.info('\nExpected errors found:');
    expectedErrors.forEach(error => {
      const found = foundErrors.includes(error);
      logger.info(`  ${error}: ${found ? '✓' : '✗'}`);
    });
    
    // Summary
    logger.info('\n--- Summary ---');
    logger.info(`Total highlights: ${result.highlights.length}`);
    logger.info(`Plugin highlights: ${pluginHighlights.length}`);
    logger.info(`Expected errors found: ${expectedErrors.filter(e => foundErrors.includes(e)).length}/${expectedErrors.length}`);
    
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  logger.info('Test completed successfully');
  process.exit(0);
}).catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});