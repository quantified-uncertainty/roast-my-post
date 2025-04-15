#!/usr/bin/env tsx

import { readdir, writeFile } from "fs/promises";
import path from "path";

function toValidIdentifier(filename: string): string {
  // Remove .json extension and convert to camelCase
  return filename
    .replace(".json", "")
    .split("-")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

async function generateDocsIndex() {
  const docsDir = path.join(process.cwd(), "src", "data", "docs");
  const files = await readdir(docsDir);

  const jsonFiles = files.filter(
    (file) => file.endsWith(".json") && file !== "index.json"
  );

  const imports = jsonFiles
    .map((file) => {
      const identifier = toValidIdentifier(file);
      return `import ${identifier} from './${file}';`;
    })
    .join("\n");

  const documents = jsonFiles
    .map((file) => toValidIdentifier(file))
    .join(",\n    ");

  const content = `import type { RawDocumentsCollection } from '@/types/documents';
import { transformDocumentsCollection } from '@/types/documents';

// Import individual documents
${imports}

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    ${documents}
  ],
} as RawDocumentsCollection);
`;

  await writeFile(path.join(docsDir, "index.ts"), content, "utf-8");

  console.log("✅ Generated docs index file");
}

generateDocsIndex().catch(console.error);
