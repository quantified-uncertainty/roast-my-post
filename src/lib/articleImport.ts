import axios from "axios";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

import {
  ANALYSIS_MODEL,
  anthropic,
  withTimeout,
} from "@/types/openai";

export interface ArticleData {
  html: string;
  title: string | null;
  author: string | null;
  date: string | null;
}

export interface ProcessedArticle {
  title: string;
  author: string;
  date: string;
  content: string;
  platforms: string[];
  url: string;
}

export function transformEAForumUrl(url: string): string {
  if (url.includes("forum.effectivealtruism.org")) {
    const forumUrl = new URL(url);
    const path = forumUrl.pathname;
    const botsUrl = `https://forum-bots.effectivealtruism.org${path}`;
    console.log(`🔄 Using forum-bots URL: ${botsUrl}`);
    return botsUrl;
  }
  return url;
}

export async function fetchArticle(url: string): Promise<ArticleData> {
  try {
    // Check if this is a LessWrong URL
    if (url.includes("lesswrong.com")) {
      // Extract the post ID from the URL
      const postId = url.split("/posts/")[1]?.split("/")[0];
      if (!postId) {
        throw new Error("Could not extract post ID from LessWrong URL");
      }

      console.log(`📥 Fetching post ${postId} from LessWrong API...`);

      const query = `
        query GetPost {
          post(input: { selector: { _id: "${postId}" } }) {
            result {
              _id
              title
              contents {
                html
              }
              user {
                displayName
                username
              }
              postedAt
            }
          }
        }
      `;

      const response = await axios.post(
        "https://www.lesswrong.com/graphql",
        { query },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          },
        }
      );

      if (!response.data.data?.post?.result) {
        console.error("API Response:", JSON.stringify(response.data, null, 2));
        throw new Error("Post not found in LessWrong API response");
      }

      const post = response.data.data.post.result;
      console.log("📝 Post metadata:", {
        title: post.title,
        author: post.user.displayName,
        date: post.postedAt,
      });

      return {
        html: post.contents.html,
        title: post.title,
        author: post.user.displayName || post.user.username,
        date: post.postedAt,
      };
    }

    // Check if this is an EA Forum URL
    if (url.includes("forum.effectivealtruism.org")) {
      const postId = url.split("/posts/")[1]?.split("/")[0];
      if (!postId) {
        throw new Error("Could not extract post ID from EA Forum URL");
      }

      console.log(`📥 Fetching post ${postId} from EA Forum API...`);

      const query = `
        query GetPost {
          post(input: { selector: { _id: "${postId}" } }) {
            result {
              _id
              title
              contents {
                html
              }
              user {
                displayName
                username
              }
              postedAt
            }
          }
        }
      `;

      const response = await axios.post(
        "https://forum.effectivealtruism.org/graphql",
        { query },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          },
        }
      );

      if (!response.data.data?.post?.result) {
        console.error("API Response:", JSON.stringify(response.data, null, 2));
        throw new Error("Post not found in EA Forum API response");
      }

      const post = response.data.data.post.result;
      console.log("📝 Post metadata:", {
        title: post.title,
        author: post.user.displayName,
        date: post.postedAt,
      });

      return {
        html: post.contents.html,
        title: post.title,
        author: post.user.displayName || post.user.username,
        date: post.postedAt,
      };
    }

    // For non-LessWrong/EA Forum URLs, use the existing scraping logic
    url = transformEAForumUrl(url);
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
    });
    return {
      html: response.data,
      title: null,
      author: null,
      date: null,
    };
  } catch (error) {
    console.error("Error fetching article:", error);
    throw new Error("Failed to fetch article from URL");
  }
}

export function createCleanDOM(html: string): JSDOM {
  // Strip out all scripts and styles before parsing to prevent execution
  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "");

  // Create a virtual console that suppresses all output
  const virtualConsole = new (require("jsdom").VirtualConsole)();

  return new JSDOM(cleanedHtml, {
    virtualConsole,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: false,
  });
}

export async function extractMetadataWithClaude(
  html: string
): Promise<{ title: string; author: string; date: string }> {
  try {
    console.log("🤖 Calling Claude to extract metadata...");

    // Create a DOM parser to extract relevant sections
    const dom = createCleanDOM(html);
    const document = dom.window.document;

    // Extract potential metadata sections
    const metaSections = [
      // Meta tags
      ...Array.from(
        document.querySelectorAll(
          'meta[property*="title"], meta[property*="author"], meta[property*="date"], meta[property*="published"], meta[name*="title"], meta[name*="author"], meta[name*="date"]'
        )
      )
        .map(
          (el) =>
            `${el.getAttribute("property") || el.getAttribute("name")}: ${el.getAttribute("content")}`
        )
        .filter(Boolean),

      // Title tag
      document.querySelector("title")?.textContent,

      // EA Forum specific elements
      ...Array.from(
        document.querySelectorAll(".PostsAuthors-author, .PostsTitle-root")
      )
        .map((el) => el.textContent)
        .filter(Boolean),

      // Article header sections
      ...Array.from(
        document.querySelectorAll("header, article h1, .article-header")
      )
        .slice(0, 3)
        .map((el) => el.textContent)
        .filter(Boolean),

      // First few paragraphs for context
      ...Array.from(document.querySelectorAll("p"))
        .slice(0, 3)
        .map((el) => el.textContent)
        .filter(Boolean),
    ].filter(Boolean);

    const userMessage = `Extract the title, author name, and publication date from these text sections. 
Pay special attention to finding the actual author - look for patterns like "[Name]'s Post" or a name followed by a colon in comments.
If any field cannot be found, use "Unknown" for author, "Untitled Article" for title, or today's date for date.

The date should be in YYYY-MM-DD format.

Text sections:
${metaSections.join("\n")}`;

    const response = await withTimeout(
      anthropic.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 200,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        tools: [
          {
            name: "extract_metadata",
            description:
              "Extract title, author, and publication date from the provided text sections",
            input_schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description:
                    "The article title, or 'Untitled Article' if not found",
                },
                author: {
                  type: "string",
                  description:
                    "The author name, or 'Unknown Author' if not found",
                },
                date: {
                  type: "string",
                  description:
                    "Publication date in YYYY-MM-DD format, or today's date if not found",
                },
              },
              required: ["title", "author", "date"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_metadata" },
      }),
      30000, // 30 second timeout
      "Claude API request timed out after 30 seconds"
    );

    console.log("🤖 Claude Response received");

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "extract_metadata") {
      throw new Error(
        "No tool use response from Claude for metadata extraction"
      );
    }

    const metadata = toolUse.input as {
      title: string;
      author: string;
      date: string;
    };

    return {
      title: metadata.title || "Untitled Article",
      author: metadata.author || "Unknown Author",
      date: metadata.date || new Date().toISOString().split("T")[0],
    };
  } catch (error: any) {
    console.error("❌ Error in extractMetadataWithClaude:", error);
    return {
      title: "Untitled Article",
      author: "Unknown Author",
      date: new Date().toISOString().split("T")[0],
    };
  }
}

export function extractMetadataSimple(dom: JSDOM, url: string) {
  const doc = dom.window.document;

  // Basic metadata extraction using simple selectors
  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
    doc.querySelector("title")?.textContent ||
    "Untitled Article";

  const author =
    doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
    doc
      .querySelector('meta[property="article:author"]')
      ?.getAttribute("content") ||
    doc.querySelector('[rel="author"]')?.textContent ||
    "Unknown Author";

  const datePublished =
    doc
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content") ||
    doc
      .querySelector('meta[property="og:published_time"]')
      ?.getAttribute("content") ||
    doc.querySelector("time")?.getAttribute("datetime") ||
    new Date().toISOString().split("T")[0];

  // Detect platform from URL
  const platforms: string[] = [];
  if (url.includes("facebook.com")) platforms.push("Facebook");
  if (url.includes("twitter.com") || url.includes("x.com"))
    platforms.push("Twitter");
  if (url.includes("linkedin.com")) platforms.push("LinkedIn");
  if (url.includes("medium.com")) platforms.push("Medium");
  if (url.includes("substack.com")) platforms.push("Substack");
  if (url.includes("forum.effectivealtruism.org")) platforms.push("EA Forum");
  if (url.includes("lesswrong.com")) platforms.push("LessWrong");

  return {
    title: title.trim(),
    author: author.trim(),
    date: datePublished.split("T")[0], // Convert to YYYY-MM-DD format
    platforms,
  };
}

export function extractContent(dom: JSDOM): string {
  const doc = dom.window.document;

  // Try to find the main article content
  const contentSelectors = [
    // Substack-specific selectors
    ".body.markup",
    ".post-content",
    ".available-content",
    "[data-testid='post-content']",
    // Generic selectors
    "article",
    ".article-content",
    ".entry-content",
    "main",
    "#content",
    ".content",
    ".post-body",
    ".story-body",
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = doc.querySelector(selector);
    if (contentElement) break;
  }

  if (!contentElement) {
    console.warn(
      "Could not find main content element. Using body as fallback."
    );
    contentElement = doc.body;
  }

  // Remove unwanted elements
  const unwantedSelectors = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    ".comments",
    ".social-share",
    ".related-posts",
    ".sidebar",
    ".advertisement",
    ".ad",
    ".newsletter-signup",
    // Substack-specific elements
    ".subscription-widget",
    ".share-dialog",
    ".social-buttons",
    ".subscribe-widget",
    "[class*='share']",
    "[class*='social']",
    "[class*='subscribe']",
    // Generic UI elements
    ".button",
    ".btn",
    ".cta",
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = contentElement?.querySelectorAll(selector);
    elements?.forEach((el) => el.remove());
  });

  return contentElement?.innerHTML || "";
}

export function convertToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Add rule to remove share/social elements
  turndownService.addRule("removeShareElements", {
    filter: (node) => {
      if (node.nodeType !== 1) return false; // Only element nodes
      const element = node as Element;
      const text = element.textContent?.toLowerCase() || "";
      const className = element.className?.toLowerCase() || "";

      // Remove elements that contain sharing/social text
      return (
        text.includes("share this post") ||
        text.includes("copy link") ||
        text.includes("facebook") ||
        text.includes("subscribe") ||
        text.includes("notes") ||
        text.includes("more") ||
        className.includes("share") ||
        className.includes("social") ||
        className.includes("subscribe")
      );
    },
    replacement: () => "",
  });

  // Add custom rules for Facebook posts
  turndownService.addRule("facebookPost", {
    filter: (node) => {
      return (
        node.nodeName === "DIV" &&
        (node.className?.includes("userContent") ||
          node.className?.includes("story_body_container"))
      );
    },
    replacement: (content) => {
      // Clean up the content
      return content
        .replace(/\[.*?\]/g, "") // Remove Facebook links
        .replace(/See more/g, "") // Remove "See more" text
        .replace(/All reactions:.*/g, "") // Remove reactions
        .replace(/Like.*Comment.*Most relevant/g, "") // Remove Facebook UI elements
        .replace(/\[.*?\]/g, "") // Remove any remaining square brackets
        .trim();
    },
  });

  // Add rule to remove Facebook-specific elements
  turndownService.addRule("removeFacebookElements", {
    filter: (node) => {
      return (
        node.nodeName === "DIV" &&
        (node.className?.includes("_3x-2") ||
          node.className?.includes("_4-u2") ||
          node.className?.includes("_4-u8"))
      );
    },
    replacement: () => "",
  });

  // Add rule to preserve images with better handling
  turndownService.addRule("preserveImages", {
    filter: "img",
    replacement: (content, node) => {
      const alt = (node as Element).getAttribute("alt") || "";
      const src = (node as Element).getAttribute("src") || "";

      // Only include images that have actual source URLs
      if (src && src.startsWith("http")) {
        const altText = alt || "Image";
        return `\n\n![${altText}](${src})\n\n`;
      }

      // Skip images without valid sources (likely placeholders or broken)
      return "";
    },
  });

  // Add rule to handle linked images (common in Substack)
  turndownService.addRule("linkedImages", {
    filter: (node) => {
      if (node.nodeName !== "A") return false;
      const link = node as Element;
      const img = link.querySelector("img");
      if (!img) return false;

      // Check if this is a link that just wraps an image
      const href = link.getAttribute("href") || "";
      const imgSrc = img.getAttribute("src") || "";

      // If the link points to an image URL (common in Substack), return true
      return (
        href.includes("substackcdn.com/image") ||
        href.includes(".jpg") ||
        href.includes(".jpeg") ||
        href.includes(".png") ||
        href.includes(".gif") ||
        href.includes(".webp")
      );
    },
    replacement: (content, node) => {
      const img = (node as Element).querySelector("img");
      if (!img) return content;

      const alt = img.getAttribute("alt") || "Image";
      const src = img.getAttribute("src") || "";

      // Just return the image markdown without the link wrapper
      return src && src.startsWith("http") ? `\n\n![${alt}](${src})\n\n` : "";
    },
  });

  // Add rule to preserve regular links (but not image links)
  turndownService.addRule("preserveLinks", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as Element).getAttribute("href") || "";
      return href ? `[${content}](${href})` : content;
    },
  });

  return turndownService.turndown(html);
}

export async function cleanContentWithClaude(
  markdownContent: string
): Promise<string> {
  try {
    console.log("🤖 Cleaning content with Claude...");

    // For very long content, just take the first part to avoid token limits
    const maxLength = 100000;
    const contentToClean =
      markdownContent.length > maxLength
        ? markdownContent.substring(0, maxLength) +
          `\n\n[Content truncated for processing - ${Math.round((1 - maxLength / markdownContent.length) * 100)}% of content removed]`
        : markdownContent;

    const userMessage = `Clean up this content by removing only obvious platform UI elements while preserving all meaningful content.

IMPORTANT INSTRUCTIONS:
- Keep ALL meaningful article content: text, paragraphs, lists, links, data, examples
- Preserve ALL images in markdown format ![alt](url) 
- Keep all headings, subheadings, and document structure
- Remove only obvious UI elements: sharing buttons, navigation, subscription prompts, platform-specific widgets
- When in doubt, keep the content rather than remove it
- Focus on removing UI chrome, not article substance

Content to clean:
${contentToClean}`;

    // Use streaming for long content to avoid timeout issues
    const stream = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 64000, // Max allowed for Sonnet
      temperature: 0.1,
      stream: true,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      tools: [
        {
          name: "clean_content",
          description:
            "Clean and format content by removing platform-specific elements while preserving core message",
          input_schema: {
            type: "object",
            properties: {
              cleaned_content: {
                type: "string",
                description:
                  "The cleaned content with platform-specific formatting and UI elements removed",
              },
            },
            required: ["cleaned_content"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "clean_content" },
    });

    let fullContent = "";
    let toolUse: any = null;

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_start" &&
        chunk.content_block.type === "tool_use"
      ) {
        toolUse = { name: chunk.content_block.name, input: {} };
      } else if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "input_json_delta"
      ) {
        fullContent += chunk.delta.partial_json;
      }
    }

    if (!toolUse || fullContent === "") {
      throw new Error("No tool use response from Claude for content cleaning");
    }

    // Parse the accumulated JSON
    const parsedInput = JSON.parse(fullContent);

    const cleanedContent = parsedInput.cleaned_content?.trim();

    if (!cleanedContent) {
      throw new Error("Empty Claude response for content cleaning");
    }

    // Safety check: if cleaned content is much shorter than original, use original
    const originalWordCount = markdownContent.split(/\s+/).length;
    const cleanedWordCount = cleanedContent.split(/\s+/).length;

    if (cleanedWordCount < originalWordCount * 0.3) {
      console.warn("⚠️ Cleaned content too short, using original markdown");
      return markdownContent;
    }

    return cleanedContent;
  } catch (error) {
    console.error("❌ Error cleaning content with Claude:", error);
    return markdownContent; // Fallback to original content
  }
}

export function detectPlatforms(url: string): string[] {
  const platforms: string[] = [];
  if (url.includes("facebook.com")) platforms.push("Facebook");
  if (url.includes("twitter.com") || url.includes("x.com"))
    platforms.push("Twitter");
  if (url.includes("linkedin.com")) platforms.push("LinkedIn");
  if (url.includes("medium.com")) platforms.push("Medium");
  if (url.includes("substack.com")) platforms.push("Substack");
  if (url.includes("forum.effectivealtruism.org")) platforms.push("EA Forum");
  if (url.includes("lesswrong.com")) platforms.push("LessWrong");
  return platforms;
}

export async function processArticle(url: string): Promise<ProcessedArticle> {
  console.log(`📥 Fetching article from ${url}...`);
  const { html, title, author, date } = await fetchArticle(url);

  console.log("🔍 Parsing HTML...");
  const dom = createCleanDOM(html);

  console.log("📝 Extracting metadata...");
  // Try simple extraction first, then fallback to Claude if needed
  const simpleMetadata = extractMetadataSimple(dom, url);
  const metadata =
    simpleMetadata.title === "Untitled Article" ||
    simpleMetadata.author === "Unknown Author"
      ? await extractMetadataWithClaude(html)
      : simpleMetadata;

  console.log("📄 Extracting content...");
  const contentHtml = extractContent(dom);

  console.log("🔄 Converting to Markdown...");
  const markdownContent = convertToMarkdown(contentHtml);

  console.log("🧹 Cleaning content with Claude...");
  const cleanedContent = await cleanContentWithClaude(markdownContent);

  // Use the best available title, author, and date
  const finalTitle = title || metadata.title || "Untitled Article";
  const finalAuthor = author || metadata.author || "Unknown Author";
  const finalDate =
    date || metadata.date || new Date().toISOString().split("T")[0];

  const platforms = detectPlatforms(url);

  return {
    title: finalTitle,
    author: finalAuthor,
    date: finalDate,
    content: cleanedContent,
    platforms,
    url,
  };
}
