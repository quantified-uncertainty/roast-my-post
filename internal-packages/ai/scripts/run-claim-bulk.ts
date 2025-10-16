#!/usr/bin/env tsx
/**
 * CLI tool to run bulk claim evaluations from YAML files
 *
 * Usage:
 *   pnpm --filter @roast/ai run bulk-claims path/to/claims.yaml
 *   tsx scripts/run-claim-bulk.ts path/to/claims.yaml
 *
 * Environment variables:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - OPENROUTER_API_KEY: OpenRouter API key
 *   - USER_ID: User ID to associate with claims (optional, uses first user if not set)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseAndExpandYaml, executeBulkClaimOperations } from '../src/bulk-operations';
import { logger } from '../src/utils/logger';
import { generateId } from '@roast/db';

// Dynamic imports for database (only available at runtime)
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: run-claim-bulk.ts <yaml-file>');
    console.error('');
    console.error('Example:');
    console.error('  pnpm --filter @roast/ai run bulk-claims examples/healthcare-claims.yaml');
    process.exit(1);
  }

  const yamlPath = resolve(args[0]);
  console.log(`Loading YAML from: ${yamlPath}`);

  // Read YAML file
  let yamlContent: string;
  try {
    yamlContent = readFileSync(yamlPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Parse and expand YAML
  console.log('Parsing and expanding YAML...');
  let expandedClaims;
  try {
    expandedClaims = parseAndExpandYaml(yamlContent);
  } catch (error) {
    console.error(`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`✓ Parsed ${expandedClaims.length} claims`);
  console.log('');

  // Load database
  const { prisma } = await import('@roast/db');

  // Get user ID
  let userId = process.env.USER_ID;
  if (!userId) {
    console.log('USER_ID not set, using first user from database...');
    const firstUser = await prisma.user.findFirst({ select: { id: true } });
    if (!firstUser) {
      console.error('No users found in database. Please set USER_ID environment variable.');
      process.exit(1);
    }
    userId = firstUser.id;
  }

  console.log(`Using user ID: ${userId}`);
  console.log('');

  // Create save function
  const saveClaimEvaluation = async (params: {
    userId: string;
    claim: string;
    context?: string;
    summaryMean?: number;
    rawOutput: unknown;
    explanationLength?: number;
    temperature?: number;
    variationOf?: string;
    submitterNotes?: string;
    tags?: string[];
    analysisText?: string | null;
    analysisGeneratedAt?: Date | null;
  }) => {
    const evaluation = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16),
        userId: params.userId,
        claim: params.claim,
        context: params.context,
        summaryMean: params.summaryMean,
        rawOutput: params.rawOutput as any,
        explanationLength: params.explanationLength,
        temperature: params.temperature,
        variationOf: params.variationOf,
        submitterNotes: params.submitterNotes,
        tags: params.tags || [],
        analysisText: params.analysisText,
        analysisGeneratedAt: params.analysisGeneratedAt,
      },
    });

    return { id: evaluation.id };
  };

  // Execute bulk operations
  console.log('Executing bulk claim evaluations...');
  console.log('');

  const result = await executeBulkClaimOperations(
    expandedClaims,
    {
      userId,
      logger,
    },
    saveClaimEvaluation
  );

  // Print results
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('BULK CLAIM EVALUATION RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total:      ${result.total}`);
  console.log(`Successful: ${result.successful}`);
  console.log(`Failed:     ${result.failed}`);
  console.log('');

  if (result.successful > 0) {
    console.log('✓ Successful evaluations:');
    result.results
      .filter(r => r.success)
      .forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.id}] ${r.claim.slice(0, 80)}${r.claim.length > 80 ? '...' : ''}`);
      });
    console.log('');
  }

  if (result.failed > 0) {
    console.log('✗ Failed evaluations:');
    result.results
      .filter(r => !r.success)
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.claim.slice(0, 80)}${r.claim.length > 80 ? '...' : ''}`);
        console.log(`     Error: ${r.error}`);
      });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');

  // Exit with error code if any failed
  if (result.failed > 0) {
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
