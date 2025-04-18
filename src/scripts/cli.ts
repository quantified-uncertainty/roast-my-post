import { Command } from "commander";
import fs from "fs";
import path from "path";

import { Document, RawDocument, RawDocumentReview } from "../types/documents";
import { analyzeDocument } from "../utils/documentAnalysis/analyzeDocument";
import { loadAgentInfo } from "../utils/documentAnalysis/utils/agentUtils";

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

// Helper function to save document with reviews (typed as RawDocument)
async function saveDocument(filePath: string, document: RawDocument) {
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
      // Parse into RawDocument type
      const rawDocument: RawDocument = JSON.parse(fileContent);

      // Initialize reviews array if it doesn't exist
      if (!rawDocument.reviews) {
        rawDocument.reviews = [];
      }

      if (options.agent) {
        // Single agent review
        const agentInfo = loadAgentInfo(options.agent);
        if (!agentInfo) {
          console.error(`Agent "${options.agent}" not found`);
          process.exit(1);
        }
        // analyzeDocument might need the *transformed* Document type, handle conversion if necessary
        // Or, if analyzeDocument can accept RawDocument, simplify this.
        // For now, assuming analyzeDocument needs Document - this is a potential issue
        const documentForAnalysis: Document = JSON.parse(fileContent); // Re-parse or transform
        const result = await analyzeDocument(
          documentForAnalysis,
          options.agent
        );

        // --- Operate on rawDocument for saving ---
        // Remove any existing review by this agent
        rawDocument.reviews = (rawDocument.reviews || []).filter(
          (review) => review && review.agentId !== options.agent
        );

        // Check if analyzeDocument returned a valid result
        if (result) {
          // Transform DocumentReview (result) to RawDocumentReview (for saving)
          const reviewToSave: RawDocumentReview = {
            agentId: result.agentId,
            createdAt: result.createdAt.toISOString(),
            costInCents: result.costInCents || 0,
            comments: result.comments || [],
            thinking: result.thinking,
            summary: result.summary,
            grade: result.grade,
          };
          rawDocument.reviews.push(reviewToSave);

          // Log the state of reviews just before saving
          console.log(
            `Attempting to save ${rawDocument.reviews.length} reviews for agent ${options.agent}. Last review agentId: ${rawDocument.reviews[rawDocument.reviews.length - 1]?.agentId}`
          );
          // Save the modified RawDocument
          await saveDocument(filePath, rawDocument);
          console.log(`Review completed and saved for agent ${options.agent}`);
        } else {
          // This else might be unnecessary if analyzeDocument throws on error
          console.error(
            `analyzeDocument did not return a valid result for agent ${options.agent}. Skipping save.`
          );
        }
      } else if (options.allAgents) {
        // Review with all intended agents
        const intendedAgentsList = rawDocument.intendedAgents || [];
        const documentForAnalysis: Document = JSON.parse(fileContent); // Re-parse or transform

        const agents = options.onlyMissing
          ? intendedAgentsList.filter(
              (agentId: string) =>
                !(rawDocument.reviews || []).some(
                  (r) => r && r.agentId === agentId
                )
            )
          : intendedAgentsList;

        for (const agentId of agents) {
          console.log(`Reviewing with agent ${agentId}...`);
          const result = await analyzeDocument(documentForAnalysis, agentId);

          // --- Operate on rawDocument for saving ---
          rawDocument.reviews = (rawDocument.reviews || []).filter(
            (review) => review && review.agentId !== agentId
          );

          // Check if analyzeDocument returned a valid result
          if (result) {
            // Transform DocumentReview (result) to RawDocumentReview (for saving)
            const reviewToSaveInLoop: RawDocumentReview = {
              agentId: result.agentId,
              createdAt: result.createdAt.toISOString(),
              costInCents: result.costInCents || 0,
              comments: result.comments || [],
              thinking: result.thinking,
              summary: result.summary,
              grade: result.grade,
            };
            rawDocument.reviews.push(reviewToSaveInLoop);

            // Log the state of reviews just before saving
            console.log(
              `Attempting to save ${rawDocument.reviews.length} reviews in loop for agent ${agentId}. Last review agentId: ${rawDocument.reviews[rawDocument.reviews.length - 1]?.agentId}`
            );
            // Save the modified RawDocument
            await saveDocument(filePath, rawDocument);
            console.log(`Review completed and saved for agent ${agentId}`);
          } else {
            // This else might be unnecessary if analyzeDocument throws on error
            console.error(
              `analyzeDocument did not return a valid result for agent ${agentId} in loop. Skipping save.`
            );
          }
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
    // Note: This action doesn't directly call an imported 'importArticle' function.
    // It seems the intention might have been different, or this part needs rework
    // if it was supposed to call a shared function.
    // For now, the command structure is defined, but the action logic
    // needs review if it was meant to call a shared import function.
    try {
      if (
        options.input.startsWith("http://") ||
        options.input.startsWith("https://")
      ) {
        // Import from URL - Logic likely needs adjustment
        // Assuming the standalone script `import-article.ts` handles the actual import
        // The CLI command here might just be a placeholder or needs different logic
        console.log(
          `Run 'npx tsx src/scripts/import-article.ts ${options.input}' to import from URL.`
        );
        // Original code attempting to call non-existent import:
        // const result = await importArticle(options.input);
        // console.log(`Imported article from ${options.input}`);
        // console.log(`Saved to: ${result.filePath}`);
      } else {
        // Import from local file - Logic likely needs adjustment
        console.log(
          `Run 'npx tsx src/scripts/import-article.ts ${options.input}' to import from file.`
        );
        // Original code attempting to call non-existent import:
        // const filePath = path.resolve(process.cwd(), options.input);
        // const content = await fs.promises.readFile(filePath, "utf-8");
        // const result = await importArticle(filePath, content);
        // console.log(`Imported article from local file: ${options.input}`);
        // console.log(`Saved to: ${result.filePath}`);
      }
    } catch (error) {
      console.error("Error in import command setup:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
