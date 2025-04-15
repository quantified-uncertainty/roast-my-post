#!/usr/bin/env tsx

import axios from "axios";
import { Command } from "commander";
import { writeFile } from "fs/promises";
import { JSDOM } from "jsdom";
import path from "path";
import TurndownService from "turndown";

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

async function fetchArticle(url: string) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching article:", error);
    process.exit(1);
  }
}

function extractMetadata(dom: JSDOM) {
  const doc = dom.window.document;

  // Try to get title from various meta tags
  const title =
    options.title ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="title"]')?.getAttribute("content") ||
    doc.querySelector("title")?.textContent ||
    "Untitled Article";

  // Try to get author from various meta tags
  const author =
    options.author ||
    doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
    doc
      .querySelector('meta[property="article:author"]')
      ?.getAttribute("content") ||
    "Unknown Author";

  // Try to get publication date from various meta tags
  const date =
    options.date ||
    doc
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content")
      ?.split("T")[0] ||
    doc
      .querySelector('meta[name="date"]')
      ?.getAttribute("content")
      ?.split("T")[0] ||
    new Date().toISOString().split("T")[0];

  return { title, author, date };
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

  return turndownService.turndown(html);
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
    const dom = new JSDOM(html);

    console.log("📝 Extracting metadata...");
    const { title, author, date } = extractMetadata(dom);

    console.log("📄 Extracting content...");
    const contentHtml = extractContent(dom);

    console.log("🔄 Converting to Markdown...");
    const markdownContent = convertToMarkdown(contentHtml);

    // Generate a unique ID based on the title
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const articleData = {
      id,
      slug: id,
      title,
      author,
      publishedDate: date,
      intendedAgents: options.intendedAgents || [
        "bias-detector",
        "clarity-coach",
        "research-scholar",
      ],
      content: markdownContent,
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
