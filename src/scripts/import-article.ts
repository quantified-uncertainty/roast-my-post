#!/usr/bin/env tsx

import "dotenv/config";

import axios from "axios";
import { Command } from "commander";
import { writeFile } from "fs/promises";
import { JSDOM } from "jsdom";
import metascraper from "metascraper";
import metascraperAuthor from "metascraper-author";
import metascraperDate from "metascraper-date";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperLogo from "metascraper-logo";
import metascraperPublisher from "metascraper-publisher";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import path from "path";
import TurndownService from "turndown";

import { openai, SEARCH_MODEL } from "../types/openai";

const program = new Command();

program
  .name("import-article")
  .description(
    "Import an article from a URL and convert it to the correct JSON format"
  )
  .argument("<url>", "URL of the article to import")
  .option("-t, --title <title>", "Override the article title (optional)")
  .option("-a, --author <author>", "Override the article author (optional)")
  .option("-d, --date <date>", "Override the publication date (optional)")
  .option(
    "-i, --intended-agents <agents...>",
    "List of intended agents for analysis"
  )
  .parse(process.argv);

const options = program.opts();
const url = program.args[0];

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
    // Transform EA Forum URLs to use forum-bots
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
    const html = response.data;

    // Check if this is a linkpost by looking for the linkpost text and URL
    const dom = new JSDOM(html);
    const linkpostText = dom.window.document.querySelector("p")?.textContent;
    if (linkpostText?.startsWith("This is a linkpost for")) {
      // Extract the original URL from the linkpost text
      const linkMatch = linkpostText.match(/\[([^\]]+)\]/);
      if (linkMatch) {
        const originalUrl = linkMatch[1];
        console.log(`📎 Found linkpost, original URL: ${originalUrl}`);

        // If the URL is a forum-bots redirect URL, extract the actual URL from the query parameter
        if (originalUrl.includes("forum-bots.effectivealtruism.org/out")) {
          const redirectUrl = new URL(originalUrl);
          const actualUrl = decodeURIComponent(
            redirectUrl.searchParams.get("url") || ""
          );
          if (actualUrl) {
            console.log(`🔄 Following redirect to: ${actualUrl}`);
            const originalResponse = await axios.get(actualUrl);
            return originalResponse.data;
          }
        }

        // If not a redirect URL, fetch directly
        console.log(`📥 Fetching from original URL...`);
        const originalResponse = await axios.get(originalUrl);
        return originalResponse.data;
      }
    }

    return html;
  } catch (error) {
    console.error("Error fetching article:", error);
    process.exit(1);
  }
}

async function extractMetadataWithLLM(
  html: string
): Promise<{ title: string; author: string; date: string }> {
  try {
    console.log("🤖 Calling LLM to extract metadata...");

    // Create a DOM parser to extract relevant sections
    const dom = new JSDOM(html, {
      virtualConsole: new (require("jsdom").VirtualConsole)().sendTo(console, {
        omitJSDOMErrors: true,
      }),
    });
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

    const prompt = `Extract the title, author name, and publication date from these text sections. 
Pay special attention to finding the actual author - look for patterns like "[Name]'s Post" or a name followed by a colon in comments.
Return ONLY a JSON object with these three fields, nothing else. 
If any field cannot be found, use "Unknown" for author, "Untitled Article" for title, or today's date for date.

The date should be in YYYY-MM-DD format.

Text sections:
${metaSections.join("\n")}

Example response format:
{
  "title": "Example Title",
  "author": "John Doe",
  "date": "2024-03-20"
}`;

    const response = await openai.chat.completions.create({
      model: SEARCH_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    console.log("🤖 LLM Response:", JSON.stringify(response, null, 2));

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty LLM response");
    }

    // Clean the content by removing markdown code block syntax and any extra whitespace
    const cleanedContent = content
      .replace(/^```(?:json)?\s*/, "") // Remove opening ```json with optional whitespace
      .replace(/\s*```\s*$/, "") // Remove closing ``` with optional whitespace
      .trim();

    try {
      const metadata = JSON.parse(cleanedContent);
      return {
        title: metadata.title || "Untitled Article",
        author: metadata.author || "Unknown Author",
        date: metadata.date || new Date().toISOString().split("T")[0],
      };
    } catch (jsonError) {
      console.error("❌ Failed to parse LLM response as JSON:", cleanedContent);
      throw jsonError;
    }
  } catch (error: any) {
    console.error("❌ Error in extractMetadataWithLLM:", error);
    if ("response" in error) {
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
    }
    return {
      title: "Untitled Article",
      author: "Unknown Author",
      date: new Date().toISOString().split("T")[0],
    };
  }
}

async function extractMetadata(dom: JSDOM) {
  const doc = dom.window.document;
  const url = program.args[0];

  // Initialize metascraper with all the rules we want to use
  const scraper = metascraper([
    metascraperAuthor(),
    metascraperDate(),
    metascraperDescription(),
    metascraperImage(),
    metascraperLogo(),
    metascraperPublisher(),
    metascraperTitle(),
    metascraperUrl(),
  ]);

  try {
    // Get the HTML content
    const html = doc.documentElement.outerHTML;

    // Use metascraper to extract metadata
    const metadata = await scraper({ html, url });

    // Detect platform from URL
    const platforms: string[] = [];
    if (url.includes("facebook.com")) {
      platforms.push("Facebook");
    }
    if (url.includes("twitter.com") || url.includes("x.com")) {
      platforms.push("Twitter");
    }
    if (url.includes("linkedin.com")) {
      platforms.push("LinkedIn");
    }
    if (url.includes("medium.com")) {
      platforms.push("Medium");
    }
    if (url.includes("substack.com")) {
      platforms.push("Substack");
    }
    if (url.includes("forum.effectivealtruism.org")) {
      platforms.push("EA Forum");
    }
    if (url.includes("lesswrong.com")) {
      platforms.push("LessWrong");
    }

    // Return the extracted metadata, falling back to options if available
    return {
      title: options.title || metadata.title || "Untitled Article",
      author: options.author || metadata.author || "Unknown Author",
      date:
        options.date || metadata.date || new Date().toISOString().split("T")[0],
      publisher: metadata.publisher,
      description: metadata.description,
      image: metadata.image,
      logo: metadata.logo,
      platforms,
    };
  } catch (error) {
    console.error("Error extracting metadata with metascraper:", error);

    // Fallback to basic metadata extraction if metascraper fails
    const metaTitle = options.title || doc.querySelector("title")?.textContent;
    const metaAuthor =
      options.author ||
      doc.querySelector('meta[name="author"]')?.getAttribute("content");
    const metaDate = options.date || new Date().toISOString().split("T")[0];

    // Detect platform from URL for fallback case
    const platforms: string[] = [];
    if (url.includes("facebook.com")) {
      platforms.push("Facebook");
    }
    if (url.includes("twitter.com") || url.includes("x.com")) {
      platforms.push("Twitter");
    }
    if (url.includes("linkedin.com")) {
      platforms.push("LinkedIn");
    }
    if (url.includes("medium.com")) {
      platforms.push("Medium");
    }
    if (url.includes("substack.com")) {
      platforms.push("Substack");
    }
    if (url.includes("forum.effectivealtruism.org")) {
      platforms.push("EA Forum");
    }
    if (url.includes("lesswrong.com")) {
      platforms.push("LessWrong");
    }

    return {
      title: metaTitle || "Untitled Article",
      author: metaAuthor || "Unknown Author",
      date: metaDate,
      publisher: undefined,
      description: undefined,
      image: undefined,
      logo: undefined,
      platforms,
    };
  }
}

function extractContent(dom: JSDOM) {
  const doc = dom.window.document;

  // Try to find the main article content
  // This is a heuristic approach - you may need to adjust selectors based on the site
  const contentSelectors = [
    "article",
    ".article-content",
    ".post-content",
    ".entry-content",
    "main",
    "#content",
    ".content",
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
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = contentElement.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  return contentElement.innerHTML;
}

function convertToMarkdown(html: string) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
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

  // Add rule to clean up images
  turndownService.addRule("cleanImages", {
    filter: "img",
    replacement: (content, node) => {
      const alt = (node as Element).getAttribute("alt") || "";
      return alt ? `\n\n![${alt}]` : "";
    },
  });

  return turndownService.turndown(html);
}

async function cleanContentWithLLM(
  markdownContent: string,
  title: string
): Promise<string> {
  try {
    console.log("🤖 Cleaning content with LLM...");

    const prompt = `Clean up and format this content to be more readable and remove any platform-specific formatting. 
Keep the core message intact but remove any UI elements, comments, reactions, or other platform-specific content.
The content is from a post titled "${title}".

Content to clean:
${markdownContent}

Return ONLY the cleaned content, nothing else.`;

    const response = await openai.chat.completions.create({
      model: SEARCH_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const cleanedContent = response.choices[0]?.message?.content?.trim();
    if (!cleanedContent) {
      throw new Error("Empty LLM response");
    }

    return cleanedContent;
  } catch (error) {
    console.error("❌ Error cleaning content with LLM:", error);
    return markdownContent; // Fallback to original content
  }
}

async function saveArticle(data: any) {
  const docsDir = path.join(process.cwd(), "src", "data", "docs");
  const filename = `${data.id}.json`;
  const filepath = path.join(docsDir, filename);

  await writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Article saved to ${filepath}`);
}

async function main() {
  try {
    console.log(`📥 Fetching article from ${url}...`);
    const html = await fetchArticle(url);

    console.log("🔍 Parsing HTML...");
    const dom = new JSDOM(html, {
      virtualConsole: new (require("jsdom").VirtualConsole)().sendTo(console, {
        omitJSDOMErrors: true,
      }),
    });

    console.log("📝 Extracting metadata...");
    const { title, author, date, platforms } = await extractMetadata(dom);

    console.log("📄 Extracting content...");
    const contentHtml = extractContent(dom);

    console.log("🔄 Converting to Markdown...");
    const markdownContent = convertToMarkdown(contentHtml);

    console.log("🧹 Cleaning content with LLM...");
    const cleanedContent = await cleanContentWithLLM(markdownContent, title);

    // Extract a better title from the content if needed
    let finalTitle = title;
    const contentLines = cleanedContent
      .split("\n")
      .filter((line) => line.trim());

    // Skip any lines that look like generic titles (e.g., "Name's Post", dates, etc.)
    let startIndex = 0;
    while (
      startIndex < contentLines.length &&
      (contentLines[startIndex].match(/^[A-Z][a-z]+(?: [A-Z][a-z]+)*'s Post/) ||
        contentLines[startIndex].match(/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/) ||
        contentLines[startIndex].match(
          /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?$/
        ) ||
        contentLines[startIndex].trim().length < 10)
    ) {
      startIndex++;
    }

    // Get the first real content line
    if (startIndex < contentLines.length) {
      finalTitle = contentLines[startIndex]
        .split(/[.!?]/) // Split on sentence endings
        .filter((s) => s.trim().length > 0)[0] // Take first non-empty sentence
        .trim();

      // If title is too long, truncate it
      if (finalTitle.length > 100) {
        finalTitle = finalTitle.substring(0, 97) + "...";
      }
    }

    // Generate a unique ID based on the title
    let id = finalTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Ensure ID doesn't start with a number
    if (/^[0-9]/.test(id)) {
      id = `article-${id}`;
    }

    // Extract author from Facebook URL if it's a Facebook post
    let finalAuthor = options.author || author;
    if (url.includes("facebook.com") && url.includes("/posts/")) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const fbUsername = pathParts[1]; // The username is the first part after the domain
        if (fbUsername) {
          // Convert username to proper name format (e.g., "ozzie.gooen" -> "Ozzie Gooen")
          finalAuthor = fbUsername
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
        }
      } catch (e) {
        console.warn("Failed to extract author from Facebook URL:", e);
      }
    }

    const articleData = {
      id,
      slug: id,
      title: finalTitle,
      author: finalAuthor,
      publishedDate: date,
      url,
      platforms,
      intendedAgents: options.intendedAgents || [
        "clarity-coach",
        "research-scholar",
        "quantitative-forecaster",
        "ea-impact-evaluator",
        "bias-detector",
      ],
      content: cleanedContent,
      reviews: [],
    };

    console.log("💾 Saving article...");
    await saveArticle(articleData);

    console.log("✨ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
