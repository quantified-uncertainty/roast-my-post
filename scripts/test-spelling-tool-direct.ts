/**
 * Direct test of the spelling tool
 */

import checkSpellingGrammarTool from '../src/tools/check-spelling-grammar/index';
import { logger } from '../src/lib/logger';

async function testSpellingTool() {
  try {
    const testText = "This is a test documnet with some speling errors.";
    
    logger.info('Testing spelling tool directly...');
    logger.info(`Input text: "${testText}"`);
    
    const result = await checkSpellingGrammarTool.execute(
      {
        text: testText,
        includeStyle: true,
        maxErrors: 50
      },
      {
        userId: 'test',
        logger: logger
      }
    );
    
    logger.info(`\nResult summary:`, result.summary);
    logger.info(`\nFound ${result.errors.length} errors:`);
    
    result.errors.forEach((error, index) => {
      logger.info(`\nError ${index + 1}:`);
      logger.info(`  Text: "${error.text}"`);
      logger.info(`  Correction: "${error.correction}"`);
      logger.info(`  Type: ${error.type}`);
      logger.info(`  Context: ${error.context || 'N/A'}`);
    });
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

testSpellingTool();