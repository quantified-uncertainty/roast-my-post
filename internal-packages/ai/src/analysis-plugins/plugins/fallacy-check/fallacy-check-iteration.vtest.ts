import { describe, it, expect } from 'vitest';
import { FallacyCheckPlugin } from './index';
import { createChunksWithTool } from '../../utils/createChunksWithTool';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Iteration test for epistemic critic - used to manually test and improve the agent
 */
describe('FallacyCheckPlugin - Iteration Testing', () => {
  // Test document with SOPHISTICATED epistemic issues (Iteration 5)
  const testDocument = `
# Investment Strategy Analysis

## Success Story

Look at our most successful clients - 90% of millionaires who used our strategy achieved their wealth within 5 years. This proves our approach works. If you're not rich yet, you just need to follow our proven system more carefully.

## Market Analysis

The stock market has grown 300% over the past decade, clearly demonstrating that now is the perfect time to invest. Every year you wait costs you thousands in missed gains. Our competitors' returns are mediocre at best - they only achieved 15% annual growth compared to the market average of 10%.

## Risk Assessment

Some critics claim our strategy is risky, but that's just because they don't understand modern investing. Either you embrace innovation and succeed, or you stick with traditional methods and watch inflation erode your savings. The choice is clear.

## Statistical Evidence

Our internal study of 1,000 users showed an average return of 47.3% annually. This represents a 50% increase in returns compared to traditional index funds. We surveyed our user base and 95% reported satisfaction with their results.

## Expert Consensus

Leading financial experts agree that our approach is revolutionary. Dr. Smith from the Institute of Finance said our methodology "shows promise," and several analysts have noted our innovative techniques. The financial community is increasingly recognizing our contributions.

## Case Study

Consider John, who invested $10,000 with us in 2020. Today, his portfolio is worth $50,000 - a 5x return! He says, "This strategy changed my life." This kind of success is typical for our dedicated users. The data clearly shows that our method outperforms traditional approaches.

## Why Traditional Advice Fails

Traditional financial advisors tell you to "diversify" and "invest for the long term." But that's exactly what Wall Street wants you to think. They profit from keeping you confused and dependent on their services. Our transparent approach empowers individual investors to take control.
`;

  it('should extract epistemic issues from test document', async () => {
    const plugin = new FallacyCheckPlugin();

    // Create chunks
    const chunks = await createChunksWithTool(testDocument);
    console.log(`\n📄 Created ${chunks.length} chunks from test document\n`);

    // Run analysis
    const result = await plugin.analyze(chunks, testDocument);

    // Build output
    let output = '\n=== EPISTEMIC CRITIC RESULTS (ITERATION 5 - SOPHISTICATED REASONING) ===\n\n';
    output += `Test Focus: Sophisticated reasoning issues (NOT basic fact-checking)\n`;
    output += `Document: Investment strategy with statistical fallacies, framing issues, bias\n\n`;
    output += `Summary: ${result.summary}\n`;
    output += `\nAnalysis:\n${result.analysis}\n`;
    output += `\nTotal comments: ${result.comments.length}\n`;

    // Group by level
    const byLevel = {
      error: result.comments.filter(c => c.level === 'error'),
      warning: result.comments.filter(c => c.level === 'warning'),
      nitpick: result.comments.filter(c => c.level === 'nitpick'),
      success: result.comments.filter(c => c.level === 'success'),
      info: result.comments.filter(c => c.level === 'info'),
    };

    output += `\nBy Level: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings, ${byLevel.nitpick.length} nitpicks, ${byLevel.success.length} success, ${byLevel.info.length} info\n`;

    // Analyze issue types
    const issueTypes = result.comments.map(c => {
      const desc = c.description || '';
      if (desc.includes('Survivorship')) return 'Survivorship Bias';
      if (desc.includes('False dichotomy') || desc.includes('dichotomy')) return 'False Dichotomy';
      if (desc.includes('Selection bias') || desc.includes('selection')) return 'Selection Bias';
      if (desc.includes('Cherry-pick') || desc.includes('cherry')) return 'Cherry-Picking';
      if (desc.includes('Strawman') || desc.includes('strawman')) return 'Strawman';
      if (desc.includes('Base rate') || desc.includes('base-rate')) return 'Base Rate Neglect';
      if (desc.includes('Framing') || desc.includes('framing')) return 'Framing Effect';
      if (desc.includes('Quote') || desc.includes('mining')) return 'Quote Mining';
      return 'Other';
    });
    const typeCounts = issueTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    output += `\nSophisticated Issues Detected:\n`;
    Object.entries(typeCounts).forEach(([type, count]) => {
      output += `  - ${type}: ${count}\n`;
    });

    // Log each comment sorted by level
    ['error', 'warning', 'success', 'info'].forEach(level => {
      const comments = byLevel[level as keyof typeof byLevel];
      if (comments.length > 0) {
        output += `\n\n========== ${level.toUpperCase()} (${comments.length}) ==========\n`;
        comments.forEach((comment, i) => {
          output += `\n--- ${level.toUpperCase()} ${i + 1} ---\n`;
          output += `Header: ${comment.header}\n`;
          if (comment.location?.quotedText) {
            output += `Location: ${comment.location.quotedText.substring(0, 150)}\n`;
          }
          output += `\nDescription:\n${comment.description}\n`;
          if (comment.importance) {
            output += `Importance: ${comment.importance}\n`;
          }
        });
      }
    });

    // Write to file
    const outputPath = path.join(__dirname, 'test-results-iteration-5-sophisticated.txt');
    fs.writeFileSync(outputPath, output);
    console.log(`\n✅ Results written to: ${outputPath}`);

    // Basic assertions
    expect(result).toBeDefined();
    expect(result.comments.length).toBeGreaterThan(0);
  }, 120000); // 2 minute timeout
});
