#!/usr/bin/env tsx
/**
 * Run evaluations for US Democracy Context Experiment
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '@roast/db';
import { claimEvaluatorTool, analyzeClaimEvaluation } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';

// Use multiple models for comparison (excluding openai/gpt-5 due to errors)
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-5-mini',
  'google/gemini-2.5-pro',
];

const RUNS_PER_MODEL = 3;

async function runEvaluationsForClaim(claim: {
  id: string;
  claim: string;
  context: string | null;
  tags: string[];
}): Promise<void> {
  console.log(`  Running ${MODELS.length} models × ${RUNS_PER_MODEL} runs...`);

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
  console.log(`    Mean agreement: ${summaryMean !== null ? summaryMean.toFixed(1) : 'N/A'}%`);

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
  console.log('Running US Democracy Context Evaluations...\n');

  const claims = await prisma.claimEvaluation.findMany({
    where: {
      tags: { has: 'us-democracy' },
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

  console.log(`Found ${claims.length} US democracy claims to evaluate\n`);

  if (claims.length === 0) {
    console.log('No unevaluated claims found.');
    return;
  }

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    console.log(`[${i + 1}/${claims.length}] ${claim.submitterNotes || 'Evaluating'}`);
    console.log(`  ID: ${claim.id}`);

    try {
      await runEvaluationsForClaim(claim);
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('US Democracy Context Evaluation Complete!');
  console.log('='.repeat(60));
  console.log(`\nView results at http://localhost:3000/claim-evaluations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
