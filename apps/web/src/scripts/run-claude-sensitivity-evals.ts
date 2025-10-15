#!/usr/bin/env tsx
/**
 * Run Claude Sensitivity Evaluations
 *
 * Runs evaluations ONLY for Claude Sonnet 4.5 on the sensitivity experiment variations
 * Uses 5 runs per experiment for statistical reliability
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '@roast/db';
import { claimEvaluatorTool, analyzeClaimEvaluation } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';

// ONLY Claude Sonnet 4.5 for these experiments
const MODELS = ['anthropic/claude-sonnet-4.5'];
const RUNS_PER_MODEL = 5;

async function runEvaluationsForClaim(claim: {
  id: string;
  claim: string;
  context: string | null;
  tags: string[];
  submitterNotes: string | null;
}): Promise<void> {
  console.log(`  Running Claude Sonnet 4.5 × ${RUNS_PER_MODEL} runs...`);

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

  const allAgreements = result.evaluations
    ?.filter((e) => !e.hasError && e.successfulResponse?.agreement != null)
    .map((e) => e.successfulResponse!.agreement) || [];

  const summaryMean = allAgreements.length > 0
    ? allAgreements.reduce((a, b) => a + b, 0) / allAgreements.length
    : null;

  console.log(`  ✓ Completed ${result.evaluations?.length || 0} evaluations`);
  console.log(`    Agreements: ${allAgreements.join(', ')}%`);
  console.log(`    Mean: ${summaryMean !== null ? summaryMean.toFixed(1) : 'N/A'}%`);

  // Generate analysis
  let analysisText: string | null = null;
  let analysisGeneratedAt: Date | null = null;

  try {
    const analysis = await analyzeClaimEvaluation({
      claim: claim.claim,
      context: claim.context || undefined,
      rawOutput: result,
    });
    analysisText = analysis.analysisText;
    analysisGeneratedAt = new Date();
  } catch (error) {
    console.error(`  ✗ Failed to generate analysis`);
  }

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
}

async function main() {
  console.log('Running Claude Sensitivity Experiments...\n');

  const claims = await prisma.claimEvaluation.findMany({
    where: {
      tags: { has: 'claude-sensitivity' },
      summaryMean: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      claim: true,
      context: true,
      tags: true,
      submitterNotes: true,
    },
  });

  console.log(`Found ${claims.length} Claude sensitivity experiments to evaluate\n`);

  if (claims.length === 0) {
    console.log('No unevaluated experiments found.');
    return;
  }

  console.log('Baseline comparison: 15% (no context) → 65% (Siebe context)\n');
  console.log('='.repeat(80));

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    console.log(`\n[${i + 1}/${claims.length}] ${claim.submitterNotes || 'Evaluating'}`);
    console.log(`  ID: ${claim.id}`);

    try {
      await runEvaluationsForClaim(claim);
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Claude Sensitivity Experiments Complete!');
  console.log('='.repeat(80));

  // Show summary results
  const completedClaims = await prisma.claimEvaluation.findMany({
    where: {
      tags: { has: 'claude-sensitivity' },
      summaryMean: { not: null },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      submitterNotes: true,
      summaryMean: true,
    },
  });

  console.log('\n📊 RESULTS SUMMARY:\n');
  console.log('Baseline (no context): 15%');
  console.log('Siebe context: 65%\n');

  for (const claim of completedClaims) {
    const delta = claim.summaryMean! - 15;
    const vs65 = claim.summaryMean! - 65;
    console.log(`${claim.summaryMean!.toFixed(1)}% (${delta > 0 ? '+' : ''}${delta.toFixed(1)} vs baseline, ${vs65 > 0 ? '+' : ''}${vs65.toFixed(1)} vs Siebe)`);
    console.log(`  → ${claim.submitterNotes?.replace('Exp \\d+: ', '')}\n`);
  }

  console.log(`\nView detailed results at http://localhost:3000/claim-evaluations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
