import axios from "axios";
import { JSDOM } from "jsdom";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import TurndownService from "turndown";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";
import {
  openai,
  SEARCH_MODEL,
} from "@/types/openai";

function transformEAForumUrl(url: string): string {
  if (url.includes("forum.effectivealtruism.org")) {
    const forumUrl = new URL(url);
    const path = forumUrl.pathname;
    const botsUrl = `https://forum-bots.effectivealtruism.org${path}`;
    console.log(`🔄 Using forum-bots URL: ${botsUrl}`);
    return botsUrl;
  }
  return url;
}

async function fetchArticle(url: string) {
  try {
    // Check if this is a LessWrong or EA Forum URL
    if (
      url.includes("lesswrong.com") ||
      url.includes("forum.effectivealtruism.org")
    ) {
      // Extract the post ID from the URL
      const postId = url.split("/posts/")[1]?.split("/")[0];
      if (!postId) {
        throw new Error("Could not extract post ID from URL");
      }

      const isEAForum = url.includes("forum.effectivealtruism.org");
      const apiUrl = isEAForum
        ? "https://forum.effectivealtruism.org/graphql"
        : "https://www.lesswrong.com/graphql";
      const platformName = isEAForum ? "EA Forum" : "LessWrong";

      console.log(`📥 Fetching post ${postId} from ${platformName} API...`);

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
        apiUrl,
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
        throw new Error(`Post not found in ${platformName} API response`);
      }

      const post = response.data.data.post.result;
      console.log("📝 Post metadata:", {
        title: post.title,
        author: post.user.displayName,
        date: post.postedAt,
      });

      return {
        html: post.contents.html,
        title: post.title.trim(),
        author: post.user.displayName || post.user.username,
        date: post.postedAt,
      };
    }

    // For other URLs, use scraping logic
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

async function extractMetadataSimple(dom: JSDOM, url: string) {
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

function extractContent(dom: JSDOM) {
  const doc = dom.window.document;

  // Try to find the main article content
  const contentSelectors = [
    "article",
    ".article-content",
    ".post-content",
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
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = contentElement?.querySelectorAll(selector);
    elements?.forEach((el) => el.remove());
  });

  return contentElement?.innerHTML || "";
}

function convertToMarkdown(html: string) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Add rule to clean up images
  turndownService.addRule("cleanImages", {
    filter: "img",
    replacement: (content, node) => {
      const alt = (node as Element).getAttribute("alt") || "";
      const src = (node as Element).getAttribute("src") || "";
      return alt && src ? `\n\n![${alt}](${src})\n\n` : "";
    },
  });

  // Add rule to preserve links
  turndownService.addRule("preserveLinks", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as Element).getAttribute("href") || "";
      return href ? `[${content}](${href})` : content;
    },
  });

  return turndownService.turndown(html);
}

async function extractMetadataWithLLM(html: string, url: string) {
  try {
    console.log("🤖 Using LLM to extract metadata...");

    // Create a DOM to extract key sections for LLM analysis
    const dom = new JSDOM(html, {
      resources: "usable",
      runScripts: "dangerously",
      pretendToBeVisual: false,
      includeNodeLocations: false,
      storageQuota: 10000000,
    });
    const doc = dom.window.document;

    // Extract key sections that likely contain metadata
    const metaSections = [
      // Title tag
      doc.querySelector("title")?.textContent,

      // Meta tags
      ...Array.from(
        doc.querySelectorAll(
          'meta[property*="title"], meta[property*="author"], meta[name*="author"], meta[property*="published"]'
        )
      )
        .map(
          (el) =>
            `${el.getAttribute("property") || el.getAttribute("name")}: ${el.getAttribute("content")}`
        )
        .filter(Boolean),

      // Header sections
      ...Array.from(doc.querySelectorAll("h1, h2, .title, .author, .byline"))
        .slice(0, 5)
        .map((el) => el.textContent?.trim())
        .filter(Boolean),

      // First few paragraphs
      ...Array.from(doc.querySelectorAll("p"))
        .slice(0, 3)
        .map((el) => el.textContent?.trim())
        .filter((text) => text && text.length > 20),
    ].filter(Boolean);

    const prompt = `Extract the title, author, and publication date from this webpage content.
URL: ${url}

Content sections:
${metaSections.slice(0, 15).join("\n---\n")}

Return ONLY a JSON object with these fields:
{
  "title": "Article title",
  "author": "Author name", 
  "date": "YYYY-MM-DD"
}

If any field cannot be determined, use "Untitled Article" for title, "Unknown Author" for author, or today's date for date.`;

    const response = await openai.chat.completions.create({
      model: SEARCH_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty LLM response");
    }

    // Clean and parse JSON
    const cleanedContent = content
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const metadata = JSON.parse(cleanedContent);
    return {
      title: metadata.title || "Untitled Article",
      author: metadata.author || "Unknown Author",
      date: metadata.date || new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("❌ Error extracting metadata with LLM:", error);
    return {
      title: "Untitled Article",
      author: "Unknown Author",
      date: new Date().toISOString().split("T")[0],
    };
  }
}

async function cleanContentWithLLM(
  markdownContent: string,
  title: string
): Promise<string> {
  try {
    console.log("🤖 Cleaning content with LLM...");

    // For very long content, just take the first part to avoid token limits
    const maxLength = 30000;
    const contentToClean =
      markdownContent.length > maxLength
        ? markdownContent.substring(0, maxLength) +
          `\n\n[Content truncated for RoastMyPost processing - ${Math.round((1 - maxLength / markdownContent.length) * 100)}% of content removed]`
        : markdownContent;

    const prompt = `Format the following markdown content to ensure it is clean and readable. 
Do not remove or change any content, only fix formatting issues such as spacing, line breaks, or markdown syntax.
The content is from a post titled "${title}".

Content to format:
${contentToClean}

Return ONLY the formatted markdown content, nothing else.`;

    const response = await openai.chat.completions.create({
      model: SEARCH_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 100000,
    });

    const cleanedContent = response.choices[0]?.message?.content?.trim();
    return cleanedContent || markdownContent;
  } catch (error) {
    console.error("❌ Error cleaning content with LLM:", error);
    return markdownContent; // Fallback to original content
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    console.log("🔐 Session debug:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.log("❌ No valid session found");
      return NextResponse.json(
        { error: "User must be logged in to import a document" },
        { status: 401 }
      );
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`📥 Fetching article from ${url}...`);
    const { html, title, author, date } = await fetchArticle(url);

    console.log("🔍 Parsing HTML...");
    const dom = new JSDOM(html, {
      resources: "usable",
      runScripts: "dangerously",
      pretendToBeVisual: false,
      includeNodeLocations: false,
      storageQuota: 10000000,
    });

    console.log("📝 Extracting metadata...");
    // Try simple extraction first, then fallback to LLM if needed
    const simpleMetadata = await extractMetadataSimple(dom, url);
    const metadata =
      simpleMetadata.title === "Untitled Article" ||
      simpleMetadata.author === "Unknown Author"
        ? await extractMetadataWithLLM(html, url)
        : simpleMetadata;

    console.log("📄 Extracting content...");
    const contentHtml = extractContent(dom);

    console.log("🔄 Converting to Markdown...");
    const markdownContent = convertToMarkdown(contentHtml);

    console.log("🧹 Cleaning content with LLM...");
    const cleanedContent = await cleanContentWithLLM(
      markdownContent,
      title || metadata.title || "Untitled Article"
    );

    // Use the best available title, author, and date
    const finalTitle = title || metadata.title || "Untitled Article";
    const finalAuthor = author || metadata.author || "Unknown Author";
    const finalDate =
      date || metadata.date || new Date().toISOString().split("T")[0];

    // Detect platforms
    const platforms: string[] = [];
    if (url.includes("facebook.com")) platforms.push("Facebook");
    if (url.includes("twitter.com") || url.includes("x.com"))
      platforms.push("Twitter");
    if (url.includes("linkedin.com")) platforms.push("LinkedIn");
    if (url.includes("medium.com")) platforms.push("Medium");
    if (url.includes("substack.com")) platforms.push("Substack");
    if (url.includes("forum.effectivealtruism.org")) platforms.push("EA Forum");
    if (url.includes("lesswrong.com")) platforms.push("LessWrong");

    const documentData = {
      title: finalTitle,
      authors: finalAuthor,
      content: cleanedContent,
      urls: url,
      platforms: platforms.join(", "),
    };

    console.log("💾 Creating document...");
    const document = await DocumentModel.create({
      ...documentData,
      submittedById: session.user.id,
    });

    const latestVersion = document.versions[document.versions.length - 1];
    return NextResponse.json({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: latestVersion.title,
        authors: latestVersion.authors,
      },
    });
  } catch (error) {
    console.error("❌ Error importing document:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import document",
      },
      { status: 500 }
    );
  }
}
