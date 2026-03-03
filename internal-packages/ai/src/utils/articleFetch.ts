/**
 * Article fetching and processing utilities.
 *
 * Fetches articles from URLs using a multi-strategy pipeline:
 * Diffbot → Firecrawl → LessWrong/EA Forum GraphQL → JSDOM fallback.
 *
 * Moved from apps/web/src/infrastructure/external/articleImport.ts so that
 * both the web app and the agentic MCP tools can share the same logic.
 */

import axios from "axios";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { logger } from "../shared/logger";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_KEY;
const DIFFBOT_KEY = process.env.DIFFBOT_KEY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleData {
  html: string;
  markdown?: string;
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

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      author?: string;
      publishedDate?: string;
      sourceURL?: string;
      language?: string;
      statusCode?: number;
    };
    links?: string[];
  };
  error?: string;
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

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function transformEAForumUrl(url: string): string {
  if (url.includes("forum.effectivealtruism.org")) {
    const forumUrl = new URL(url);
    const path = forumUrl.pathname;
    const botsUrl = `https://forum-bots.effectivealtruism.org${path}`;
    return botsUrl;
  }
  return url;
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

// ---------------------------------------------------------------------------
// Raw HTML / API fetching
// ---------------------------------------------------------------------------

export async function fetchArticle(url: string): Promise<ArticleData> {
  try {
    // Check if this is a LessWrong URL
    if (url.includes("lesswrong.com")) {
      const postId = url.split("/posts/")[1]?.split("/")[0];
      if (!postId) {
        throw new Error("Could not extract post ID from LessWrong URL");
      }

      const query = `
        query GetPost {
          post(input: { selector: { _id: "${postId}" } }) {
            result {
              _id
              title
              contents {
                markdown
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
        logger.error('API Response:', JSON.stringify(response.data, null, 2));
        throw new Error("Post not found in LessWrong API response");
      }

      const post = response.data.data.post.result;

      return {
        html: post.contents.html,
        markdown: post.contents.markdown,
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

      const query = `
        query GetPost {
          post(input: { selector: { _id: "${postId}" } }) {
            result {
              _id
              title
              contents {
                markdown
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
        logger.error('API Response:', JSON.stringify(response.data, null, 2));
        throw new Error("Post not found in EA Forum API response");
      }

      const post = response.data.data.post.result;

      return {
        html: post.contents.html,
        markdown: post.contents.markdown,
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
    logger.error('Error fetching article:', error);
    throw new Error("Failed to fetch article from URL");
  }
}

// ---------------------------------------------------------------------------
// DOM / HTML helpers
// ---------------------------------------------------------------------------

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
    date: datePublished.split("T")[0],
    platforms,
  };
}

export function extractContent(dom: JSDOM): string {
  const doc = dom.window.document;

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
    const hasWrapperElements = doc.querySelectorAll('div, article, main, section').length > 0;
    const hasParagraphs = doc.querySelectorAll('p').length > 0;

    if (!hasWrapperElements && hasParagraphs) {
      return doc.body.innerHTML;
    }

    logger.warn(
      "Could not find main content element. Using body as fallback."
    );
    contentElement = doc.body;
  }

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
    ".subscription-widget",
    ".share-dialog",
    ".social-buttons",
    ".subscribe-widget",
    "[class*='share']",
    "[class*='social']",
    "[class*='subscribe']",
    ".button",
    ".btn",
    ".cta",
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = contentElement?.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      logger.debug(`Removing ${elements.length} elements matching: ${selector}`);
    }
    elements?.forEach((el: Element) => el.remove());
  });

  return contentElement?.innerHTML || "";
}

// ---------------------------------------------------------------------------
// Markdown conversion
// ---------------------------------------------------------------------------

export function convertToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndownService.addRule("handleFootnotesSection", {
    filter: (node) => {
      return node.nodeName === "SECTION" &&
             (node.className === "footnotes" || node.id === "footnotes");
    },
    replacement: (content, _node) => {
      const hasHeader = content.trim().startsWith('#');
      if (!hasHeader) {
        return `\n\n## Footnotes\n\n${content}`;
      }
      return `\n\n${content}`;
    },
  });

  turndownService.addRule("preserveHR", {
    filter: "hr",
    replacement: () => "\n\n* * *\n\n",
  });

  turndownService.addRule("removeShareElements", {
    filter: (node) => {
      if (node.nodeType !== 1) return false;
      const element = node as Element;
      const text = element.textContent?.toLowerCase() || "";
      const className = element.className?.toLowerCase() || "";

      if (text.length > 200) return false;

      const isShareElement = (
        className.includes("share") ||
        className.includes("social") ||
        className.includes("subscribe") ||
        className.includes("facebook") ||
        className.includes("twitter")
      );

      const hasShareText = (
        text === "share this post" ||
        text === "copy link" ||
        text === "share" ||
        text === "subscribe" ||
        (text.includes("share") && text.includes("post")) ||
        (text.includes("copy") && text.includes("link"))
      );

      return isShareElement || hasShareText;
    },
    replacement: () => "",
  });

  turndownService.addRule("facebookPost", {
    filter: (node) => {
      return (
        node.nodeName === "DIV" &&
        (node.className?.includes("userContent") ||
          node.className?.includes("story_body_container"))
      );
    },
    replacement: (content) => {
      return content
        .replace(/\[.*?\]/g, "")
        .replace(/See more/g, "")
        .replace(/All reactions:.*/g, "")
        .replace(/Like.*Comment.*Most relevant/g, "")
        .replace(/\[.*?\]/g, "")
        .trim();
    },
  });

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

  turndownService.addRule("preserveImages", {
    filter: "img",
    replacement: (content, node) => {
      const alt = (node as Element).getAttribute("alt") || "";
      const src = (node as Element).getAttribute("src") || "";

      if (src && src.startsWith("http")) {
        const altText = alt || "Image";
        return `\n\n![${altText}](${src})\n\n`;
      }

      return "";
    },
  });

  turndownService.addRule("linkedImages", {
    filter: (node) => {
      if (node.nodeName !== "A") return false;
      const link = node as Element;
      const img = link.querySelector("img");
      if (!img) return false;

      const href = link.getAttribute("href") || "";

      return (
        href.includes("substackcdn.com/image") ||
        href.includes(".jpg") ||
        href.includes(".jpeg") ||
        href.includes(".png") ||
        href.includes(".gif") ||
        href.includes(".webp") ||
        (link.childNodes.length === 1 && link.childNodes[0].nodeName === "IMG")
      );
    },
    replacement: (content, node) => {
      const img = (node as Element).querySelector("img");
      if (!img) return content;

      const alt = img.getAttribute("alt") || "Image";
      const src = img.getAttribute("src") || "";

      return src && src.startsWith("http") ? `![${alt}](${src})` : "";
    },
  });

  turndownService.addRule("preserveLinks", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as Element).getAttribute("href") || "";
      return href ? `[${content}](${href})` : content;
    },
  });

  return turndownService.turndown(html);
}

// ---------------------------------------------------------------------------
// Markdown cleanup
// ---------------------------------------------------------------------------

export function cleanMarkdownContent(content: string): string {
  content = content.replace(/\[\s*!\[([^\]]*)\]\(([^)]+)\)\s*\]\([^)]+\)/g, '![$1]($2)');
  content = content.replace(/\[\s*\n*!\[/g, '[![');
  content = content.replace(/\]\s*\n*\]/g, ']]');
  content = content.replace(/\n{3,}(!\[)/g, '\n\n$1');
  content = content.replace(/(!\[[^\]]*\]\([^)]+\))\n{3,}/g, '$1\n\n');
  content = content.replace(/!\[([^\]]*)\]\s*\n+\s*\(([^)]+)\)/g, '![$1]($2)');
  content = content.replace(/\[(?:\s|\n)*!\[([^\]]*)\](?:\s|\n)*\(([^)]+)\)(?:\s|\n)*\](?:\s|\n)*\([^)]+\)/g, '![$1]($2)');
  return content;
}

export function reorganizeFootnotes(content: string): string {
  const lines = content.split('\n');
  const footnoteDefPattern = /^\[(\^[^\]]+)\]:\s(.*)$/;
  const footnoteRefPattern = /\[(\^[^\]]+)\]/g;

  const mainContent: string[] = [];
  const footnotes = new Map<string, { content: string; number: number }>();
  let footnoteCounter = 0;

  const fullText = lines.join('\n');
  const refs = Array.from(fullText.matchAll(footnoteRefPattern));
  const refNumberMap = new Map<string, number>();

  for (const match of refs) {
    const ref = match[1];
    if (!refNumberMap.has(ref)) {
      footnoteCounter++;
      refNumberMap.set(ref, footnoteCounter);
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(footnoteDefPattern);

    if (match) {
      const [, ref, startContent] = match;
      let footnoteContent = startContent;

      i++;
      while (i < lines.length && lines[i].trim() && !footnoteDefPattern.test(lines[i])) {
        footnoteContent += '\n' + lines[i];
        i++;
      }

      if (!footnotes.has(ref)) {
        const number = refNumberMap.get(ref) || 0;
        footnotes.set(ref, { content: footnoteContent, number });
      }

      while (i < lines.length && !lines[i].trim()) {
        i++;
      }
    } else {
      let processedLine = line;
      for (const [ref, number] of refNumberMap.entries()) {
        const refPattern = new RegExp(`\\[\\${ref}\\]`, 'g');
        processedLine = processedLine.replace(refPattern, `[${number}]`);
      }
      mainContent.push(processedLine);
      i++;
    }
  }

  while (mainContent.length > 0 && !mainContent[mainContent.length - 1].trim()) {
    mainContent.pop();
  }

  if (footnotes.size > 0) {
    mainContent.push('');
    mainContent.push('---');
    mainContent.push('');

    const sortedFootnotes = Array.from(footnotes.entries())
      .sort((a, b) => a[1].number - b[1].number);

    for (const [_ref, { content, number }] of sortedFootnotes) {
      mainContent.push(`${number}. ${content}`);
    }

    mainContent.push('');
  }

  return mainContent.join('\n');
}

// ---------------------------------------------------------------------------
// Full processing pipeline
// ---------------------------------------------------------------------------

export async function processArticle(url: string): Promise<ProcessedArticle> {
  // Try Diffbot first if available, then Firecrawl, then fallback
  if (DIFFBOT_KEY) {
    try {
      return await processArticleWithDiffbot(url);
    } catch (_error) {
      logger.warn('Diffbot failed, trying Firecrawl...');
    }
  }

  if (!FIRECRAWL_API_KEY) {
    logger.warn('FIRECRAWL_KEY not found, using fallback method');
    return processArticleFallback(url);
  }

  // For LessWrong and EA Forum, try direct API first since it's faster
  if (url.includes("lesswrong.com") || url.includes("forum.effectivealtruism.org")) {
    try {
      logger.info(`Trying LessWrong/EA Forum direct API first...`);
      return await processArticleFallback(url);
    } catch (_error) {
      logger.warn('Direct API failed, will try Firecrawl');
    }
  }

  logger.info(`Fetching article from ${url} with Firecrawl...`);

  try {
    logger.info(`Calling Firecrawl API...`);
    const response = await axios.post<FirecrawlResponse>(
      'https://api.firecrawl.dev/v1/scrape',
      {
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        excludeTags: [
          'nav',
          '[role="navigation"]',
          '.sidebar',
          'aside'
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "No article content found by Firecrawl");
    }

    const { data } = response.data;
    logger.info('Firecrawl extraction successful');

    const title = data.metadata?.title || "Untitled Article";
    const author = data.metadata?.author || "Unknown Author";
    const date = data.metadata?.publishedDate ?
      new Date(data.metadata.publishedDate).toISOString().split("T")[0] :
      new Date().toISOString().split("T")[0];

    let content: string = data.markdown || "";

    if (!content && data.html) {
      logger.info('Converting HTML to Markdown...');
      content = convertToMarkdown(data.html);
    }

    if (content.length < 100) {
      logger.info('Firecrawl content too short, falling back to manual extraction...');
      return processArticleFallback(url);
    }

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
    logger.error('Firecrawl extraction failed:', error);
    logger.info('Falling back to manual extraction...');
    return processArticleFallback(url);
  }
}

// ---------------------------------------------------------------------------
// Diffbot strategy
// ---------------------------------------------------------------------------

async function processArticleWithDiffbot(url: string): Promise<ProcessedArticle> {
  logger.info(`Fetching article from ${url} with Diffbot...`);

  try {
    const diffbotUrl = `https://api.diffbot.com/v3/article`;
    const response = await axios.get<DiffbotResponse>(diffbotUrl, {
      params: {
        token: DIFFBOT_KEY,
        url: url,
        discussion: false,
      },
      timeout: 30000,
    });

    if (!response.data.objects || response.data.objects.length === 0) {
      throw new Error("No article content found by Diffbot");
    }

    const article = response.data.objects[0];
    logger.info('Diffbot extraction successful');

    const title = article.title || "Untitled Article";
    const author = article.author || "Unknown Author";
    const date = article.date ?
      new Date(article.date).toISOString().split("T")[0] :
      new Date().toISOString().split("T")[0];

    let content: string;
    if (article.html) {
      logger.info('Converting HTML to Markdown...');
      content = convertToMarkdown(article.html);
    } else if (article.text) {
      if (article.text.includes('![') || article.text.includes('](')) {
        logger.info('Text appears to already be in Markdown format');
        content = article.text;
      } else {
        content = article.text;
      }
    } else {
      content = "";
    }

    if (content.length < 100) {
      throw new Error("Diffbot content too short");
    }

    content = cleanMarkdownContent(content);
    content = reorganizeFootnotes(content);

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
    logger.error('Diffbot extraction failed:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// JSDOM / direct-API fallback
// ---------------------------------------------------------------------------

async function processArticleFallback(url: string): Promise<ProcessedArticle> {
  const { html, markdown, title, author, date } = await fetchArticle(url);

  let finalContent: string;

  if (markdown) {
    logger.info('Using markdown directly from API');
    finalContent = reorganizeFootnotes(markdown);
  } else {
    logger.info('Parsing HTML...');
    const dom = createCleanDOM(html);

    logger.info('Extracting metadata...');
    const _metadata = extractMetadataSimple(dom, url);

    logger.info('Extracting content...');
    const contentHtml = extractContent(dom);

    logger.info('Converting to Markdown...');
    const markdownContent = convertToMarkdown(contentHtml);

    finalContent = cleanMarkdownContent(markdownContent);
  }

  let finalTitle = title || "Untitled Article";
  let finalAuthor = author || "Unknown Author";
  let finalDate = date || new Date().toISOString().split("T")[0];

  if (!title || !author || !date) {
    const dom = createCleanDOM(html);
    const metadata = extractMetadataSimple(dom, url);
    finalTitle = title || metadata.title || "Untitled Article";
    finalAuthor = author || metadata.author || "Unknown Author";
    finalDate = date || metadata.date || new Date().toISOString().split("T")[0];
  }

  const platforms = detectPlatforms(url);

  return {
    title: finalTitle,
    author: finalAuthor,
    date: finalDate,
    content: finalContent,
    platforms,
    url,
  };
}
