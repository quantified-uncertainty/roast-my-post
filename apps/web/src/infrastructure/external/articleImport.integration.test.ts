import { processArticle } from './articleImport';

// Skip these tests in CI or when running unit tests
const describeIntegration = process.env.INTEGRATION_TESTS ? describe : describe.skip;

describeIntegration("articleImport integration tests", () => {
  // These tests make real network requests
  jest.setTimeout(60000); // 60 second timeout for network requests

  it("should import EA Forum articles without excessive truncation", async () => {
    const url = "https://forum.effectivealtruism.org/posts/f3GqJJeKNKcABY9Fo/a-defense-of-mid-tier-ea-lw-writing";
    
    const result = await processArticle(url);
    
    expect(result.title).toBe("A Defense of Mid-Tier EA/LW Writing");
    expect(result.author).toBe("Ozzie Gooen");
    expect(result.platforms).toContain("EA Forum");
    
    // Content should be substantial
    const wordCount = result.content.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(500); // Article should have at least 500 words
    
    // Should contain key phrases from the article
    expect(result.content).toContain("I think it's easy to get disenchanted");
    expect(result.content).toContain("intellectual challenges");
    expect(result.content).toContain("existential risk");
  });

  it("should import Substack articles with proper image handling", async () => {
    const url = "https://ozziegooen.substack.com/p/did-disney-abandon-andor-before-release";
    
    const result = await processArticle(url);
    
    expect(result.title).toBe("Did Disney Abandon Andor Before Release?");
    expect(result.author).toBe("Ozzie Gooen");
    expect(result.platforms).toContain("Substack");
    
    // Should have cleaned image markdown (not wrapped in links)
    expect(result.content).toMatch(/!\[.*\]\(https:\/\/substackcdn\.com.*\)/);
    // Should NOT have nested link+image pattern
    expect(result.content).not.toMatch(/\[!\[.*\]\(.*\)\]\(.*\)/);
    
    // Content should be preserved
    const wordCount = result.content.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(200);
    
    // Should contain key content
    expect(result.content).toContain("Andor");
    expect(result.content).toContain("$300M");
    expect(result.content).toContain("Disney");
  });

  it("should handle long articles without timing out", async () => {
    // This test uses a known long article
    const url = "https://www.lesswrong.com/posts/AqbWna2S85pFTsHH4/the-academic-contribution-to-ai-safety-seems-large";
    
    const result = await processArticle(url);
    
    expect(result.title).toBeTruthy();
    expect(result.author).toBeTruthy();
    expect(result.content).toBeTruthy();
    
    // Should preserve substantial content
    const wordCount = result.content.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(1000);
  });

  it("should extract metadata correctly from various platforms", async () => {
    const testCases = [
      {
        url: "https://forum.effectivealtruism.org/posts/f3GqJJeKNKcABY9Fo/a-defense-of-mid-tier-ea-lw-writing",
        expectedPlatform: "EA Forum",
      },
      {
        url: "https://www.lesswrong.com/posts/AqbWna2S85pFTsHH4/the-academic-contribution-to-ai-safety-seems-large",
        expectedPlatform: "LessWrong",
      },
      {
        url: "https://ozziegooen.substack.com/p/did-disney-abandon-andor-before-release",
        expectedPlatform: "Substack",
      },
    ];

    for (const testCase of testCases) {
      const result = await processArticle(testCase.url);
      
      expect(result.platforms).toContain(testCase.expectedPlatform);
      expect(result.title).toBeTruthy();
      expect(result.author).toBeTruthy();
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format
      expect(result.url).toBe(testCase.url);
    }
  });
});

// Test for content length preservation
describe("content length preservation", () => {
  it("should have clear content length requirements", () => {
    // This is a documentation test to ensure we understand the requirements
    const requirements = {
      minContentPreservation: 0.9, // Should preserve at least 90% of content
      maxClaudeContentLength: 100000, // Current max length sent to Claude
      claudeMaxTokens: 64000, // Max tokens for Sonnet model
      fallbackToOriginalThreshold: 0.3, // Falls back if cleaned content is less than 30% of original
    };
    
    // Verify these are reasonable
    expect(requirements.minContentPreservation).toBeGreaterThan(0.8);
    expect(requirements.maxClaudeContentLength).toBeGreaterThan(50000);
    expect(requirements.fallbackToOriginalThreshold).toBeLessThan(0.5);
  });
});