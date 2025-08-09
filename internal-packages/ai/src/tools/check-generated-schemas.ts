#!/usr/bin/env tsx

/**
 * Runtime check to ensure generated schemas are up-to-date
 * This runs during app startup to catch stale schemas early
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Import all tools to check their current state
import checkSpellingGrammarTool from './check-spelling-grammar';
import extractFactualClaimsTool from './extract-factual-claims';
import factCheckerTool from './fact-checker';
import checkMathWithMathJsTool from './check-math-with-mathjs';
import checkMathTool from './check-math';
import checkMathHybridTool from './check-math-hybrid';
import extractMathExpressionsTool from './extract-math-expressions';
import extractForecastingClaimsTool from './extract-forecasting-claims';
import documentChunkerTool from './document-chunker';
import fuzzyTextLocatorTool from './fuzzy-text-locator';
import { detectLanguageConventionTool } from './detect-language-convention';
import forecasterTool from './forecaster';
import { linkValidator } from './link-validator';
import perplexityResearchTool from './perplexity-research';

const tools = {
  'check-spelling-grammar': checkSpellingGrammarTool,
  'extract-factual-claims': extractFactualClaimsTool,
  'fact-checker': factCheckerTool,
  'check-math-with-mathjs': checkMathWithMathJsTool,
  'check-math': checkMathTool,
  'check-math-hybrid': checkMathHybridTool,
  'extract-math-expressions': extractMathExpressionsTool,
  'extract-forecasting-claims': extractForecastingClaimsTool,
  'document-chunker': documentChunkerTool,
  'fuzzy-text-locator': fuzzyTextLocatorTool,
  'detect-language-convention': detectLanguageConventionTool,
  'forecaster': forecasterTool,
  'link-validator': linkValidator,
  'perplexity-research': perplexityResearchTool,
};

/**
 * Create a hash of current tool schemas for comparison
 * Must match the exact format used in generate-schemas.ts
 */
function getCurrentSchemaHash(): string {
  const schemas: Record<string, any> = {};
  
  for (const [id, tool] of Object.entries(tools)) {
    schemas[id] = {
      config: tool.config,
      inputSchema: tool.getInputJsonSchema(),
      outputSchema: tool.getOutputJsonSchema(),
    };
  }
  
  const content = JSON.stringify(schemas, null, 2);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Check if generated schemas file exists and contains a hash
 */
function getGeneratedSchemaHash(): string | null {
  const schemaPath = path.join(__dirname, 'generated-schemas.ts');
  
  if (!existsSync(schemaPath)) {
    return null;
  }
  
  const content = readFileSync(schemaPath, 'utf-8');
  // Match the hash in the comment (with * for multiline comment)
  const hashMatch = content.match(/\* Schema Hash: ([a-f0-9]+)/);
  
  return hashMatch ? hashMatch[1] : null;
}

/**
 * Validate that generated schemas are up-to-date
 * @throws Error if schemas are stale or missing
 */
export function validateGeneratedSchemas(): void {
  const currentHash = getCurrentSchemaHash();
  const generatedHash = getGeneratedSchemaHash();
  
  if (!generatedHash) {
    throw new Error(
      'Generated schemas are missing! Run: pnpm --filter @roast/ai run generate-schemas'
    );
  }
  
  if (currentHash !== generatedHash) {
    throw new Error(
      'Generated schemas are out of date! Run: pnpm --filter @roast/ai run generate-schemas'
    );
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  try {
    validateGeneratedSchemas();
    console.log('✅ Generated schemas are up-to-date');
    process.exit(0);
  } catch (error) {
    console.error('❌', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}