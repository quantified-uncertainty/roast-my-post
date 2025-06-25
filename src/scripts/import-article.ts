#!/usr/bin/env tsx

import "dotenv/config";

import { Command } from "commander";
import { logger } from "@/lib/logger";
import { writeFile } from "fs/promises";
import path from "path";

import { processArticle } from "../lib/articleImport";

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

async function saveArticle(data: any) {
  const docsDir = path.join(process.cwd(), "src", "data", "docs");
  const filename = `${data.id}.json`;
  const filepath = path.join(docsDir, filename);

  await writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Article saved to ${filepath}`);
}

async function main() {
  try {
    // Use the shared article processing library
    const processedArticle = await processArticle(url);

    // Apply any command-line overrides
    const finalTitle = options.title || processedArticle.title;
    const finalAuthor = options.author || processedArticle.author;
    const finalDate = options.date || processedArticle.date;

    // Generate a unique ID based on the title
    let id = finalTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Ensure ID doesn't start with a number
    if (/^[0-9]/.test(id)) {
      id = `article-${id}`;
    }

    const articleData = {
      id,
      slug: id,
      title: finalTitle,
      author: finalAuthor,
      publishedDate: finalDate,
      url: processedArticle.url,
      platforms: processedArticle.platforms,
      intendedAgents: options.intendedAgents || [
        "clarity-coach",
        "research-scholar",
        "quantitative-forecaster",
        "ea-impact-evaluator",
        "bias-detector",
      ],
      content: processedArticle.content,
      reviews: [],
    };

    logger.info('💾 Saving article...');
    await saveArticle(articleData);

    logger.info('✨ Done!');
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

main();