import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// Vitest test file
import { findUrlPosition, generateLinkHighlights } from "../linkHighlightGenerator";
import { extractUrlsWithPositions } from "../urlExtractor";
import type { LinkAnalysis } from "../urlValidator";

describe("URL Position Finding and Highlighting", () => {
  it("finds simple URLs in plain text", () => {
    const content = "Visit https://example.com for more info.";
    const position = findUrlPosition(content, "https://example.com");
    
    expect(position).not.toBeNull();
    expect(position?.startOffset).toBe(6);
    expect(position?.endOffset).toBe(25);
    expect(position?.quotedText).toBe("https://example.com");
  });

  it("finds URLs in markdown links", () => {
    const content = "Check out [React docs](https://react.dev) for tutorials.";
    const position = findUrlPosition(content, "https://react.dev");
    
    expect(position).not.toBeNull();
    expect(position?.startOffset).toBe(11); // Start of "React docs" text
    expect(position?.endOffset).toBe(21); // End of "React docs" text
    expect(position?.quotedText).toBe("React docs");
  });

  it("handles URLs with parentheses in markdown", () => {
    const content = "See [Wikipedia](https://en.wikipedia.org/wiki/AI_(disambiguation)) for details.";
    const position = findUrlPosition(content, "https://en.wikipedia.org/wiki/AI_(disambiguation)");
    
    expect(position).not.toBeNull();
    expect(position?.quotedText).toBe("Wikipedia");
  });

  it("handles edge cases", () => {
    const content = "URL at end: https://end.com";
    const position = findUrlPosition(content, "https://end.com");
    
    expect(position).not.toBeNull();
    expect(position?.quotedText).toBe("https://end.com");
  });

  it("returns null for non-existent URLs", () => {
    const content = "No matching URL here.";
    const position = findUrlPosition(content, "https://notfound.com");
    
    expect(position).toBeNull();
  });
});

describe("Link Highlight Generation", () => {
  it("generates comments for broken links", () => {
    const linkAnalysisResults: LinkAnalysis[] = [
      {
        url: "https://broken.com",
        timestamp: new Date(),
        accessError: {
          type: "NotFound",
          statusCode: 404
        }
      }
    ];
    const content = "Check out [this link](https://broken.com) for info.";
    const extractedUrls = extractUrlsWithPositions(content);
    
    const highlights = generateLinkHighlights(linkAnalysisResults, extractedUrls, content, 5);
    
    expect(highlights).toHaveLength(1);
    expect(highlights[0].description).toContain("Broken link");
    expect(highlights[0].highlight.quotedText).toBe("this link");
  });

  it("generates comments for working links", () => {
    const linkAnalysisResults: LinkAnalysis[] = [
      {
        url: "https://working.com",
        timestamp: new Date(),
        linkDetails: {
          contentType: "text/html",
          statusCode: 200
        }
      }
    ];
    const content = "Visit [working site](https://working.com) today.";
    const extractedUrls = extractUrlsWithPositions(content);
    
    const highlights = generateLinkHighlights(linkAnalysisResults, extractedUrls, content, 5);
    
    expect(highlights).toHaveLength(1);
    expect(highlights[0].description).toContain("Link verified");
    expect(highlights[0].highlight.quotedText).toBe("working site");
  });

  it("truncates URLs correctly in descriptions while preserving full URLs in links", () => {
    const longUrl = "https://www.thinkglobalhealth.org/article/just-how-do-deaths-due-covid-19-stack-against-other-causes-globally";
    const linkAnalysisResults: LinkAnalysis[] = [
      {
        url: longUrl,
        timestamp: new Date(),
        linkDetails: {
          contentType: "text/html",
          statusCode: 200
        }
      }
    ];
    const content = `Check out [this article](${longUrl}) for more info.`;
    const extractedUrls = extractUrlsWithPositions(content);
    
    const highlights = generateLinkHighlights(linkAnalysisResults, extractedUrls, content, 5);
    
    expect(highlights).toHaveLength(1);
    const highlight = highlights[0];
    
    // Check that quoted text is correct
    expect(highlight.highlight.quotedText).toBe("this article");
    
    // Header should be truncated
    expect(highlight.header.length).toBeLessThan(longUrl.length);
    expect(highlight.header).toContain("...");
    
    // Description should contain truncated display text but full URL as link
    expect(highlight.description).toContain("✅ Link verified");
    expect(highlight.description).toContain("[https://www.thinkglobalhealth.org/article/just-how-do-deat...");
    expect(highlight.description).toContain(longUrl);
    
    // Full URL should be present for linking
    expect(highlight.description).toContain(longUrl);
  });

  it("respects targetHighlights limit", () => {
    const linkAnalysisResults: LinkAnalysis[] = [
      {
        url: "https://one.com",
        timestamp: new Date(),
        accessError: { type: "NotFound", statusCode: 404 }
      },
      {
        url: "https://two.com",
        timestamp: new Date(),
        accessError: { type: "NotFound", statusCode: 404 }
      },
      {
        url: "https://three.com",
        timestamp: new Date(),
        accessError: { type: "NotFound", statusCode: 404 }
      }
    ];
    const content = "Visit [first](https://one.com) and [second](https://two.com) and [third](https://three.com)";
    const extractedUrls = extractUrlsWithPositions(content);
    
    const highlights = generateLinkHighlights(linkAnalysisResults, extractedUrls, content, 2);
    
    expect(highlights).toHaveLength(2); // Limited to 2
  });
});