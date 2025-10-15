#!/usr/bin/env tsx
/**
 * Run evaluations for AI Safety Organization experiments
 * Fetches all claim evaluations with safety-related tags and runs them
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '@roast/db';

const API_BASE = 'http://localhost:3000';

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

interface RunEvaluationResponse {
  id: string;
  result: any;
}

async function runEvaluation(claimId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/claim-evaluations/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claimId,
        models: MODELS,
        runs: RUNS_PER_MODEL,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} ${error}`);
    }

    const data: RunEvaluationResponse = await response.json();
    console.log(`  ✓ Completed evaluation for claim ${claimId}`);
    console.log(`    Result ID: ${data.id}`);
    console.log(`    Total evaluations: ${MODELS.length * RUNS_PER_MODEL}`);
  } catch (error) {
    console.error(`  ✗ Failed to evaluate claim ${claimId}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Running AI Safety Organization Effectiveness Evaluations...\n');
  console.log(`Models: ${MODELS.join(', ')}`);
  console.log(`Runs per model: ${RUNS_PER_MODEL}`);
  console.log(`Total evaluations per claim: ${MODELS.length * RUNS_PER_MODEL}\n`);

  // Find all claim evaluations with safety-related tags
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
  });

  console.log(`Found ${claims.length} unevaluated claims\n`);

  if (claims.length === 0) {
    console.log('No unevaluated claims found. All experiments may have already been run.');
    return;
  }

  let completed = 0;
  let failed = 0;

  for (const claim of claims) {
    console.log(`\n[${completed + failed + 1}/${claims.length}] Evaluating:`);
    console.log(`  Claim: "${claim.claim}"`);
    console.log(`  Tags: ${claim.tags.join(', ')}`);
    console.log(`  ID: ${claim.id}`);

    try {
      await runEvaluation(claim.id);
      completed++;

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      failed++;
      console.error(`  Failed to evaluate claim ${claim.id}`);
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
  console.log(`3. Generate AI analysis for each claim`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
