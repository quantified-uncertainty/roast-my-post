import { Command } from "commander";
import fs from "fs";
import path from "path";

const program = new Command();

program
  .requiredOption(
    "-f, --file <file>",
    "Path to the document file (e.g., ./src/data/docs/three-observations.json)"
  )
  .option(
    "-a, --agent <agent>",
    "Delete reviews from a specific agent (optional)"
  )
  .parse(process.argv);

const options = program.opts();

async function deleteReviews() {
  try {
    const filePath = path.resolve(process.cwd(), options.file);

    // Read the file
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    const document = JSON.parse(fileContent);

    // Store original reviews count for logging
    const originalReviewCount = document.reviews?.length || 0;

    // Filter reviews
    if (options.agent) {
      // Delete reviews from specific agent
      document.reviews =
        document.reviews?.filter(
          (review: any) => review.agentId !== options.agent
        ) || [];
      console.log(
        `Deleted reviews from agent "${options.agent}" in ${options.file}`
      );
    } else {
      // Delete all reviews
      document.reviews = [];
      console.log(`Deleted all reviews from ${options.file}`);
    }

    // Write back to file
    await fs.promises.writeFile(filePath, JSON.stringify(document, null, 2));

    // Log results
    const newReviewCount = document.reviews?.length || 0;
    console.log(`Deleted ${originalReviewCount - newReviewCount} reviews`);
    console.log(`Remaining reviews: ${newReviewCount}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

deleteReviews();
