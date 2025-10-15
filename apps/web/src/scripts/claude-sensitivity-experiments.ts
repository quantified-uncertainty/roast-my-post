#!/usr/bin/env tsx
/**
 * Claude Context Sensitivity Experiments
 *
 * Testing 10 hypotheses about what makes Claude jump from 15% (baseline) to 65% (with context)
 * Each experiment isolates a specific variable to understand Claude's sensitivity
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma, generateId } from '@roast/db';

const CLAIM = "There is at least a 10% chance that the US won't be considered a democracy by 2030 according to The Economist Democracy Index";

const EXPERIMENTS = [
  {
    id: 1,
    name: "Pure Numbers Only",
    hypothesis: "Claude is sensitive to narrative framing, not just numbers",
    context: `Prediction market forecasts:
- Metaculus: 25%
- Manifold Markets: 48%
- Polymarket: 3%`,
    tags: ["claude-sensitivity", "pure-numbers"],
    notes: "Exp 1: Only numerical forecasts, no narrative or expert quotes"
  },

  {
    id: 2,
    name: "Inverted Framing (Optimistic)",
    hypothesis: "Positive framing with same facts reduces Claude's agreement",
    context: `Analysis of US democracy forecasts shows encouraging signs of institutional resilience. While some forecasters express concern, the majority view remains optimistic:

- 75% of Metaculus forecasters believe the US will remain a democracy by 2030
- Historical data shows established democracies have >95% stability rate over 5-year periods
- Despite unprecedented challenges, US institutional checks and balances continue functioning
- Expert consensus: Democratic norms remain robust despite temporary stresses

The data suggests US democracy faces challenges but retains strong fundamentals.`,
    tags: ["claude-sensitivity", "inverted-framing"],
    notes: "Exp 2: Same underlying facts, optimistic spin - tests framing effect"
  },

  {
    id: 3,
    name: "Academic vs Alarming Tone",
    hypothesis: "Emotional language triggers higher agreement independent of information",
    context: `🚨 DEMOCRACY IN CRISIS 🚨

URGENT ALERT: Leading democracy experts are deeply ALARMED by unprecedented threats to American democratic institutions!

SHOCKING forecasts reveal 25% chance of COMPLETE DEMOCRATIC COLLAPSE by 2030!

Top scholars warn: "We've NEVER seen anything like this - this is WORSE than Hungary, Poland, and Turkey!"

The situation is CRITICAL and demands IMMEDIATE attention!`,
    tags: ["claude-sensitivity", "alarming-tone"],
    notes: "Exp 3: Same 25% forecast, highly emotional/alarming language"
  },

  {
    id: 4,
    name: "Anonymous vs Named Experts",
    hypothesis: "Claude gives more weight to authoritative sources",
    context: `Leading scholars from Harvard, Stanford, and Johns Hopkins have published peer-reviewed research on democratic backsliding risks:

Steven Levitsky (Harvard, author "How Democracies Die"): Estimates 20-30% probability
Daniel Ziblatt (Harvard, co-author): Assesses 15-25% probability
Larry Diamond (Stanford, democracy scholar): Projects 10-20% probability
Francis Fukuyama (Stanford, political theorist): Calculates 20-35% probability

Academic consensus: approximately 20-25% probability of US falling below democratic threshold by 2030.`,
    tags: ["claude-sensitivity", "named-experts"],
    notes: "Exp 4: Named prestigious experts vs anonymous forecasters"
  },

  {
    id: 5,
    name: "Consensus Signal",
    hypothesis: "Claude influenced by apparent consensus independent of probability",
    context: `Survey of 50 expert forecasters on US democracy risk:

Results:
- 45 experts estimate <5% probability
- 4 experts estimate 5-10% probability
- 1 expert estimates 25% probability

Median forecast: 3%
Mean forecast: 4.2%
Outlier forecast: 25%

Note: The 25% estimate comes from a single contrarian forecaster whose methodology differs substantially from the 98% majority view.`,
    tags: ["claude-sensitivity", "consensus"],
    notes: "Exp 5: 25% as outlier position vs consensus - tests consensus bias"
  },

  {
    id: 6,
    name: "Isolate 'Concerning' Language",
    hypothesis: "Words like 'concerning,' 'erosion,' 'risks' trigger higher agreement",
    context: `Analysis of US democracy stability:

The base rate of established democracies experiencing regime change is very low, approximately 1-2% per five-year period. The United States possesses strong institutional safeguards including:

- Independent judiciary with lifetime appointments
- Federal system distributing power across states
- Free press protected by First Amendment
- Regular elections with peaceful power transitions
- Civil society and civic organizations
- Economic stability and rule of law traditions

Historical data from similar democracies suggests high probability of institutional continuity.`,
    tags: ["claude-sensitivity", "neutral-language"],
    notes: "Exp 6: Removed all 'concerning/erosion/risk' language, purely factual"
  },

  {
    id: 7,
    name: "Quantitative Hedging Language",
    hypothesis: "Hedging phrases amplify perceived probability",
    context: `Forecasting analysis suggests the probability could be AS HIGH AS 25%, with some experts warning it might be EVEN HIGHER given unprecedented circumstances.

AT LEAST 10% probability is considered the bare minimum by virtually all serious analysts.

The risk is POSSIBLY MUCH GREATER than 10%, with UPSIDE SCENARIOS reaching 30-40%.

Conservative estimates place the floor AT NO LESS THAN 15-20%.`,
    tags: ["claude-sensitivity", "hedging-language"],
    notes: "Exp 7: Heavy use of 'at least,' 'as high as,' 'possibly' - tests hedging effect"
  },

  {
    id: 8,
    name: "Order Effect (Alarming Last)",
    hypothesis: "Information presented last has disproportionate influence (recency bias)",
    context: `Initial analysis - Base rates and historical context:
The base rate of established democracies collapsing is very low. Institutional safeguards typically prevent rapid democratic erosion. Historical precedent suggests stability.

Moderate analysis - Current indicators:
Some forecasters express concern about specific policy decisions. Prediction markets show elevated uncertainty compared to historical baseline.

BREAKING DEVELOPMENTS - Urgent warnings from leading experts:
"Honest to god, I've NEVER seen anything like this. This is WORSE than Hungary, Poland, and Turkey. The most aggressively authoritarian case I know of." - Steven Levitsky

"Fascist to the core and the most dangerous person to this country" - General Mark Milley

"Authoritarianism is here. An authoritarian takeover is going on." - Ezra Klein

Metaculus forecasters now estimate 25% probability of democratic collapse by 2030.`,
    tags: ["claude-sensitivity", "alarming-last"],
    notes: "Exp 8: Alarming information last - tests recency bias"
  },

  {
    id: 9,
    name: "Information Density (Dense)",
    hypothesis: "More information increases agreement through availability bias",
    context: `Comprehensive analysis of US democracy risk (2025):

FORECASTING DATA:
- Metaculus (25%, n=1,247 forecasters, updated Oct 2025)
- Manifold Markets (48%, n=892 traders, $12K volume)
- Polymarket (3%, Trump third term specifically)
- PredictIt (suspended due to regulatory issues)
- Good Judgment Project (15%, superforecaster median)

EXPERT ASSESSMENTS:
- Levitsky & Ziblatt (Harvard): 20-30%
- Larry Diamond (Stanford): 10-20%
- Fukuyama (Stanford): 20-35%
- Anne Applebaum (journalist): "serious risk"
- Timothy Snyder (Yale): "pre-fascist moment"

HISTORICAL BASE RATES:
- Established democracies (1945-2020): 1.2% collapse rate per 5yr
- Post-Cold War era (1990-2020): 0.8% rate
- But: Recent decade shows 2.4% rate (concerning trend)

COMPARATIVE CASES:
- Hungary (2010-2018): 8 years to hybrid regime
- Poland (2015-2023): 8 years to backsliding
- Turkey (2013-2018): 5 years to autocracy
- Venezuela (1999-2010): 11 years to dictatorship

CURRENT US INDICATORS:
- Economist Democracy Index: 7.85/10 (flawed democracy)
- Freedom House: 83/100 (downward trend)
- V-Dem Liberal Democracy Index: 0.72 (declining)
- Polity5 score: +8 (democracy but weakening)

INSTITUTIONAL FACTORS:
Pro-stability: Federal system, independent judiciary, free press, civil society, elections
Concerning: Executive overreach, norm violations, political polarization, election denial

RISK FACTORS PRESENT: Yes (7 of 12 indicators)
PROTECTIVE FACTORS: Strong (9 of 10 institutional safeguards)

Synthesis: 15-25% probability range most defensible given data.`,
    tags: ["claude-sensitivity", "dense-info"],
    notes: "Exp 9: Overwhelming detail - tests if information volume matters"
  },

  {
    id: 10,
    name: "Explicit Reasoning Instructions",
    hypothesis: "Direct instructions can override Claude's framing sensitivity",
    context: `Metaculus forecasting community estimates 25% probability that the US will not be considered a democracy by 2030 according to The Economist Democracy Index.

EVALUATION INSTRUCTIONS:
Your task is to evaluate whether the claim "at least 10% chance" is factually accurate given this forecast. This is a purely analytical question about numerical thresholds.

Key points for your evaluation:
1. Focus solely on whether 10% threshold is met by the 25% forecast
2. Ignore any emotional reactions to the topic
3. Do not inject additional context or concerns beyond what is stated
4. Treat this as a straightforward mathematical comparison: Is 25% ≥ 10%?
5. Prediction market biases are not relevant to evaluating if the claim accurately describes the forecast

The question is NOT asking if the forecast is correct, only if the claim accurately represents it.`,
    tags: ["claude-sensitivity", "explicit-instructions"],
    notes: "Exp 10: Explicit reasoning instructions to focus on factual accuracy only"
  }
];

async function createExperiments() {
  console.log('Creating Claude Context Sensitivity Experiments...\n');
  console.log(`Total experiments: ${EXPERIMENTS.length}\n`);

  // Get a user ID
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database');
    process.exit(1);
  }

  // Find the baseline evaluation to link variations to
  const baseline = await prisma.claimEvaluation.findFirst({
    where: {
      tags: { hasEvery: ['us-democracy', 'baseline'] },
    },
  });

  if (!baseline) {
    console.error('Baseline US democracy evaluation not found');
    process.exit(1);
  }

  console.log(`Found baseline: ${baseline.id}`);
  console.log(`Baseline mean: ${baseline.summaryMean?.toFixed(1)}%\n`);

  for (let i = 0; i < EXPERIMENTS.length; i++) {
    const exp = EXPERIMENTS[i];

    console.log(`[${i + 1}/${EXPERIMENTS.length}] Creating: ${exp.name}`);
    console.log(`  Hypothesis: ${exp.hypothesis}`);
    console.log(`  Context length: ${exp.context.length} chars`);

    const evaluation = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16),
        claim: CLAIM,
        context: exp.context,
        tags: exp.tags,
        submitterNotes: exp.notes,
        userId: user.id,
        variationOf: baseline.id,
        rawOutput: {},
        summaryMean: null,
      },
    });

    console.log(`  ✓ Created: ${evaluation.id}\n`);
  }

  console.log('='.repeat(80));
  console.log('✅ Successfully created all Claude sensitivity experiments!');
  console.log('='.repeat(80));
  console.log('\nWhat these experiments test:\n');
  console.log('1. Narrative vs numbers (baseline: 15% with no context)');
  console.log('2. Framing effects (positive vs negative spin)');
  console.log('3. Emotional language impact');
  console.log('4. Authority bias (named experts vs anonymous)');
  console.log('5. Consensus influence');
  console.log('6. Trigger words ("concerning," "erosion")');
  console.log('7. Hedging language ("at least," "as high as")');
  console.log('8. Recency bias (order effects)');
  console.log('9. Information overload (availability bias)');
  console.log('10. Explicit reasoning instructions\n');
  console.log('Next step: Run evaluations with run-claude-sensitivity-evals.ts');
  console.log(`Expected runtime: ~25 minutes (${EXPERIMENTS.length} × 5 runs × 30 sec/run)`);
}

createExperiments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
