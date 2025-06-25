import axios from "axios";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const DIFFBOT_TOKEN = "985ac8d02f58e04139a86a0196f26137";

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

interface DiffbotResponse {
  objects: Array<{
    type: string;
    title: string;
    text: string;
    html: string;
    date: string;
    author: string;
    authorUrl?: string;
    siteName?: string;
    pageUrl: string;
    resolvedPageUrl: string;
    tags?: Array<{
      label: string;
      uri?: string;
    }>;
    images?: Array<{
      url: string;
      title?: string;
      width?: number;
      height?: number;
    }>;
  }>;
  request: {
    pageUrl: string;
    api: string;
    version: number;
  };
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

  // Add rule to handle linked images (common in Substack) - must come BEFORE default link handling
  turndownService.addRule("linkedImages", {
    filter: (node) => {
      if (node.nodeName !== "A") return false;
      const link = node as Element;
      const img = link.querySelector("img");
      if (!img) return false;

      // Check if this is a link that just wraps an image
      const href = link.getAttribute("href") || "";
      
      // If the link points to an image URL (common in Substack), return true
      return (
        href.includes("substackcdn.com/image") ||
        href.includes(".jpg") ||
        href.includes(".jpeg") ||
        href.includes(".png") ||
        href.includes(".gif") ||
        href.includes(".webp") ||
        // Also check if the only child is an image
        (link.childNodes.length === 1 && link.childNodes[0].nodeName === "IMG")
      );
    },
    replacement: (content, node) => {
      const img = (node as Element).querySelector("img");
      if (!img) return content;

      const alt = img.getAttribute("alt") || "Image";
      const src = img.getAttribute("src") || "";

      // Just return the image markdown without the link wrapper
      return src && src.startsWith("http") ? `![${alt}](${src})` : "";
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


export function cleanMarkdownContent(content: string): string {
  // Fix double-wrapped image links: [![alt](img)](link) -> ![alt](img)
  content = content.replace(/\[\s*!\[([^\]]*)\]\(([^)]+)\)\s*\]\([^)]+\)/g, '![$1]($2)');
  
  // Fix images with extra whitespace or newlines
  content = content.replace(/\[\s*\n*!\[/g, '[![');
  content = content.replace(/\]\s*\n*\]/g, ']]');
  
  // Remove duplicate newlines around images
  content = content.replace(/\n{3,}(!\[)/g, '\n\n$1');
  content = content.replace(/(!\[[^\]]*\]\([^)]+\))\n{3,}/g, '$1\n\n');
  
  // Fix broken image markdown with newlines in the middle
  content = content.replace(/!\[([^\]]*)\]\s*\n+\s*\(([^)]+)\)/g, '![$1]($2)');
  
  // Remove any remaining link wrappers around images that might have been missed
  content = content.replace(/\[(?:\s|\n)*!\[([^\]]*)\](?:\s|\n)*\(([^)]+)\)(?:\s|\n)*\](?:\s|\n)*\([^)]+\)/g, '![$1]($2)');
  
  return content;
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
  console.log(`📥 Fetching article from ${url} with Diffbot...`);
  
  try {
    // Use Diffbot Article API
    const diffbotUrl = `https://api.diffbot.com/v3/article`;
    const response = await axios.get<DiffbotResponse>(diffbotUrl, {
      params: {
        token: DIFFBOT_TOKEN,
        url: url,
        discussion: false, // We don't need comments
      },
      timeout: 30000, // 30 second timeout
    });

    if (!response.data.objects || response.data.objects.length === 0) {
      throw new Error("No article content found by Diffbot");
    }

    const article = response.data.objects[0];
    console.log("✅ Diffbot extraction successful");

    // Extract metadata from Diffbot response
    const title = article.title || "Untitled Article";
    const author = article.author || "Unknown Author";
    const date = article.date ? 
      new Date(article.date).toISOString().split("T")[0] : 
      new Date().toISOString().split("T")[0];

    // Convert HTML to Markdown if html is provided, otherwise use text
    let content: string;
    if (article.html) {
      console.log("🔄 Converting HTML to Markdown...");
      content = convertToMarkdown(article.html);
    } else if (article.text) {
      // Check if text already contains markdown patterns (like from Substack)
      if (article.text.includes('![') || article.text.includes('](')) {
        console.log("📝 Text appears to already be in Markdown format");
        // Clean up any double-wrapped image links
        content = article.text.replace(/\[\s*!\[([^\]]*)\]\(([^)]+)\)\s*\]\([^)]+\)/g, '![$1]($2)');
      } else {
        content = article.text;
      }
    } else {
      content = "";
    }

    // If content is still very short, try fallback to our original method
    if (content.length < 100) {
      console.log("⚠️ Diffbot content too short, falling back to manual extraction...");
      return processArticleFallback(url);
    }

    // Additional cleanup for common markdown issues
    content = cleanMarkdownContent(content);
    
    const platforms = detectPlatforms(url);

    return {
      title,
      author,
      date,
      content,
      platforms,
      url,
    };
  } catch (error) {
    console.error("❌ Diffbot extraction failed:", error);
    console.log("⚠️ Falling back to manual extraction...");
    return processArticleFallback(url);
  }
}

// Fallback to original extraction method for special cases
async function processArticleFallback(url: string): Promise<ProcessedArticle> {
  console.log(`📥 Fallback: Fetching article from ${url}...`);
  const { html, title, author, date } = await fetchArticle(url);

  console.log("🔍 Parsing HTML...");
  const dom = createCleanDOM(html);

  console.log("📝 Extracting metadata...");
  const metadata = extractMetadataSimple(dom, url);

  console.log("📄 Extracting content...");
  const contentHtml = extractContent(dom);

  console.log("🔄 Converting to Markdown...");
  const markdownContent = convertToMarkdown(contentHtml);

  // Use the best available title, author, and date
  const finalTitle = title || metadata.title || "Untitled Article";
  const finalAuthor = author || metadata.author || "Unknown Author";
  const finalDate =
    date || metadata.date || new Date().toISOString().split("T")[0];

  // Clean up markdown content
  const cleanedContent = cleanMarkdownContent(markdownContent);
  
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
