import {
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "fs/promises";
import path from "path";
// import TOML from "@iarna/toml";
import TOML from "toml"; // Use the 'toml' library instead

const srcDir = path.join(process.cwd(), "src", "data", "docs", "src");
const distDir = path.join(process.cwd(), "src", "data", "docs");

async function buildDocs() {
  try {
    // Ensure the output distribution directory exists
    // Not strictly necessary if files exist, but good practice
    await mkdir(distDir, { recursive: true });

    const files = await readdir(srcDir);
    const tomlFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".toml"
    );

    if (tomlFiles.length === 0) {
      console.log("No TOML document files found in", srcDir);
      return;
    }

    console.log(
      `Found ${tomlFiles.length} TOML document file(s) to process...`
    );

    for (const tomlFile of tomlFiles) {
      const tomlPath = path.join(srcDir, tomlFile);
      // Ensure output file is directly in distDir, not a subdirectory
      const jsonFileName = path.basename(tomlFile, ".toml") + ".json";
      const jsonPath = path.join(distDir, jsonFileName);

      try {
        console.log(`Processing ${tomlFile}...`);
        const tomlContent = await readFile(tomlPath, "utf-8");
        // Parse TOML content using the 'toml' library
        const jsonData = TOML.parse(tomlContent);

        // Ensure multiline strings like 'content' are correctly handled by the parser
        // TOML parser should handle multiline strings natively.

        // Write JSON data to the destination file
        await writeFile(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
        console.log(
          ` -> Successfully converted to ${jsonFileName} in ${path.relative(
            process.cwd(),
            distDir
          )}`
        );
      } catch (error) {
        console.error(`❌ Error processing ${tomlFile}:`, error);
        // Optionally, decide if one error should stop the whole process
        // For now, log error and continue with next file
      }
    }

    console.log("✅ Document build process completed.");
  } catch (error) {
    console.error("❌ Fatal error during document build process:", error);
    process.exit(1); // Exit if there's a fatal error like reading srcDir
  }
}

buildDocs();

// Ensure the script is executable or called via tsx/ts-node
