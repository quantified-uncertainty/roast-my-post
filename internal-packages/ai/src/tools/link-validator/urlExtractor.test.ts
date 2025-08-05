import { describe, expect, it } from "@jest/globals";
import { extractUrls } from "./urlExtractor";

describe("extractUrls ordering", () => {
  it("maintains top-to-bottom document order", () => {
    const content = `
Start of document.

Here's a [first link](https://example.com/first) in the beginning.

Some text in between with https://example.com/standalone in the middle.

And here's a [second markdown link](https://example.com/second) near the end.

Finally, an HTML link <a href="https://example.com/html">HTML link</a> at the bottom.
    `.trim();
    
    const urls = extractUrls(content);
    
    expect(urls).toEqual([
      "https://example.com/first",
      "https://example.com/standalone", 
      "https://example.com/second",
      "https://example.com/html"
    ]);
  });

  it("handles duplicate URLs correctly (keeps first occurrence)", () => {
    const content = `
First occurrence: [link](https://example.com/duplicate)

Some text.

Second occurrence: https://example.com/duplicate

More text.

Third occurrence: [another link](https://example.com/duplicate)
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should only include the URL once, from its first position
    expect(urls).toEqual(["https://example.com/duplicate"]);
    expect(urls.length).toBe(1);
  });

  it("excludes image URLs but includes links to images", () => {
    const content = `
Here's an image: ![alt text](https://example.com/image.jpg)

And here's a [link to an image](https://example.com/image.jpg) in text.

Another standalone link: https://example.com/another.png
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should include the link to image but not the markdown image
    expect(urls).toEqual([
      "https://example.com/image.jpg",
      "https://example.com/another.png"
    ]);
  });

  it("handles markdown links where text is also a URL (avoids duplicates)", () => {
    const content = `
Check out this Google Drive file: [https://drive.google.com/file/d/I7IMEMowkak0fasHXnLOEuBHIN0QnydL/view?usp=sharing](https://drive.google.com/file/d/1I7IMEMowkak0fasHXnLOEuBHIN0QnydL/view?usp=sharing)

And here's a standalone URL: https://example.com/standalone
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should only include each URL once, even if the link text is also a URL
    expect(urls).toEqual([
      "https://drive.google.com/file/d/1I7IMEMowkak0fasHXnLOEuBHIN0QnydL/view?usp=sharing",
      "https://example.com/standalone"
    ]);
    expect(urls.length).toBe(2);
  });

  it("handles multiple URLs in markdown link text", () => {
    const content = `
Check out [https://first.com and https://second.com](https://actual-link.com) for details.
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should only extract the actual link URL, not the ones in the text
    expect(urls).toEqual(["https://actual-link.com"]);
    expect(urls.length).toBe(1);
  });

  it("handles URL substring conflicts", () => {
    const content = `
Visit https://example.com first, then check https://example.com/long-path-here
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should extract both URLs without conflicts
    expect(urls).toEqual([
      "https://example.com",
      "https://example.com/long-path-here"
    ]);
    expect(urls.length).toBe(2);
  });

  it("handles URLs with markdown-like characters", () => {
    const content = `
Search here: https://example.com/search?q=[brackets]&test=(parens)

And a normal link: [text](https://normal.com)
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should handle URLs with brackets and parentheses correctly
    expect(urls).toEqual([
      "https://example.com/search?q=[brackets]&test=(parens)",
      "https://normal.com"
    ]);
    expect(urls.length).toBe(2);
  });

  it("handles identical URLs in different contexts", () => {
    const content = `
First mention: https://example.com

Later as a link: [click here](https://example.com)

Another standalone: https://example.com
    `.trim();
    
    const urls = extractUrls(content);
    
    // Should only include the URL once, from its first occurrence
    expect(urls).toEqual(["https://example.com"]);
    expect(urls.length).toBe(1);
  });

  it("respects maxUrls parameter", () => {
    const content = Array.from({ length: 30 }, (_, i) => 
      `Link ${i}: https://example.com/page${i}`
    ).join('\n');
    
    const urls = extractUrls(content, 10);
    
    expect(urls.length).toBe(10);
    expect(urls[0]).toBe("https://example.com/page0");
    expect(urls[9]).toBe("https://example.com/page9");
  });
});