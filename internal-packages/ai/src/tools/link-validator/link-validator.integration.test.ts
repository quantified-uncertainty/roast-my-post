import { linkValidator } from "./index";

describe("link-validator tool integration tests", () => {
  const mockContext = {
    logger: { 
      info: jest.fn(), 
      error: jest.fn(), 
      debug: jest.fn(), 
      warn: jest.fn() 
    }
  };

  it("should validate real URLs", async () => {
    const input = {
      text: `
        Here are some links to test:
        - Working link: https://www.google.com
        - Another working link: https://github.com
        - Broken link: https://this-domain-definitely-does-not-exist-12345.com
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toContain("https://www.google.com");
    expect(result.urls).toContain("https://github.com");
    expect(result.urls).toContain("https://this-domain-definitely-does-not-exist-12345.com");

    // Find the validation results
    const googleValidation = result.validations.find((v: any) => v.url === "https://www.google.com");
    const githubValidation = result.validations.find((v: any) => v.url === "https://github.com");
    const brokenValidation = result.validations.find((v: any) => v.url.includes("does-not-exist"));

    // Google and GitHub should be accessible
    expect(googleValidation?.accessible).toBe(true);
    expect(githubValidation?.accessible).toBe(true);
    
    // The fake domain should not be accessible
    expect(brokenValidation?.accessible).toBe(false);
    expect(brokenValidation?.error?.type).toBe("NetworkError");

    // Summary should reflect the results
    expect(result.summary.totalLinks).toBe(3);
    expect(result.summary.workingLinks).toBeGreaterThanOrEqual(2);
    expect(result.summary.brokenLinks).toBeGreaterThanOrEqual(1);
  }, 30000); // 30 second timeout for real network requests

  it("should handle markdown and HTML links", async () => {
    const input = {
      text: `
        # Test Document
        
        Here's a [markdown link](https://example.com/page1).
        
        And an HTML link: <a href="https://example.com/page2">click here</a>
        
        Plus a plain URL: https://example.com/page3
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toEqual([
      "https://example.com/page1",
      "https://example.com/page2",
      "https://example.com/page3",
    ]);
  });

  it("should exclude image URLs from markdown", async () => {
    const input = {
      text: `
        ![Image](https://example.com/image.jpg)
        
        [Link to image](https://example.com/image2.jpg)
      `,
    };

    const result = await linkValidator.execute(input, mockContext);

    // Should only include the link, not the image
    expect(result.urls).toEqual(["https://example.com/image2.jpg"]);
  });

  it("should handle documents with no links", async () => {
    const input = {
      text: "This is just plain text with no links whatsoever.",
    };

    const result = await linkValidator.execute(input, mockContext);

    expect(result.urls).toEqual([]);
    expect(result.validations).toEqual([]);
    expect(result.summary).toEqual({
      totalLinks: 0,
      workingLinks: 0,
      brokenLinks: 0,
      errorBreakdown: {},
    });
  });
});