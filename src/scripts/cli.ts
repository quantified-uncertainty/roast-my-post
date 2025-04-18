import { Command } from "commander";
import fs from "fs";
import path from "path";

import { importArticle } from "../utils/articleImporter";
import { analyzeDocument, loadAgentInfo } from "../utils/documentAnalysis";

const program = new Command();

program
  .name("open-annotate")
  .description("CLI for managing document reviews and analysis")
  .version("0.1.0");

// Helper function to resolve document path
async function resolveDocumentPath(input: string): Promise<string> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    // If it's a URL, find the corresponding file in docs directory
    const docsDir = path.join(process.cwd(), "src", "data", "docs");
    const files = await fs.promises.readdir(docsDir);
    const matchingFile = files.find((file) => {
      const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
      const doc = JSON.parse(content);
      return doc.url === input;
    });
    if (!matchingFile) {
      throw new Error(`No document found for URL: ${input}`);
    }
    return path.join(docsDir, matchingFile);
  }
  // If it's a file path, resolve it relative to cwd
  return path.resolve(process.cwd(), input);
}

// Helper function to save document with reviews
async function saveDocument(filePath: string, document: any) {
  await fs.promises.writeFile(filePath, JSON.stringify(document, null, 2));
}

// Review commands
program
  .command("review")
  .description("Review a document with one or more agents")
  .requiredOption("-i, --input <input>", "URL or path to the document file")
  .option("-a, --agent <agent>", "Review with a specific agent")
  .option("--all-agents", "Review with all intended agents")
  .option("--only-missing", "Only review with agents that haven't reviewed yet")
  .action(async (options) => {
    try {
      const filePath = await resolveDocumentPath(options.input);
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const document = JSON.parse(fileContent);

      // Initialize reviews array if it doesn't exist
      if (!document.reviews) {
        document.reviews = [];
      }

      if (options.agent) {
        // Single agent review
        const agentInfo = await loadAgentInfo(options.agent);
        if (!agentInfo) {
          console.error(`Agent "${options.agent}" not found`);
          process.exit(1);
        }
        const result = await analyzeDocument(document, options.agent);

        // Remove any existing review by this agent
        document.reviews = document.reviews.filter(
          (review: any) => review.agentId !== options.agent
        );

        // Add the new review
        document.reviews.push(result.review);
        await saveDocument(filePath, document);
        console.log(`Review completed and saved for agent ${options.agent}`);
      } else if (options.allAgents) {
        // Review with all intended agents
        const agents = options.onlyMissing
          ? document.intendedAgents.filter(
              (agentId: string) =>
                !document.reviews?.some((r: any) => r.agentId === agentId)
            )
          : document.intendedAgents;

        for (const agentId of agents) {
          console.log(`Reviewing with agent ${agentId}...`);
          const result = await analyzeDocument(document, agentId);

          // Remove any existing review by this agent
          document.reviews = document.reviews.filter(
            (review: any) => review.agentId !== agentId
          );

          // Add the new review
          document.reviews.push(result.review);
          await saveDocument(filePath, document);
          console.log(`Review completed and saved for agent ${agentId}`);
        }
      } else {
        console.error("Please specify either --agent or --all-agents");
        process.exit(1);
      }
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

// Delete reviews command
program
  .command("delete-reviews")
  .description("Delete reviews from a document")
  .requiredOption("-i, --input <input>", "URL or path to the document file")
  .option("-a, --agent <agent>", "Delete reviews from a specific agent")
  .action(async (options) => {
    try {
      const filePath = await resolveDocumentPath(options.input);
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const document = JSON.parse(fileContent);

      const originalReviewCount = document.reviews?.length || 0;

      if (options.agent) {
        document.reviews =
          document.reviews?.filter(
            (review: any) => review.agentId !== options.agent
          ) || [];
        console.log(
          `Deleted reviews from agent "${options.agent}" in ${options.input}`
        );
      } else {
        document.reviews = [];
        console.log(`Deleted all reviews from ${options.input}`);
      }

      await fs.promises.writeFile(filePath, JSON.stringify(document, null, 2));

      const newReviewCount = document.reviews?.length || 0;
      console.log(`Deleted ${originalReviewCount - newReviewCount} reviews`);
      console.log(`Remaining reviews: ${newReviewCount}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

// Import article command
program
  .command("import")
  .description("Import an article from a URL or local file")
  .requiredOption("-i, --input <input>", "URL or path to the article file")
  .action(async (options) => {
    try {
      if (
        options.input.startsWith("http://") ||
        options.input.startsWith("https://")
      ) {
        // Import from URL
        const result = await importArticle(options.input);
        console.log(`Imported article from ${options.input}`);
        console.log(`Saved to: ${result.filePath}`);
      } else {
        // Import from local file
        const filePath = path.resolve(process.cwd(), options.input);
        const content = await fs.promises.readFile(filePath, "utf-8");
        const result = await importArticle(filePath, content);
        console.log(`Imported article from local file: ${options.input}`);
        console.log(`Saved to: ${result.filePath}`);
      }
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

// Verify highlights command
program
  .command("verify")
  .description("Verify highlights in documents")
  .option("-i, --input <input>", "URL or path to the document file")
  .option("-d, --dir <dir>", "Verify all files in a directory")
  .action(async (options) => {
    // TODO: Implement verify functionality
    console.log("Verifying highlights...");
  });

program.parse(process.argv);
