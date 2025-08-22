import { describe, it, expect, vi } from 'vitest';
import { linkValidator } from "./index";

describe("link-validator LessWrong and EA Forum integration tests", () => {
  const mockContext = {
    logger: { 
      info: vi.fn(), 
      error: vi.fn(), 
      debug: vi.fn(), 
      warn: vi.fn() 
    }
  };

  it("should validate LessWrong URLs using GraphQL API", async () => {
    const input = {
      text: `
        Check out these LessWrong posts:
        - Valid post: https://www.lesswrong.com/posts/AqbWna2S85pFTsHH4/the-intelligent-social-web
        - Invalid post: https://www.lesswrong.com/posts/FAKEIDNOTEXIST/fake-post
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toHaveLength(2);
    
    // Find the validation results
    const validPost = result.validations.find((v: any) => 
      v.url.includes("AqbWna2S85pFTsHH4"));
    const invalidPost = result.validations.find((v: any) => 
      v.url.includes("FAKEIDNOTEXIST"));

    // Valid post should be accessible
    expect(validPost?.accessible).toBe(true);
    expect(validPost?.details?.statusCode).toBe(200);
    expect(validPost?.validationMethod).toBe("LessWrong GraphQL API");
    
    // Invalid post should not be accessible
    expect(invalidPost?.accessible).toBe(false);
    expect(invalidPost?.error?.type).toBe("NotFound");
    expect(invalidPost?.validationMethod).toBe("LessWrong GraphQL API");
  }, 30000);

  it("should validate EA Forum URLs using GraphQL API", async () => {
    const input = {
      text: `
        Here are some EA Forum posts:
        - Valid post: https://forum.effectivealtruism.org/posts/bfdc3MpsYEfDdvgtP/why-i-think-ai-safety-field-building-is-one-of
        - Invalid post: https://forum.effectivealtruism.org/posts/NOTAREALID123/fake-ea-post
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toHaveLength(2);
    
    // Find the validation results
    const validPost = result.validations.find((v: any) => 
      v.url.includes("bfdc3MpsYEfDdvgtP"));
    const invalidPost = result.validations.find((v: any) => 
      v.url.includes("NOTAREALID123"));

    // Valid post should be accessible
    expect(validPost?.accessible).toBe(true);
    expect(validPost?.details?.statusCode).toBe(200);
    expect(validPost?.validationMethod).toBe("EA Forum GraphQL API");
    
    // Invalid post should not be accessible
    expect(invalidPost?.accessible).toBe(false);
    expect(invalidPost?.error?.type).toBe("NotFound");
    expect(invalidPost?.validationMethod).toBe("EA Forum GraphQL API");
  }, 30000);

  it("should handle mixed URLs correctly", async () => {
    const input = {
      text: `
        Mixed links:
        - LessWrong: https://www.lesswrong.com/posts/AqbWna2S85pFTsHH4/the-intelligent-social-web
        - EA Forum: https://forum.effectivealtruism.org/posts/bfdc3MpsYEfDdvgtP/why-i-think
        - Regular site: https://www.google.com
        - Broken link: https://definitely-not-a-real-domain-xyz123.com
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toHaveLength(4);
    
    // Check that we have a mix of working and broken links
    const workingLinks = result.validations.filter((v: any) => v.accessible);
    const brokenLinks = result.validations.filter((v: any) => !v.accessible);
    
    // We should have at least 3 working links (LW, EA, Google)
    expect(workingLinks.length).toBeGreaterThanOrEqual(3);
    // And 1 broken link
    expect(brokenLinks.length).toBeGreaterThanOrEqual(1);
    
    // Summary should reflect the results
    expect(result.summary.totalLinks).toBe(4);
    expect(result.summary.workingLinks).toBeGreaterThanOrEqual(3);
    expect(result.summary.brokenLinks).toBeGreaterThanOrEqual(1);
    
    // Check that methods are tracked
    expect(result.summary.methodsUsed).toBeDefined();
    expect(result.summary.methodsUsed["LessWrong GraphQL API"]).toBe(1);
    expect(result.summary.methodsUsed["EA Forum GraphQL API"]).toBe(1);
    expect(result.summary.methodsUsed["HTTP Request"]).toBe(2);
  }, 30000);
});