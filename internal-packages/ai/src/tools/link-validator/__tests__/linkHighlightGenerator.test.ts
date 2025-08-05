import { describe, expect, it } from "@jest/globals";
import { findUrlPosition, generateLinkHighlights } from "../linkHighlightGenerator";
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
    expect(position?.startOffset).toBe(10); // Start of [React docs](...)
    expect(position?.endOffset).toBe(41); // End of (...)]
    expect(position?.quotedText).toBe("[React docs](https://react.dev)");
  });

  it("handles URLs with parentheses in markdown", () => {
    const content = "See [Wikipedia](https://en.wikipedia.org/wiki/AI_(disambiguation)) for details.";
    const position = findUrlPosition(content, "https://en.wikipedia.org/wiki/AI_(disambiguation)");
    
    expect(position).not.toBeNull();
    expect(position?.quotedText).toBe("[Wikipedia](https://en.wikipedia.org/wiki/AI_(disambiguation))");
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
    const urls = ["https://broken.com"];
    const content = "Check out https://broken.com for info.";
    
    const highlights = generateLinkHighlights(linkAnalysisResults, urls, content, 5);
    
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toContain("Broken link");
    expect(highlights[0].quoteText).toBe("https://broken.com");
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
    const urls = ["https://working.com"];
    const content = "Visit https://working.com today.";
    
    const highlights = generateLinkHighlights(linkAnalysisResults, urls, content, 5);
    
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toContain("Link verified");
    expect(highlights[0].quoteText).toBe("https://working.com");
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
    const urls = ["https://one.com", "https://two.com", "https://three.com"];
    const content = "Visit https://one.com and https://two.com and https://three.com";
    
    const highlights = generateLinkHighlights(linkAnalysisResults, urls, content, 2);
    
    expect(highlights).toHaveLength(2); // Limited to 2
  });
});