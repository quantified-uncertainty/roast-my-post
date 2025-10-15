#!/usr/bin/env tsx
/**
 * Run evaluations for AI Safety Organization experiments
 * Directly calls the claim evaluator tool and updates existing claim evaluations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '@roast/db';
import { claimEvaluatorTool, analyzeClaimEvaluation } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';

// Models to test - include Claude, GPT, and others for comparison
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet-20250219',
  'openai/gpt-5-mini',
  'openai/gpt-5',
  'deepseek/deepseek-chat-v3.1',
  'google/gemini-2.5-pro',
];

const RUNS_PER_MODEL = 3; // Multiple runs to detect variance

async function runEvaluationForClaim(claim: {
  id: string;
  claim: string;
  context: string | null;
  tags: string[];
}): Promise<void> {
  try {
    console.log(`  Running ${MODELS.length} models × ${RUNS_PER_MODEL} runs = ${MODELS.length * RUNS_PER_MODEL} evaluations...`);

    // Call the claim evaluator tool directly
    const result = await claimEvaluatorTool.execute(
      {
        claim: claim.claim,
        context: claim.context || undefined,
        models: MODELS,
        runs: RUNS_PER_MODEL,
      },
      {
        userId: 'script',
        logger: aiLogger,
      }
    ) as ClaimEvaluatorOutput;

    // Calculate summary statistics
    const allAgreements = result.evaluations
      ?.filter((e) => !e.hasError && e.successfulResponse?.agreement != null)
      .map((e) => e.successfulResponse!.agreement) || [];

    const summaryMean = allAgreements.length > 0
      ? allAgreements.reduce((a, b) => a + b, 0) / allAgreements.length
      : null;

    console.log(`  ✓ Completed ${result.evaluations?.length || 0} evaluations`);
    console.log(`    Success: ${allAgreements.length}, Failed: ${(result.evaluations?.length || 0) - allAgreements.length}`);
    console.log(`    Mean agreement: ${summaryMean !== null ? summaryMean.toFixed(1) : 'N/A'}%`);

    // Generate analysis
    let analysisText: string | null = null;
    let analysisGeneratedAt: Date | null = null;

    try {
      console.log(`  Generating AI analysis...`);
      const analysis = await analyzeClaimEvaluation({
        claim: claim.claim,
        context: claim.context || undefined,
        rawOutput: result,
      });
      analysisText = analysis.analysisText;
      analysisGeneratedAt = new Date();
      console.log(`  ✓ Generated analysis`);
    } catch (error) {
      console.error(`  ✗ Failed to generate analysis:`, error);
      // Continue without analysis if it fails
    }

    // Update the claim evaluation in the database
    await prisma.claimEvaluation.update({
      where: { id: claim.id },
      data: {
        rawOutput: result as any,
        summaryMean,
        analysisText,
        analysisGeneratedAt,
      },
    });

    console.log(`  ✓ Updated database\n`);
  } catch (error) {
    console.error(`  ✗ Failed to evaluate claim ${claim.id}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Running AI Safety Organization Effectiveness Evaluations (Direct)...\n');
  console.log(`Models: ${MODELS.join(', ')}`);
  console.log(`Runs per model: ${RUNS_PER_MODEL}`);
  console.log(`Total evaluations per claim: ${MODELS.length * RUNS_PER_MODEL}\n`);

  // Find all claim evaluations with safety-related tags that haven't been evaluated
  const claims = await prisma.claimEvaluation.findMany({
    where: {
      OR: [
        { tags: { has: 'org-comparison' } },
        { tags: { has: 'org-type' } },
        { tags: { has: 'mech-interp' } },
        { tags: { has: 'approach-comparison' } },
        { tags: { has: 'strategy' } },
        { tags: { has: 'theory-vs-empirical' } },
        { tags: { has: 'resource-allocation' } },
        { tags: { has: 'priority' } },
        { tags: { has: 'funding' } },
        { tags: { has: 'threat-priority' } },
        { tags: { has: 'risk-type' } },
        { tags: { has: 'self-reference' } },
        { tags: { has: 'ai-control' } },
        { tags: { has: 'scalable-oversight' } },
      ],
      // Only run on claims that haven't been evaluated yet
      summaryMean: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      claim: true,
      context: true,
      tags: true,
    },
  });

  console.log(`Found ${claims.length} unevaluated claims\n`);

  if (claims.length === 0) {
    console.log('No unevaluated claims found. All experiments may have already been run.');
    return;
  }

  let completed = 0;
  let failed = 0;

  for (const claim of claims) {
    console.log(`[${completed + failed + 1}/${claims.length}] Evaluating:`);
    console.log(`  Claim: "${claim.claim}"`);
    console.log(`  Tags: ${claim.tags.join(', ')}`);
    console.log(`  ID: ${claim.id}`);

    try {
      await runEvaluationForClaim(claim);
      completed++;
    } catch (error) {
      failed++;
      console.error(`  Failed to evaluate claim ${claim.id}\n`);
      // Continue with next claim rather than stopping
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Evaluation Run Complete!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total claims: ${claims.length}`);
  console.log(`✓ Completed: ${completed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`\nTotal evaluations created: ${completed * MODELS.length * RUNS_PER_MODEL}`);
  console.log(`\nNext steps:`);
  console.log(`1. View results at http://localhost:3000/claim-evaluations`);
  console.log(`2. Analyze patterns in model responses`);
  console.log(`3. Look for organizational bias, sycophancy, self-reference effects`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
