import { findUrlPosition } from "../linkAnalysisWorkflow";
import { extractUrls } from "../urlExtractor";

describe("URL Position Finding and Highlighting", () => {
  test("finds simple URLs in plain text", () => {
    const content = "Visit https://example.com for more info.";
    const position = findUrlPosition(content, "https://example.com");
    
    expect(position).not.toBeNull();
    expect(position?.startOffset).toBe(6);
    expect(position?.endOffset).toBe(25);
    expect(position?.quotedText).toBe("https://example.com");
  });

  test("finds URLs in markdown links", () => {
    const content = "Check out [React docs](https://react.dev) for tutorials.";
    const position = findUrlPosition(content, "https://react.dev");
    
    expect(position).not.toBeNull();
    expect(position?.startOffset).toBe(10); // Start of [React docs](...)
    expect(position?.endOffset).toBe(41); // End of (...)]
    expect(position?.quotedText).toBe("[React docs](https://react.dev)");
  });

  test("handles URLs with parentheses in markdown", () => {
    const content = "See [Wikipedia](https://en.wikipedia.org/wiki/AI_(disambiguation)) for details.";
    const position = findUrlPosition(content, "https://en.wikipedia.org/wiki/AI_(disambiguation)");
    
    expect(position).not.toBeNull();
    expect(position?.quotedText).toBe("[Wikipedia](https://en.wikipedia.org/wiki/AI_(disambiguation))");
  });

  test("extracts URLs correctly", () => {
    const content = `Multiple URLs:
    - Plain: https://example.com
    - Markdown: [Link](https://test.org)
    - With path: https://site.com/path?param=value`;
    
    const urls = extractUrls(content);
    expect(urls).toHaveLength(3);
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("https://test.org");
    expect(urls).toContain("https://site.com/path?param=value");
  });

  test("handles edge cases", () => {
    const content = "URL at end: https://end.com";
    const position = findUrlPosition(content, "https://end.com");
    
    expect(position).not.toBeNull();
    expect(position?.quotedText).toBe("https://end.com");
  });

  test("returns null for non-existent URLs", () => {
    const content = "No matching URL here.";
    const position = findUrlPosition(content, "https://notfound.com");
    
    expect(position).toBeNull();
  });
});