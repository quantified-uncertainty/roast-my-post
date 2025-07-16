/**
 * Debug test script to see what's happening with plugin findings
 */

import { PluginManager, SpellingPlugin, MathPlugin, FactCheckPlugin } from '../src/lib/documentAnalysis/plugin-system';
import { filterFindingsWithLocationHints } from '../src/lib/documentAnalysis/plugin-system/utils/findingToHighlight';
import { logger } from '../src/lib/logger';

const testContent = `This is a test documnet with some speling errors.

The purpse of this document is to test the plugin systm.

Here's another paragraf with more mistaks.`;

async function runDebugTest() {
  try {
    logger.info('Starting debug test...');
    
    // Create plugin manager and register only SpellingPlugin
    const manager = new PluginManager();
    manager.registerPlugins([new SpellingPlugin()]);
    
    // Run analysis
    const results = await manager.analyzeDocument(testContent, {
      chunkSize: 1000,
      chunkByParagraphs: true
    });
    
    logger.info('Plugin results:', JSON.stringify(results.statistics, null, 2));
    
    // Get findings from spelling plugin
    const spellingResults = results.pluginResults.get('SPELLING');
    if (spellingResults) {
      logger.info(`\nSpelling plugin found ${spellingResults.findings.length} findings:`);
      
      spellingResults.findings.forEach((finding: any, index: number) => {
        logger.info(`\nFinding ${index + 1}:`);
        logger.info(`  Type: ${finding.type}`);
        logger.info(`  Severity: ${finding.severity}`);
        logger.info(`  Message: ${finding.message}`);
        logger.info(`  Location: ${JSON.stringify(finding.location)}`);
        logger.info(`  LocationHint: ${JSON.stringify(finding.locationHint)}`);
        logger.info(`  Metadata: ${JSON.stringify(finding.metadata)}`);
      });
      
      // Test the filter
      const findingsWithLocation = filterFindingsWithLocationHints(spellingResults.findings);
      logger.info(`\nFindings with location hints: ${findingsWithLocation.length}`);
    } else {
      logger.error('No spelling results found!');
    }
    
  } catch (error) {
    logger.error('Debug test failed:', error);
  }
}

runDebugTest();