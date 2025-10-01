#!/usr/bin/env tsx

/**
 * Build script to generate tool README files from source code
 *
 * Generates TWO outputs:
 * 1. Markdown files for human reading (in src/tools/TOOL_NAME/README.md)
 * 2. TypeScript module for runtime access (in src/tools/generated-readmes.ts)
 *
 * Approach:
 * - Tools with readme-generator.ts: Import generator, write markdown, include in TypeScript
 * - Tools with static README.md: Read file, include in TypeScript (no generation)
 */

import fs from 'fs';
import path from 'path';
import { allTools } from '../src/tools/all-tools';
import { generateTypeScriptModule, reportFailuresAndExit } from './lib/readme-generator-utils';

/**
 * Auto-discover and load readme generators for tools
 */
async function loadGenerators(): Promise<{
  generators: Record<string, () => string>;
  failures: string[];
}> {
  const generators: Record<string, () => string> = {};
  const failures: string[] = [];

  for (const [id] of Object.entries(allTools)) {
    const generatorPath = path.join(__dirname, '..', 'src', 'tools', id, 'readme-generator.ts');

    if (fs.existsSync(generatorPath)) {
      try {
        const module = await import(`../src/tools/${id}/readme-generator`);
        if (module.generateReadme && typeof module.generateReadme === 'function') {
          generators[id] = module.generateReadme;
        } else {
          const error = 'Generator module does not export generateReadme function';
          console.error(`❌ Failed to load generator for ${id}: ${error}`);
          failures.push(`${id}: ${error}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load generator for ${id}:`, error);
        failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return { generators, failures };
}

async function main() {
  const { generators, failures: loadFailures } = await loadGenerators();
  const generationFailures: string[] = [];
  const readmes: Record<string, string> = {};

  // Generate or read README files
  for (const [id, tool] of Object.entries(allTools)) {
    const staticReadmePath = path.join(__dirname, '..', 'src', 'tools', id, 'README.md');

    if (id in generators) {
      // Programmatic generation
      try {
        const content = generators[id]();
        readmes[id] = content;
        fs.writeFileSync(staticReadmePath, content, 'utf-8');
        console.log(`✅ Generated README for ${id} (programmatic)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to generate README for ${id}:`, error);
        generationFailures.push(`${id}: ${errorMsg}`);
        readmes[id] = `# ${tool.config.name}\n\n*README generation failed*`;
      }
    } else if (fs.existsSync(staticReadmePath)) {
      // Static README
      try {
        readmes[id] = fs.readFileSync(staticReadmePath, 'utf-8');
        console.log(`✅ Loaded README for ${id} (static)`);
      } catch (error) {
        console.warn(`⚠️  Failed to read README for ${id}:`, error);
        readmes[id] = `# ${tool.config.name}\n\n*README content not available*`;
      }
    } else {
      console.warn(`⚠️  No README found for ${id}`);
      readmes[id] = `# ${tool.config.name}\n\n*README content not available*`;
    }
  }

  // Generate TypeScript module
  generateTypeScriptModule(readmes, {
    scriptName: 'scripts/generate-tool-readmes.ts',
    exportName: 'toolReadmes',
    typeName: 'ToolId',
    getterName: 'getToolReadme',
    outputPath: path.join(__dirname, '..', 'src', 'tools', 'generated-readmes.ts'),
  });

  // Report failures
  reportFailuresAndExit([...loadFailures, ...generationFailures]);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});