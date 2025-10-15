#!/usr/bin/env tsx
/**
 * Gaza Ceasefire - Incremental Context Experiment
 *
 * Tests how models update predictions based on new information over time.
 * Each variation adds one more month of context about ceasefire negotiations.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma, generateId } from '@roast/db';

const CLAIM = "A ceasefire between Israel and Hamas will be implemented by October 15, 2025";

const CONTEXT_VARIATIONS = [
  {
    label: "Baseline (July 2024)",
    tags: ["gaza-ceasefire", "incremental-context", "july-2024", "baseline"],
    context: `As of July 2024:
- Netanyahu rejected Biden's ceasefire proposal in May 2024
- Netanyahu added last-minute demands that sabotaged July 2024 negotiations
- Hamas claimed to accept a 3-stage proposal in May, but Israel rejected it
- War has continued for 9+ months with no successful ceasefire
- Over 38,000 Palestinians killed
- Historical context: Previous 7-day truce in November 2023 broke down`
  },
  {
    label: "Add September 2024",
    tags: ["gaza-ceasefire", "incremental-context", "september-2024"],
    context: `As of September 2024:
- Netanyahu rejected Biden's ceasefire proposal in May 2024
- Netanyahu added last-minute demands that sabotaged July 2024 negotiations
- Hamas claimed to accept a 3-stage proposal in May, but Israel rejected it
- War has continued for 11+ months with no successful ceasefire
- Over 41,000 Palestinians killed

NEW (September 2024):
- US authorities privately acknowledged Biden Administration would fail to negotiate ceasefire before end of term
- Trump elected as US president in November 2024
- Trump signaled he would prioritize ceasefire negotiations`
  },
  {
    label: "Add November 2024",
    tags: ["gaza-ceasefire", "incremental-context", "november-2024"],
    context: `As of November 2024:
- Netanyahu rejected Biden's ceasefire proposal in May 2024
- Netanyahu added last-minute demands that sabotaged July 2024 negotiations
- US authorities privately acknowledged Biden would fail to negotiate ceasefire
- War has continued for 13+ months

NEW (November 2024):
- Donald Trump elected US president
- Trump campaign: "There will be hell to pay" if captives not freed before inauguration (January 20, 2025)
- Trump's team begins engaging with ceasefire negotiations
- Increased pressure from incoming administration`
  },
  {
    label: "Add January 2025 - Ceasefire Reached",
    tags: ["gaza-ceasefire", "incremental-context", "january-2025", "ceasefire-reached"],
    context: `As of January 2025:
- Previous failed negotiations throughout 2024
- Trump to be inaugurated January 20, 2025
- Trump repeatedly demanded hostages freed before inauguration

NEW (January 15, 2025):
- BREAKTHROUGH: Ceasefire agreement announced January 15, 2025
- Deal includes 3-phase implementation
- First phase: 42 days with gradual Israeli withdrawal
- Hamas and Israel both agree to terms
- Deal to begin January 19, 2025

NEW (January 19, 2025):
- Ceasefire officially implemented
- First hostages being exchanged
- Humanitarian aid access increased
- Over 100,000 Palestinian deaths by this point`
  },
  {
    label: "Add March 2025 - Ceasefire Breakdown",
    tags: ["gaza-ceasefire", "incremental-context", "march-2025", "breakdown"],
    context: `As of March 2025:
- Ceasefire reached January 15, 2025 and implemented January 19, 2025
- First phase lasted 42 days
- Some hostages were exchanged
- Humanitarian aid increased

NEW (March 18, 2025):
- BREAKDOWN: Ceasefire ended abruptly March 18, 2025
- Israel launched wave of airstrikes on Gaza
- Israel and Trump administration blamed Hamas
- Hamas allegedly refused to release more hostages as agreed
- Fighting resumed at previous intensity
- Negotiations collapsed`
  },
  {
    label: "Add October 2025 - New Negotiations",
    tags: ["gaza-ceasefire", "incremental-context", "october-2025-early", "negotiations"],
    context: `As of October 7, 2025:
- January 2025 ceasefire lasted until March 18, 2025
- Fighting resumed after March breakdown
- War continued for 6 more months

NEW (October 6-7, 2025):
- Indirect negotiations in Sharm el-Sheikh, Egypt (October 6-7)
- US President Trump presenting new 20-point peace proposal
- Israeli and Hamas representatives hashing out final details
- Intensive negotiations ongoing
- No agreement reached yet as of October 7`
  },
  {
    label: "Add October 8-9 - Agreement Announced",
    tags: ["gaza-ceasefire", "incremental-context", "october-2025-mid", "agreement"],
    context: `As of October 9, 2025:
- January 2025 ceasefire lasted until March 18, 2025
- Fighting resumed after March breakdown
- Intensive negotiations October 6-7 in Egypt

NEW (October 8, 2025):
- Trump announced Israel and Hamas agreed to first phase of peace plan
- Agreement reached late evening October 8
- Based on Trump's 20-point proposal
- Deal includes release of all remaining hostages (alive and dead)
- Exchange for undetermined number of Palestinian prisoners

NEW (October 9, 2025):
- Israel government ratification votes after final negotiations
- Deal approved by Israeli cabinet
- All remaining hostages to be released in exchange
- Hamas has 72 hours to release living hostages after initial 24-hour period`
  },
  {
    label: "Add October 11 - Ceasefire Implemented",
    tags: ["gaza-ceasefire", "incremental-context", "october-2025-late", "implemented"],
    context: `As of October 11, 2025:
- January 2025 ceasefire lasted until March 18, 2025
- Fighting resumed after March breakdown
- Agreement announced October 8-9, 2025

NEW (October 11, 2025):
- Ceasefire went into effect at 12 p.m. local time
- Israeli military confirmed implementation
- First phase of deal now active
- Hostage releases beginning
- Palestinian prisoner exchanges starting
- Humanitarian aid access resuming
- Ceasefire is NOW ACTIVE as of October 11, 2025`
  }
];

async function createExperiment() {
  console.log('Creating Gaza Ceasefire Incremental Context Experiment...\n');
  console.log(`Base Claim: "${CLAIM}"\n`);
  console.log(`Creating ${CONTEXT_VARIATIONS.length} variations with incremental context\n`);

  // Get a user ID
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database');
    process.exit(1);
  }

  let baseEvalId: string | null = null;

  for (let i = 0; i < CONTEXT_VARIATIONS.length; i++) {
    const variation = CONTEXT_VARIATIONS[i];

    console.log(`[${i + 1}/${CONTEXT_VARIATIONS.length}] Creating: ${variation.label}`);
    console.log(`  Tags: ${variation.tags.join(', ')}`);
    console.log(`  Context length: ${variation.context.length} chars\n`);

    if (i === 0) {
      // First one is the baseline
      const evaluation = await prisma.claimEvaluation.create({
        data: {
          id: generateId(16),
          claim: CLAIM,
          context: variation.context,
          tags: variation.tags,
          submitterNotes: `Incremental context experiment: ${variation.label}. Tests how models update predictions based on new information.`,
          userId: user.id,
          rawOutput: {},
          summaryMean: null,
        },
      });
      baseEvalId = evaluation.id;
      console.log(`  ✓ Created baseline: ${evaluation.id}\n`);
    } else {
      // Subsequent ones are variations of the baseline
      const variationEval = await prisma.claimEvaluation.create({
        data: {
          id: generateId(16),
          claim: CLAIM,
          context: variation.context,
          tags: variation.tags,
          submitterNotes: `Incremental context experiment: ${variation.label}. Adds information through ${variation.label}.`,
          userId: user.id,
          variationOf: baseEvalId,
          rawOutput: {},
          summaryMean: null,
        },
      });
      console.log(`  ✓ Created variation: ${variationEval.id}\n`);
    }
  }

  console.log('🎉 Successfully created Gaza ceasefire incremental context experiment!');
  console.log(`\nTotal variations: ${CONTEXT_VARIATIONS.length}`);
  console.log('\nWhat this tests:');
  console.log('- How models update beliefs based on new information');
  console.log('- Sensitivity to recent vs older information');
  console.log('- Response to reversals (ceasefire → breakdown → ceasefire)');
  console.log('- Whether models correctly weight evidence over time');
  console.log('\nExpected pattern:');
  console.log('- July 2024: Low probability (failed negotiations)');
  console.log('- September 2024: Slightly higher (Trump pressure)');
  console.log('- January 2025: Very high (ceasefire implemented)');
  console.log('- March 2025: Lower again (breakdown)');
  console.log('- October 6-7: Moderate (negotiations)');
  console.log('- October 8-9: Very high (agreement announced)');
  console.log('- October 11: Extremely high / certain (already implemented!)');
}

createExperiment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
