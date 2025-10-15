#!/usr/bin/env tsx
/**
 * Add independent analysis variations to US Democracy Context Experiment
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma, generateId } from '@roast/db';
import { readFileSync } from 'fs';

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

// Read the independent analysis
const ANALYSIS_PATH = resolve(process.cwd(), 'src/research/us-democracy-analysis-2025.md');
const INDEPENDENT_ANALYSIS = readFileSync(ANALYSIS_PATH, 'utf-8');

// Create a summary version for combinations
const ANALYSIS_SUMMARY = `Independent Analysis Summary (Full analysis available):

My independent assessment: 15-30% probability (vs. 25% Metaculus, 48% Manifold)

Key findings:
1. Prediction market biases: Long-term forecasts systematically bias toward 50%, and low-probability events get overpriced (favorite-longshot bias). Market forecasts may be inflated.

2. Base rates: Among wealthy established democracies, complete collapse to autocracy remains extremely rare—maybe 3-5% per 5-year period absent specific risk factors.

3. Speed is unprecedented: Trump moving faster than Hungary/Poland/Turkey in comparable periods—what took Orbán a year is happening in weeks.

4. But severity lags speed: Most US institutions remain intact; rapid attempts at erosion, not yet successful erosion on the scale of comparison cases.

5. Decomposed probability:
   - P(sustained pressure): 70%
   - P(institutional failure | pressure): 35%
   - P(threshold breach | failure): 70%
   - P(reversal before 2030): 40%

6. Question framing matters: "Some erosion" (~70-80%) vs. "complete autocracy" (~5-10%) vs. "below democracy threshold" (15-30%) are vastly different.

Conclusion: This is a significant risk (15-30% justifies serious attention) but far from certain. Institutional resilience in wealthy democracies provides meaningful reassurance, though unprecedented speed demands vigilance.`;

const NEW_VARIATIONS = [
  {
    label: "Independent Analysis Only",
    tags: ["us-democracy", "context-experiment", "independent-analysis"],
    context: INDEPENDENT_ANALYSIS,
    notes: "Full independent analysis with base rates, comparative cases, and probability decomposition"
  },
  {
    label: "Independent Analysis Summary Only",
    tags: ["us-democracy", "context-experiment", "analysis-summary"],
    context: ANALYSIS_SUMMARY,
    notes: "Condensed version of independent analysis highlighting key findings"
  },
  {
    label: "Blog Post + Independent Analysis Summary",
    tags: ["us-democracy", "context-experiment", "blog-plus-analysis"],
    context: BLOG_POST_CONTENT + "\n\n---\n\n" + ANALYSIS_SUMMARY,
    notes: "Alarming blog post followed by more cautious independent analysis"
  },
  {
    label: "Independent Analysis + Blog Post (Reversed Order)",
    tags: ["us-democracy", "context-experiment", "analysis-plus-blog"],
    context: ANALYSIS_SUMMARY + "\n\n---\n\n" + BLOG_POST_CONTENT,
    notes: "Cautious analysis first, then alarming blog post - tests order effects"
  },
  {
    label: "Blog Post with Analysis Critique Inline",
    tags: ["us-democracy", "context-experiment", "blog-with-critique"],
    context: BLOG_POST_CONTENT + `\n\n---\n\nCritical Analysis Note:\n\nWhile these forecasts appear alarming, several methodological concerns warrant caution:\n\n1. Prediction market biases: Long-term political forecasts systematically bias toward 50% and tend to overprice low-probability events.\n\n2. Base rates matter: Among wealthy established democracies, complete collapse to autocracy is extremely rare (3-5% base rate per 5-year period).\n\n3. Speed vs. severity distinction: While Trump is moving faster than Hungary/Poland/Turkey in early phases, most US institutions remain intact. Rapid attempts at erosion differ from successful erosion.\n\n4. Reversibility: 73% of autocratization episodes since the mid-1990s were reversed through democratic renewal.\n\nAdjusted assessment: 15-30% probability, accounting for prediction market biases and base rates.`,
    notes: "Blog post with inline methodological critique and adjusted probability"
  }
];

async function addVariations() {
  console.log('Adding independent analysis variations to US Democracy Context Experiment...\n');

  // Get a user ID
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database');
    process.exit(1);
  }

  // Find the baseline evaluation to link variations to
  const baseline = await prisma.claimEvaluation.findFirst({
    where: {
      tags: { has: 'us-democracy' },
      tags: { has: 'baseline' },
    },
  });

  if (!baseline) {
    console.error('Baseline US democracy evaluation not found');
    process.exit(1);
  }

  console.log(`Found baseline: ${baseline.id}\n`);
  console.log(`Creating ${NEW_VARIATIONS.length} new variations...\n`);

  for (let i = 0; i < NEW_VARIATIONS.length; i++) {
    const variation = NEW_VARIATIONS[i];

    console.log(`[${i + 1}/${NEW_VARIATIONS.length}] Creating: ${variation.label}`);
    console.log(`  Tags: ${variation.tags.join(', ')}`);
    console.log(`  Context: ${variation.context.length} chars`);

    const variationEval = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16),
        claim: CLAIM,
        context: variation.context,
        tags: variation.tags,
        submitterNotes: variation.notes,
        userId: user.id,
        variationOf: baseline.id,
        rawOutput: {},
        summaryMean: null,
      },
    });

    console.log(`  ✓ Created: ${variationEval.id}\n`);
  }

  console.log('🎉 Successfully added independent analysis variations!');
  console.log(`\nTotal new variations: ${NEW_VARIATIONS.length}`);
  console.log('\nWhat these test:');
  console.log('- How skeptical analysis with base rates affects predictions');
  console.log('- Whether cautious analysis moderates alarming forecasts');
  console.log('- Order effects: analysis-then-blog vs blog-then-analysis');
  console.log('- Impact of inline methodological critiques');
  console.log('\nExpected patterns:');
  console.log('- Independent analysis should produce lower estimates (~20-30%)');
  console.log('- Blog + analysis order may matter (recency bias)');
  console.log('- Inline critique may moderate blog post alarm');
}

addVariations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
