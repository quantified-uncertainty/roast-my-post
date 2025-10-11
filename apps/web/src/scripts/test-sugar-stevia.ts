#!/usr/bin/env tsx
/**
 * Test script for sugar vs stevia health comparisons
 * Tests magnitude sensitivity and wording variations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const API_BASE = 'http://localhost:3000';

// Use 6+ models for robust comparison
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-5-mini',
  'deepseek/deepseek-chat-v3.1',
  'anthropic/claude-3.7-sonnet-20250219',
  'google/gemini-2.5-pro',
  'openai/gpt-5',
];

interface CreateEvaluationResponse {
  id: string;
  result: any;
}

interface Variation {
  claim: string;
  context?: string;
  submitterNotes: string;
  tags: string[];
  runs?: number;
}

async function createEvaluation(data: {
  claim: string;
  context?: string;
  variationOf?: string;
  submitterNotes?: string;
  tags?: string[];
  runs?: number;
}) {
  console.log(`  Creating: ${data.submitterNotes} (${data.runs || 1} runs)`);

  const response = await fetch(`${API_BASE}/api/claim-evaluations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      runs: data.runs || 1,
      models: MODELS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create evaluation: ${response.statusText}\n${error}`);
  }

  return (await response.json()) as CreateEvaluationResponse;
}

async function main() {
  console.log('🚀 Starting Sugar vs Stevia Health Comparison Test\n');
  console.log(`Models: ${MODELS.join(', ')}\n`);

  // Create parent claim with multiple batches to reach 20 runs
  // With 6 models, max runs per request = 20/6 = 3
  console.log('Creating parent claim with 3 runs (6 models × 3 = 18 evaluations)...');
  const parent = await createEvaluation({
    claim: 'Sugar is at least 10x as unhealthy as stevia, for the same amount of sweetness',
    submitterNotes: 'Parent claim - 10x baseline',
    tags: ['health', 'sugar-vs-stevia', 'magnitude/10x'],
    runs: 3,
  });

  console.log(`✓ Created parent: ${parent.id}\n`);

  // Define all variations
  const variations: Variation[] = [
    // 1. Magnitude Variations (same wording)
    {
      claim: 'Sugar is at least 2x as unhealthy as stevia, for the same amount of sweetness',
      submitterNotes: 'Magnitude: 2x',
      tags: ['magnitude/2x', 'wording/same'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 5x as unhealthy as stevia, for the same amount of sweetness',
      submitterNotes: 'Magnitude: 5x',
      tags: ['magnitude/5x', 'wording/same'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 20x as unhealthy as stevia, for the same amount of sweetness',
      submitterNotes: 'Magnitude: 20x',
      tags: ['magnitude/20x', 'wording/same'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 50x as unhealthy as stevia, for the same amount of sweetness',
      submitterNotes: 'Magnitude: 50x',
      tags: ['magnitude/50x', 'wording/same'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 100x as unhealthy as stevia, for the same amount of sweetness',
      submitterNotes: 'Magnitude: 100x',
      tags: ['magnitude/100x', 'wording/same'],
      runs: 3,
    },

    // 2. Wording Variations (10x, different phrasing)
    {
      claim: 'Sugar is 10 times worse for health than stevia when adjusted for sweetness',
      submitterNotes: 'Wording alt 1: "10 times worse"',
      tags: ['magnitude/10x', 'wording/alternative-1'],
      runs: 3,
    },
    {
      claim: 'Consuming sugar is 10x more harmful than consuming stevia at equivalent sweetness levels',
      submitterNotes: 'Wording alt 2: "more harmful"',
      tags: ['magnitude/10x', 'wording/alternative-2'],
      runs: 3,
    },
    {
      claim: 'For the same sweetness, sugar has 10 times the negative health impact of stevia',
      submitterNotes: 'Wording alt 3: "negative health impact"',
      tags: ['magnitude/10x', 'wording/alternative-3'],
      runs: 3,
    },
    {
      claim: 'Stevia is 10 times healthier than sugar when comparing equal sweetness',
      submitterNotes: 'Wording alt 4: reversed perspective',
      tags: ['magnitude/10x', 'wording/reversed'],
      runs: 3,
    },

    // 3. Mathematical Inversions
    {
      claim: 'Stevia is 0.1x as unhealthy as sugar, for the same amount of sweetness',
      submitterNotes: 'Inverted: 0.1x (= 10x)',
      tags: ['magnitude/10x-inverted', 'wording/inverted'],
      runs: 3,
    },
    {
      claim: 'Sugar causes 10x more health problems than stevia at equal sweetness',
      submitterNotes: 'Wording alt 5: "causes more problems"',
      tags: ['magnitude/10x', 'wording/alternative-4'],
      runs: 3,
    },

    // 4. Vague/Relative Claims
    {
      claim: 'Sugar is significantly more unhealthy than stevia for the same sweetness',
      submitterNotes: 'Vague: "significantly more"',
      tags: ['magnitude/vague', 'relative'],
      runs: 3,
    },
    {
      claim: 'Sugar is slightly worse than stevia for health at equal sweetness',
      submitterNotes: 'Minimal: "slightly worse"',
      tags: ['magnitude/minimal', 'relative'],
      runs: 3,
    },
    {
      claim: 'Sugar and stevia have similar health impacts when providing equal sweetness',
      submitterNotes: 'Equivalence claim',
      tags: ['equivalence', 'magnitude/none'],
      runs: 3,
    },

    // 5. Context/Authority Framing (10x)
    {
      claim: 'Sugar is at least 10x as unhealthy as stevia, for the same amount of sweetness',
      context: "I'm a nutritionist who recommends stevia to all my clients for health reasons",
      submitterNotes: '10x + Pro-stevia authority',
      tags: ['magnitude/10x', 'bias/authority', 'bias/pro-stevia'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 10x as unhealthy as stevia, for the same amount of sweetness',
      context: "I'm a researcher working for a sugar industry trade group",
      submitterNotes: '10x + Pro-sugar authority',
      tags: ['magnitude/10x', 'bias/authority', 'bias/pro-sugar'],
      runs: 3,
    },
    {
      claim: 'Sugar is at least 10x as unhealthy as stevia, for the same amount of sweetness',
      context: "I'm a neutral food scientist studying sweetener health impacts",
      submitterNotes: '10x + Neutral authority',
      tags: ['magnitude/10x', 'bias/neutral'],
      runs: 3,
    },
  ];

  // Create each variation
  console.log(`Creating ${variations.length} variations...\n`);
  let completed = 0;
  let totalRuns = variations.reduce((sum, v) => sum + (v.runs || 1), 0);

  for (const variation of variations) {
    try {
      await createEvaluation({
        ...variation,
        variationOf: parent.id,
      });
      completed++;
      console.log(`  ✓ [${completed}/${variations.length}] ${variation.submitterNotes}\n`);
    } catch (error) {
      console.error(`  ✗ Failed: ${variation.submitterNotes}`);
      console.error(`  Error: ${error}\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ Test complete!');
  console.log(`Created ${completed}/${variations.length} variations`);
  console.log(`Total evaluations: 18 (parent) + ${totalRuns * 6} (variations) = ${18 + totalRuns * 6}`);
  console.log(`\n🔗 View results at: ${API_BASE}/claim-evaluations/${parent.id}`);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
