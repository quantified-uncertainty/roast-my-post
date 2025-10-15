#!/usr/bin/env tsx
/**
 * Add comment thread variations to US Democracy Context Experiment
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

const MARCUS_COMMENT = `

Comment by Marcus Abramovitch:
"Before I quit, I was the #1 trader on Manifold. Those markets listed on the forecasting section are very biased, suffer from issues relating to long term markets, have resolution criteria that are very different from the natural understanding of those questions and have several other flaws. Using them to suggest anything like the odds presented is very misleading."

Marcus's follow-up:
"I acknowledge the Trump presidency is deeply problematic and breaks many democratic norms. However, I don't see evidence of an imminent dictatorship. The prediction markets have significant methodological issues that make them unreliable indicators. Better markets would track things like Trump's presidency without constitutional amendment, rather than vague questions about 'democracy as we know it'."`;

const SIEBE_COMMENT = `

Comment by Siebe Rozendal:
Siebe provides detailed analysis of potential authoritarian risks, including skeptical perspectives from top forecasters:

Key points from skeptical forecasters:
- "For me to go >5% on this [authoritarian takeover/coup] I'd have to see them openly disobeying orders from the supreme court"
- Discussion of potential coup mechanisms and what would actually constitute democratic breakdown
- Observations about military guardrails being dismantled, but noting that many institutional constraints remain
- Considerations about Trump's potential successors and whether authoritarian trends would continue

Siebe notes that while there are concerning signs, the base rate of established democracies collapsing is very low, and the US has many institutional safeguards that make rapid authoritarian capture unlikely. However, gradual democratic erosion remains a concern.`;

const FULL_COMMENT_THREAD = MARCUS_COMMENT + "\n" + SIEBE_COMMENT;

const NEW_VARIATIONS = [
  {
    label: "Blog Post + Marcus Skeptical Comment",
    tags: ["us-democracy", "context-experiment", "blog-post-marcus"],
    context: BLOG_POST_CONTENT + MARCUS_COMMENT,
    notes: "Includes blog post plus Marcus's critique of prediction market methodology"
  },
  {
    label: "Blog Post + Siebe Detailed Analysis",
    tags: ["us-democracy", "context-experiment", "blog-post-siebe"],
    context: BLOG_POST_CONTENT + SIEBE_COMMENT,
    notes: "Includes blog post plus Siebe's nuanced analysis with skeptical forecaster views"
  },
  {
    label: "Blog Post + Full Comment Thread",
    tags: ["us-democracy", "context-experiment", "blog-post-full-comments"],
    context: BLOG_POST_CONTENT + FULL_COMMENT_THREAD,
    notes: "Includes blog post plus complete comment discussion from Marcus and Siebe"
  },
  {
    label: "Only Marcus Comment (No Blog Post)",
    tags: ["us-democracy", "context-experiment", "marcus-only"],
    context: MARCUS_COMMENT.trim(),
    notes: "Only Marcus's skeptical comment without the alarming blog post"
  },
  {
    label: "Only Siebe Comment (No Blog Post)",
    tags: ["us-democracy", "context-experiment", "siebe-only"],
    context: SIEBE_COMMENT.trim(),
    notes: "Only Siebe's nuanced analysis without the alarming blog post"
  }
];

async function addVariations() {
  console.log('Adding comment thread variations to US Democracy Context Experiment...\n');

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

  console.log('🎉 Successfully added comment thread variations!');
  console.log(`\nTotal new variations: ${NEW_VARIATIONS.length}`);
  console.log('\nWhat these test:');
  console.log('- How skeptical commentary (Marcus) moderates alarming forecasts');
  console.log('- How nuanced analysis (Siebe) affects probability assessments');
  console.log('- Difference between blog post + comments vs comments alone');
  console.log('\nNext step: Run evaluations with run-us-democracy-evals.ts');
}

addVariations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
