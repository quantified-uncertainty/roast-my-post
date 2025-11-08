import { describe, it, expect } from 'vitest';
import { FallacyCheckPlugin } from './index';
import { createChunksWithTool } from '../../utils/createChunksWithTool';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Realistic document testing - iterate and tune the agent
 */
describe('FallacyCheckPlugin - Realistic Documents', () => {

  // TEST 1: Crypto Investment Pitch (High manipulation risk)
  const cryptoDocument = `
# Revolutionary Crypto Investment Strategy

## Proven Track Record

Since launching in March 2020, our AI-powered crypto trading platform has delivered incredible results. Our average client has seen 847.3% returns, with many achieving life-changing wealth in just months.

John from Texas invested $5,000 in early 2020 and now his portfolio is worth $47,000. Sarah from California started with $10,000 and withdrew $95,000 last month. These results are typical for our dedicated users who follow our system.

## The Data Speaks

Our internal study of 1,000 active users showed an average return of 847.3% over the past 18 months. Compare that to traditional investments:
- S&P 500: 15% annually
- Savings accounts: 0.5% annually
- Our platform: 847.3% in 18 months

The math is simple. Every month you wait costs you thousands in potential gains.

## Expert Validation

Dr. Michael Chen, a prominent blockchain researcher, said our algorithm "shows interesting potential." Leading crypto analysts have taken notice of our innovative approach, with several calling it "one to watch."

## Customer Satisfaction

We surveyed our user base and found that 99.2% are satisfied with their results. This level of satisfaction is unprecedented in the investment industry.

## Risk Assessment

Some critics claim crypto is risky, but they simply don't understand the technology. Either you embrace the future of finance, or you stick with banks that give you 0.5% interest while inflation destroys your wealth. The choice is clear.

Our proprietary AI eliminates the emotion from trading, making it virtually risk-free. Traditional investments are actually riskier because they're controlled by Wall Street elites who profit from your ignorance.
`;

  // TEST 2: Health Supplement Marketing
  const supplementDocument = `
# Nature's Miracle: Ancient Remedy Meets Modern Science

## Real Results from Real People

"I struggled with joint pain for 15 years. After just 3 weeks on Nature's Miracle, I'm pain-free and feel 20 years younger!" - Jennifer M., verified customer

Studies show that 87% of users report improvement in their symptoms within the first month. Unlike pharmaceutical options with dangerous side effects, Nature's Miracle is 100% natural and completely safe.

## The Science

Research from the Institute of Natural Health found that our key ingredient, extracted from an ancient Tibetan herb, is 3x more effective than leading prescription medications. This breakthrough was published in the Journal of Alternative Wellness.

Our formula has been used for over 2,000 years in traditional medicine, proving its safety and effectiveness. If it wasn't safe, would it have survived this long?

## Why Doctors Won't Tell You

Big Pharma doesn't want you to know about natural alternatives because they can't patent them. That's why mainstream doctors dismiss natural remedies - they profit from keeping you sick and dependent on expensive prescriptions.

## Risk-Free Guarantee

Try Nature's Miracle risk-free for 30 days. Join the thousands who have already discovered this life-changing supplement. At just $89.95 per month, it's a small price to pay for your health.

Act now - this special pricing won't last forever!
`;

  // TEST 3: Political Opinion Piece
  const politicalDocument = `
# The Failed Policy We Must Abandon

## Clear Evidence of Failure

Policy X has been a complete disaster. Since its implementation in 2020, unemployment increased, crime rates rose, and public satisfaction declined. The data is clear: this policy doesn't work.

Supporters of Policy X want to expand it even further, despite overwhelming evidence of its failure. They claim we need to give it more time, but how much more damage must we endure?

## What the Experts Say

Leading economists have expressed concerns about Policy X. Professor Johnson noted that the policy "requires further study," while analyst Martinez said it "shows some unexpected outcomes." Even supporters admit there are "areas for improvement."

## The Real Cost

Policy X costs taxpayers $2 billion annually. That's money that could be going to education, healthcare, or infrastructure. Every dollar spent on this failed policy is a dollar wasted.

## The Alternative

Either we continue down this path of failure, or we return to the policies that worked before. The choice is between proven success and continued disaster.

Those who oppose repealing Policy X obviously haven't experienced its negative effects personally. They don't understand what working families are going through.
`;

  // TEST 4: Business Case Study
  const businessDocument = `
# How We Scaled to $10M ARR in 12 Months

## The Strategy That Changed Everything

In January 2020, we were a struggling startup with $50K MRR. By December 2020, we hit $850K MRR - a 17x increase. Here's exactly how we did it.

## The Numbers

Our growth metrics:
- Customer acquisition: Up 1,247%
- Revenue: Increased 1,700%
- Customer satisfaction: 94.8%
- Churn rate: Down to 3.2%

Compared to industry average growth of 50% annually, our 1,700% growth proves our approach works.

## What Worked

We focused on three things:
1. Product-market fit (found by talking to 10 successful customers)
2. Aggressive marketing (inspired by how Apple markets products)
3. Customer success (based on advice from a mentor who built a unicorn)

## The Team

Our team has experience at Google, Facebook, and Amazon. This pedigree gave us insights that typical founders lack. Plus, our CEO previously founded a company that was acquired (specific details under NDA).

## Validation

Investors immediately saw our potential. We raised $5M at a $50M valuation from top-tier VCs. When Sequoia and a16z are interested in your space, you know you're onto something.

## Key Lessons

The lesson is simple: move fast and don't overthink it. Analysis paralysis kills startups. We succeeded because we trusted our instincts and executed aggressively.

Traditional business advice tells you to spend years planning. We spent 2 months planning and 10 months executing. That's why we won and others failed.
`;

  it('Test 1: Crypto Investment Pitch', async () => {
    const plugin = new FallacyCheckPlugin();
    const chunks = await createChunksWithTool(cryptoDocument);

    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST 1: CRYPTO INVESTMENT PITCH');
    console.log('='.repeat(80));

    const result = await plugin.analyze(chunks, cryptoDocument);

    console.log(`\n📊 Summary: ${result.summary}`);
    console.log(`\n${result.analysis}`);
    console.log(`\n💬 Total Comments: ${result.comments.length}\n`);

    // Group by level
    const byLevel = {
      error: result.comments.filter(c => c.level === 'error'),
      warning: result.comments.filter(c => c.level === 'warning'),
      nitpick: result.comments.filter(c => c.level === 'nitpick'),
      success: result.comments.filter(c => c.level === 'success'),
      info: result.comments.filter(c => c.level === 'info'),
    };

    console.log(`By Level: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings, ${byLevel.nitpick.length} nitpicks, ${byLevel.success.length} success, ${byLevel.info.length} info\n`);

    // Show first 3 issues
    console.log('Top 3 Issues:');
    result.comments.slice(0, 3).forEach((comment, i) => {
      console.log(`\n${i + 1}. [${comment.level.toUpperCase()}] ${comment.header}`);
      if (comment.location?.quotedText) {
        console.log(`   Text: "${comment.location.quotedText.substring(0, 80)}..."`);
      }
      console.log(`   ${comment.description.substring(0, 200)}...`);
    });

    // Should catch: survivorship bias, cherry-picked 2020, false precision (847.3%),
    // vague claims, selection bias, false dichotomy, appeal to emotion
    expect(result.comments.length).toBeGreaterThan(5);
    expect(byLevel.error.length).toBeGreaterThan(3);

  }, 300000); // 5 minutes for LLM tests

  it('Test 2: Health Supplement Marketing', async () => {
    const plugin = new FallacyCheckPlugin();
    const chunks = await createChunksWithTool(supplementDocument);

    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST 2: HEALTH SUPPLEMENT MARKETING');
    console.log('='.repeat(80));

    const result = await plugin.analyze(chunks, supplementDocument);

    console.log(`\n📊 Summary: ${result.summary}`);
    console.log(`\n${result.analysis}`);
    console.log(`\n💬 Total Comments: ${result.comments.length}\n`);

    const byLevel = {
      error: result.comments.filter(c => c.level === 'error'),
      warning: result.comments.filter(c => c.level === 'warning'),
    };

    console.log(`By Level: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings\n`);

    // Show first 3 issues
    console.log('Top 3 Issues:');
    result.comments.slice(0, 3).forEach((comment, i) => {
      console.log(`\n${i + 1}. [${comment.level.toUpperCase()}] ${comment.header}`);
      console.log(`   ${comment.description.substring(0, 200)}...`);
    });

    // Should catch: anecdotal evidence, appeal to nature, appeal to antiquity,
    // conspiracy thinking, vague studies, false precision (87%)
    expect(result.comments.length).toBeGreaterThan(4);

  }, 300000); // 5 minutes for LLM tests

  it('Test 3: Political Opinion Piece', async () => {
    const plugin = new FallacyCheckPlugin();
    const chunks = await createChunksWithTool(politicalDocument);

    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST 3: POLITICAL OPINION PIECE');
    console.log('='.repeat(80));

    const result = await plugin.analyze(chunks, politicalDocument);

    console.log(`\n📊 Summary: ${result.summary}`);
    console.log(`\n${result.analysis}`);
    console.log(`\n💬 Total Comments: ${result.comments.length}\n`);

    const byLevel = {
      error: result.comments.filter(c => c.level === 'error'),
      warning: result.comments.filter(c => c.level === 'warning'),
    };

    console.log(`By Level: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings\n`);

    // Show all issues for political piece
    console.log('All Issues:');
    result.comments.forEach((comment, i) => {
      console.log(`\n${i + 1}. [${comment.level.toUpperCase()}] ${comment.header}`);
      console.log(`   ${comment.description.substring(0, 150)}...`);
    });

    // Should catch: cherry-picked timeframe (2020), quote mining, false dichotomy,
    // strawman, ad hominem, missing context
    expect(result.comments.length).toBeGreaterThan(3);

  }, 300000); // 5 minutes for LLM tests

  it('Test 4: Business Case Study', async () => {
    const plugin = new FallacyCheckPlugin();
    const chunks = await createChunksWithTool(businessDocument);

    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST 4: BUSINESS CASE STUDY');
    console.log('='.repeat(80));

    const result = await plugin.analyze(chunks, businessDocument);

    console.log(`\n📊 Summary: ${result.summary}`);
    console.log(`\n${result.analysis}`);
    console.log(`\n💬 Total Comments: ${result.comments.length}\n`);

    const byLevel = {
      error: result.comments.filter(c => c.level === 'error'),
      warning: result.comments.filter(c => c.level === 'warning'),
    };

    console.log(`By Level: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings\n`);

    // Show first 3 issues
    console.log('Top 3 Issues:');
    result.comments.slice(0, 3).forEach((comment, i) => {
      console.log(`\n${i + 1}. [${comment.level.toUpperCase()}] ${comment.header}`);
      console.log(`   ${comment.description.substring(0, 200)}...`);
    });

    // Should catch: cherry-picked 2020, survivorship bias (only successful customers),
    // anecdotal evidence, small sample size, confounding variables, false dichotomy
    expect(result.comments.length).toBeGreaterThan(3);

  }, 300000); // 5 minutes for LLM tests
});
