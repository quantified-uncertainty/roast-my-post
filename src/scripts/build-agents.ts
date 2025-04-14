import {
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'fs/promises';
import path from 'path';

import TOML from '@iarna/toml';

const srcDir = path.join(process.cwd(), "src", "data", "agents", "src");
const distDir = path.join(process.cwd(), "src", "data", "agents", "dist");

async function buildAgents() {
  try {
    // Ensure the output distribution directory exists
    await mkdir(distDir, { recursive: true });

    const files = await readdir(srcDir);
    const tomlFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".toml"
    );

    if (tomlFiles.length === 0) {
      console.log("No TOML agent files found in", srcDir);
      return;
    }

    console.log(`Found ${tomlFiles.length} TOML agent file(s) to process...`);

    for (const tomlFile of tomlFiles) {
      const tomlPath = path.join(srcDir, tomlFile);
      const jsonFileName = path.basename(tomlFile, ".toml") + ".json";
      const jsonPath = path.join(distDir, jsonFileName);

      try {
        console.log(`Processing ${tomlFile}...`);
        const tomlContent = await readFile(tomlPath, "utf-8");
        const jsonData = TOML.parse(tomlContent);

        // Ensure multiline strings from TOML retain newlines for JSON
        // (TOML parser might handle this, but explicit check/fix if needed)
        // Example: jsonData.someField = jsonData.someField.replace(/\r\n/g, '\n');

        await writeFile(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
        console.log(
          ` -> Successfully converted to ${jsonFileName} in ${path.relative(
            process.cwd(),
            distDir
          )}`
        );
      } catch (error) {
        console.error(`❌ Error processing ${tomlFile}:`, error);
      }
    }

    console.log("✅ Agent build process completed.");
  } catch (error) {
    console.error("❌ Fatal error during agent build process:", error);
    process.exit(1);
  }
}

buildAgents();
