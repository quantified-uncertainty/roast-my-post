#!/usr/bin/env tsx
/**
 * US Democracy Context Experiment
 *
 * Tests how adding alarming context from a blog post affects model predictions
 * on a genuinely uncertain political claim.
 *
 * Variations:
 * 1. Baseline - no context
 * 2. Blog post context - includes forecasts and expert quotes
 * 3. Blog post + comment context - adds critical commentary
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma, generateId } from '@roast/db';

const CLAIM = "There is at least a 10% chance that the US won't be considered a democracy by 2030 according to The Economist Democracy Index";

const BLOG_POST_CONTENT = `The following is a quick collection of forecasting markets and opinions from experts which give some sense of how well-informed people are thinking about the state of US democracy.

Forecasts (as of Oct 8th, 2025):
- The US won't be a democracy by 2030: 25% - Metaculus
- Trump in power beyond 2028: 3% - Metaculus
- Trump wins election in 2028: 3% - Polymarket
- If Trump is elected, will the US still be a liberal democracy at the end of his term? (V-DEM): 61% - Manifold
- Will Trump seriously attempt a 3rd term in 2028?: 15% - Manifold
- Will Trump 2.0 be the end of Democracy as we know it?: 48% - Manifold
- Civil War before 2031: 4% - Metaculus
- Will there be a civil war in the United States before 2030?: 13% - Manifold

Quotes from experts & commentators:

Steven Levitsky (author of "How Democracies Die"): "Honest to god, I've never seen anything like it. We look at these comparative cases in the 21st century, like Hungary and Poland and Turkey. In a lot of respects, this is worse. These first two months have been much more aggressively authoritarian than almost any other comparable case I know of democratic backsliding."

Mark Milley (Trump's Former Chairman of the Joint Chiefs): "[Trump is] fascist to the core" and "the most dangerous person to this country".

Ezra Klein: "Authoritarianism is here, it's just unevenly distributed" & "It seems pretty clear there's an authoritarian takeover going on."

Francis Fukuyama: "With the rise of Donald Trump, we've managed to elect, I think, a genuinely authoritarian president, who is in the process of dismantling the whole American constitutional order."

Some relevant research:
- Trump has pursued his agenda with a speed that outpaces even some of the most rapid cases of democratic erosion, like Hungary and Poland. The US could become "fastest autocratizing country in contemporary history without a coup." (Carnegie Endowment)
- About 30% of recent autocratization episodes result in stable authoritarian regimes. V-Dem analysis found that 73% of autocratization episodes since the mid-1990s were reversed through U-Turns.
- Autocratization follows a pattern— attack media and civil society first, polarize through disinformation, then undermine institutions.

Source: https://forum.effectivealtruism.org/posts/eJNH2CikC4scTsqYs/prediction-markets-and-many-experts-think-authoritarian`;

const COMMENT_CONTEXT = `

Critical commentary on the forecasts:

Marcus Abramovitch raised concerns about prediction market methodologies and potential biases in these forecasts.

Siebe Rozendal provided nuanced analysis noting that while concerning, the prediction markets may overweight dramatic scenarios and underweight base rates of democratic resilience in established democracies.

Several commenters noted that resolution criteria for these markets are imperfect and that "democracy" is measured on a spectrum rather than as a binary outcome.`;

const VARIATIONS = [
  {
    label: "Baseline - No Context",
    tags: ["us-democracy", "context-experiment", "baseline"],
    context: null,
    notes: "No additional context provided - just the claim itself"
  },
  {
    label: "Blog Post Context",
    tags: ["us-democracy", "context-experiment", "blog-post"],
    context: BLOG_POST_CONTENT,
    notes: "Includes alarming forecasts and expert quotes about democratic backsliding"
  },
  {
    label: "Blog Post + Critical Commentary",
    tags: ["us-democracy", "context-experiment", "blog-post-comments"],
    context: BLOG_POST_CONTENT + COMMENT_CONTEXT,
    notes: "Includes blog post plus critical commentary questioning the forecasts"
  }
];

async function createExperiment() {
  console.log('Creating US Democracy Context Experiment...\n');
  console.log(`Claim: "${CLAIM}"\n`);
  console.log(`Creating ${VARIATIONS.length} variations to test context effects\n`);

  // Get a user ID
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database');
    process.exit(1);
  }

  let baseEvalId: string | null = null;

  for (let i = 0; i < VARIATIONS.length; i++) {
    const variation = VARIATIONS[i];

    console.log(`[${i + 1}/${VARIATIONS.length}] Creating: ${variation.label}`);
    console.log(`  Tags: ${variation.tags.join(', ')}`);
    console.log(`  Context: ${variation.context ? `${variation.context.length} chars` : 'none'}\n`);

    if (i === 0) {
      // First one is the baseline
      const evaluation = await prisma.claimEvaluation.create({
        data: {
          id: generateId(16),
          claim: CLAIM,
          context: variation.context,
          tags: variation.tags,
          submitterNotes: variation.notes,
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
          submitterNotes: variation.notes,
          userId: user.id,
          variationOf: baseEvalId,
          rawOutput: {},
          summaryMean: null,
        },
      });
      console.log(`  ✓ Created variation: ${variationEval.id}\n`);
    }
  }

  console.log('🎉 Successfully created US democracy context experiment!');
  console.log(`\nTotal variations: ${VARIATIONS.length}`);
  console.log('\nWhat this tests:');
  console.log('- How alarming context affects probability assessments');
  console.log('- Whether critical commentary moderates initial reactions');
  console.log('- Baseline vs context-influenced predictions on uncertain political claims');
  console.log('\nExpected pattern:');
  console.log('- Baseline: Models may give moderate probability (20-40%)');
  console.log('- Blog post: Higher probability due to alarming forecasts and quotes (30-50%?)');
  console.log('- Blog + comments: Slightly moderated by critical commentary (25-45%?)');
  console.log('\nNext step: Run evaluations with run-us-democracy-evals.ts');
}

createExperiment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
