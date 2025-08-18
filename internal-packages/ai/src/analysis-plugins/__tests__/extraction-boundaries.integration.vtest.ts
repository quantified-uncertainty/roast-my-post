import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
/**
 * Test to verify that extraction tools respect their boundaries
 * and don't overlap with each other's domains
 */

import extractForecastingClaimsTool from '../../tools/extract-forecasting-claims';
import extractFactualClaimsTool from '../../tools/extract-factual-claims';
import extractMathExpressionsTool from '../../tools/extract-math-expressions';
import { logger } from '../../shared/logger';

// Check if we have an API key
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe('Extraction Tool Boundaries', () => {
  const mockContext = { logger, userId: 'test-user' };

  // Skip these tests if no API key is available
  if (!hasApiKey) {
    it.skip('requires ANTHROPIC_API_KEY to run', () => {});
    return;
  }

  describe('Math vs Fact-check vs Forecast boundaries', () => {
    it('should properly separate math errors from factual claims', async () => {
      const text = `
        Our company revenue grew 3x from $10M to $25M last year.
        The GDP was $21T in 2023 according to official data.
        Revenue will grow 50% next year to reach $50M.
      `;

      // Math tool should only catch the calculation error
      const mathResult = await extractMathExpressionsTool.execute(
        { text, verifyCalculations: true },
        mockContext
      );
      
      // Should find the math error (3x from $10M should be $30M, not $25M)
      expect(mathResult.expressions.length).toBeGreaterThanOrEqual(1);
      const mathError = mathResult.expressions.find(e => 
        e.originalText.includes('3x from $10M to $25M')
      );
      expect(mathError).toBeDefined();
      expect(mathError?.hasError).toBe(true);

      // Fact-check tool should only catch the factual claim
      const factResult = await extractFactualClaimsTool.execute(
        { text, minQualityThreshold: 50 },
        mockContext
      );
      
      // Should find the GDP fact but not the calculations or predictions
      const gdpClaim = factResult.claims.find(c => 
        c.originalText.includes('GDP was $21T')
      );
      expect(gdpClaim).toBeDefined();
      
      // Should not extract future predictions
      const futureClaim = factResult.claims.find(c => 
        c.originalText.includes('will grow 50%')
      );
      expect(futureClaim).toBeUndefined();

      // Forecast tool should only catch the future prediction
      const forecastResult = await extractForecastingClaimsTool.execute(
        { text, minQualityThreshold: 50 },
        mockContext
      );
      
      // Should find the future revenue prediction
      const revenueForecast = forecastResult.forecasts.find(f => 
        f.originalText.includes('will grow 50% next year')
      );
      expect(revenueForecast).toBeDefined();
      
      // Should not extract historical facts or calculations
      const historicalClaim = forecastResult.forecasts.find(f => 
        f.originalText.includes('GDP was')
      );
      expect(historicalClaim).toBeUndefined();
    });

    it('should handle percentage claims correctly based on context', async () => {
      const text = `
        Studies show that 70% of users prefer our product.
        There's a 70% chance of rain tomorrow.
        15% of 1000 users equals 125 users.
      `;

      // Math tool should only catch the calculation error
      const mathResult = await extractMathExpressionsTool.execute(
        { text, verifyCalculations: true },
        mockContext
      );
      
      // Should find the math error (15% of 1000 = 150, not 125)
      const calcError = mathResult.expressions.find(e => 
        e.originalText.includes('15% of 1000')
      );
      expect(calcError).toBeDefined();
      expect(calcError?.hasError).toBe(true);

      // Fact-check tool should catch the research finding
      const factResult = await extractFactualClaimsTool.execute(
        { text, minQualityThreshold: 30 },
        mockContext
      );
      
      const studyClaim = factResult.claims.find(c => 
        c.originalText.includes('70% of users prefer')
      );
      expect(studyClaim).toBeDefined();

      // Forecast tool should catch the probability prediction
      const forecastResult = await extractForecastingClaimsTool.execute(
        { text, minQualityThreshold: 30 },
        mockContext
      );
      
      const rainForecast = forecastResult.forecasts.find(f => 
        f.originalText.includes('70% chance of rain tomorrow')
      );
      expect(rainForecast).toBeDefined();
    });

    it('should not extract overlapping claims', async () => {
      const text = `
        The company reported $100M revenue last year, a 50% increase.
        We project revenue will reach $150M next year.
      `;

      // Run all three tools
      const [mathResult, factResult, forecastResult] = await Promise.all([
        extractMathExpressionsTool.execute({ text }, mockContext),
        extractFactualClaimsTool.execute({ text }, mockContext),
        extractForecastingClaimsTool.execute({ text }, mockContext)
      ]);

      // Math tool should find no errors (the math is correct)
      expect(mathResult.expressions.length).toBe(0);

      // Fact-check should find the historical revenue fact
      expect(factResult.claims.length).toBeGreaterThanOrEqual(1);
      const revenueFact = factResult.claims.find(c => 
        c.originalText.includes('$100M revenue last year')
      );
      expect(revenueFact).toBeDefined();

      // Forecast should find the future projection
      expect(forecastResult.forecasts.length).toBeGreaterThanOrEqual(1);
      const revenueProjection = forecastResult.forecasts.find(f => 
        f.originalText.includes('will reach $150M next year')
      );
      expect(revenueProjection).toBeDefined();

      // Ensure no overlap - each tool found different things
      const allExtractions = [
        ...mathResult.expressions.map(e => e.originalText),
        ...factResult.claims.map(c => c.originalText),
        ...forecastResult.forecasts.map(f => f.originalText)
      ];
      
      // Check for duplicates
      const uniqueExtractions = new Set(allExtractions);
      expect(uniqueExtractions.size).toBe(allExtractions.length);
    });
  });
});