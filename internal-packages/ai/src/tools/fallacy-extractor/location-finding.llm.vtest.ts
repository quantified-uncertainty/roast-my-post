import { describe, it, expect } from 'vitest';
import fallacyExtractorTool from './index';
import { logger } from '../../shared/logger';
import type { FallacyExtractorInput } from './types';

describe('Fallacy Extractor - Location Finding', () => {
  const context = { userId: 'test-user', logger };

  it('should populate locations when documentText is provided', async () => {
    const testText = `Climate change is a hoax invented by scientists to get more funding.
Everyone knows the earth isn't warming - it was cold last winter!
Studies show that 97% of climate scientists agree on human-caused climate change.`;

    const input: FallacyExtractorInput = {
      text: testText,
      documentText: testText,
      minSeverityThreshold: 30,
      maxIssues: 10,
    };

    const result = await fallacyExtractorTool.execute(input, context);

    // Should find issues
    expect(result.issues.length).toBeGreaterThan(0);

    // At least one issue should have a populated location
    const issuesWithLocation = result.issues.filter(issue => issue.location);
    expect(issuesWithLocation.length).toBeGreaterThan(0);

    // Check that locations are valid
    for (const issue of issuesWithLocation) {
      expect(issue.location).toBeDefined();
      expect(issue.location!.startOffset).toBeGreaterThanOrEqual(0);
      expect(issue.location!.endOffset).toBeGreaterThan(issue.location!.startOffset);
      expect(issue.location!.quotedText).toBeTruthy();
      expect(issue.location!.strategy).toBeTruthy();

      // Verify the quoted text matches what's in the document
      const extractedText = testText.substring(
        issue.location!.startOffset,
        issue.location!.endOffset
      );
      expect(extractedText).toBe(issue.location!.quotedText);

      // Verify the located text is related to the exactText
      // They should overlap or be similar
      const exactTextLower = issue.exactText.toLowerCase().trim();
      const quotedTextLower = issue.location!.quotedText.toLowerCase().trim();

      // Either the quoted text contains the exact text, or vice versa, or they overlap
      const hasOverlap =
        quotedTextLower.includes(exactTextLower.slice(0, 20)) ||
        exactTextLower.includes(quotedTextLower.slice(0, 20));

      expect(hasOverlap).toBe(true);
    }
  }, { timeout: 30000 });

  it('should return issues without locations when documentText is not provided', async () => {
    const testText = `The vaccine contains microchips that track your location.
This claim is completely unsupported by scientific evidence.`;

    const input: FallacyExtractorInput = {
      text: testText,
      // No documentText provided
      minSeverityThreshold: 30,
      maxIssues: 10,
    };

    const result = await fallacyExtractorTool.execute(input, context);

    // Should find issues
    expect(result.issues.length).toBeGreaterThan(0);

    // Issues should not have locations
    const issuesWithLocation = result.issues.filter(issue => issue.location);
    expect(issuesWithLocation.length).toBe(0);
  }, { timeout: 30000 });

  it('should handle location finding with chunk in larger document', async () => {
    // Simulate a larger document where the chunk is embedded
    const chunkText = `Vaccines cause autism. This has been thoroughly debunked by numerous scientific studies, but the myth persists.`;

    const fullDocument = `Introduction to vaccine myths and facts.

The history of vaccines dates back to the 18th century.

Common Myths:

${chunkText}

Conclusion: Vaccines are one of the most important public health interventions.`;

    const input: FallacyExtractorInput = {
      text: chunkText,
      documentText: fullDocument,
      minSeverityThreshold: 30,
      maxIssues: 10,
    };

    const result = await fallacyExtractorTool.execute(input, context);

    // Should find issues
    expect(result.issues.length).toBeGreaterThan(0);

    // At least one issue should have a location
    const issuesWithLocation = result.issues.filter(issue => issue.location);
    expect(issuesWithLocation.length).toBeGreaterThan(0);

    // Check that locations point to the correct position in the FULL document
    for (const issue of issuesWithLocation) {
      expect(issue.location).toBeDefined();

      // The location should be in the full document, not just the chunk
      const extractedText = fullDocument.substring(
        issue.location!.startOffset,
        issue.location!.endOffset
      );
      expect(extractedText).toBe(issue.location!.quotedText);

      // The location should be within the chunk boundaries in the full document
      const chunkStart = fullDocument.indexOf(chunkText);
      const chunkEnd = chunkStart + chunkText.length;

      // Location should overlap with chunk (may extend slightly due to context)
      expect(
        issue.location!.startOffset < chunkEnd &&
        issue.location!.endOffset > chunkStart
      ).toBe(true);
    }
  }, { timeout: 30000 });

  it('should provide accurate locations for specific problematic phrases', async () => {
    const testText = `Recent studies prove that coffee cures cancer.
The United Nations has confirmed this breakthrough.
Actually, coffee has some health benefits but no evidence shows it cures cancer.`;

    const input: FallacyExtractorInput = {
      text: testText,
      documentText: testText,
      minSeverityThreshold: 30,
      maxIssues: 10,
    };

    const result = await fallacyExtractorTool.execute(input, context);

    // Should find the misinformation about coffee curing cancer
    const coffeeIssues = result.issues.filter(issue =>
      issue.exactText.toLowerCase().includes('coffee') ||
      issue.exactText.toLowerCase().includes('cancer')
    );

    expect(coffeeIssues.length).toBeGreaterThan(0);

    // Check that at least one has a location
    const coffeeIssuesWithLocation = coffeeIssues.filter(issue => issue.location);
    expect(coffeeIssuesWithLocation.length).toBeGreaterThan(0);

    // Verify the location is accurate
    for (const issue of coffeeIssuesWithLocation) {
      const extractedText = testText.substring(
        issue.location!.startOffset,
        issue.location!.endOffset
      );

      // Should extract text from the document
      expect(testText).toContain(extractedText);

      // The confidence should be reasonable (>0.5 for any match)
      expect(issue.location!.confidence).toBeGreaterThan(0.5);
    }
  }, { timeout: 30000 });

  it('should handle issues where location finding fails gracefully', async () => {
    const chunkText = `Some claim here.`;

    // Create a document that's very different from the chunk
    // This simulates a case where location finding might fail
    const fullDocument = `Completely different content that doesn't match the chunk at all.
This is a very different document.
Nothing here relates to the chunk.`;

    const input: FallacyExtractorInput = {
      text: chunkText,
      documentText: fullDocument,
      minSeverityThreshold: 10, // Low threshold to potentially get issues
      maxIssues: 10,
    };

    const result = await fallacyExtractorTool.execute(input, context);

    // The tool should complete without throwing
    expect(result).toBeDefined();
    expect(result.wasComplete).toBeDefined();

    // If issues are found, those without locations should still be included
    // (The tool shouldn't drop issues just because location finding failed)
    expect(Array.isArray(result.issues)).toBe(true);
  }, { timeout: 30000 });
});
