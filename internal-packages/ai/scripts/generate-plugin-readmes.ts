#!/usr/bin/env tsx

/**
 * Build script to generate plugin README files from source code
 * This ensures documentation stays synchronized with plugin configuration
 *
 * Generates TWO outputs:
 * 1. Markdown files for human reading (in internal-packages/db/system-agents/agents/readmes/)
 * 2. TypeScript module for runtime access (in internal-packages/db/system-agents/generated-plugin-readmes.ts)
 */

import fs from 'fs';
import path from 'path';
import { generateTypeScriptModule, reportFailuresAndExit } from './lib/readme-generator-utils';

/**
 * Plugin to agent ID mapping
 * Maps plugin directory names to agent IDs
 */
const PLUGIN_TO_AGENT_MAP: Record<string, string> = {
  'fact-check': 'fact-checker',
  'math': 'math-checker',
  'spelling': 'spelling-grammar',
  'forecast': 'forecast-checker',
  'link-analysis': 'link-checker',
};

/**
 * Additional agent-level generators (not directly mapped to plugins)
 */
const ADDITIONAL_AGENTS = ['comprehensive-checker'];

/**
 * Auto-discover and load plugin readme generators
 */
async function loadPluginGenerators(): Promise<{
  generators: Record<string, () => string>;
  failures: string[];
}> {
  const generators: Record<string, () => string> = {};
  const failures: string[] = [];
  const pluginsDir = path.join(__dirname, '..', 'src', 'analysis-plugins', 'plugins');

  // Auto-discover plugin generators
  for (const [pluginDir, agentId] of Object.entries(PLUGIN_TO_AGENT_MAP)) {
    const generatorPath = path.join(pluginsDir, pluginDir, 'readme-generator.ts');

    if (fs.existsSync(generatorPath)) {
      try {
        const module = await import(`../src/analysis-plugins/plugins/${pluginDir}/readme-generator`);
        if (module.generateReadme && typeof module.generateReadme === 'function') {
          generators[agentId] = module.generateReadme;
        } else {
          const error = 'Generator module does not export generateReadme function';
          console.error(`❌ Failed to load generator for ${agentId}: ${error}`);
          failures.push(`${agentId}: ${error}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load generator for ${agentId}:`, error);
        failures.push(`${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.warn(`⚠️  No generator found for plugin ${pluginDir} at ${generatorPath}`);
    }
  }

  // Load additional agent generators
  for (const agentId of ADDITIONAL_AGENTS) {
    const generatorPath = path.join(__dirname, '..', '..', 'db', 'system-agents', 'agents', 'readmes', `${agentId}-generator.ts`);

    if (fs.existsSync(generatorPath)) {
      try {
        const module = await import(`../../db/system-agents/agents/readmes/${agentId}-generator`);
        if (module.generateReadme && typeof module.generateReadme === 'function') {
          generators[agentId] = module.generateReadme;
        } else {
          const error = 'Generator module does not export generateReadme function';
          console.error(`❌ Failed to load generator for ${agentId}: ${error}`);
          failures.push(`${agentId}: ${error}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load generator for ${agentId}:`, error);
        failures.push(`${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.warn(`⚠️  No generator found for agent ${agentId} at ${generatorPath}`);
    }
  }

  return { generators, failures };
}

async function main() {
  const { generators, failures: loadFailures } = await loadPluginGenerators();
  const generationFailures: string[] = [];
  const readmeContent: Record<string, string> = {};
  const readmesDir = path.join(__dirname, '..', '..', 'db', 'system-agents', 'agents', 'readmes');

  // Ensure readmes directory exists
  if (!fs.existsSync(readmesDir)) {
    fs.mkdirSync(readmesDir, { recursive: true });
  }

  // Generate README files
  for (const [agentId, generator] of Object.entries(generators)) {
    try {
      const content = generator();
      readmeContent[agentId] = content;

      // Write markdown file
      const markdownPath = path.join(readmesDir, `${agentId}.md`);
      fs.writeFileSync(markdownPath, content, 'utf-8');
      console.log(`✅ Generated markdown README for ${agentId} at ${markdownPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to generate README for ${agentId}:`, error);
      generationFailures.push(`${agentId}: ${errorMsg}`);
    }
  }

  // Generate TypeScript module
  generateTypeScriptModule(readmeContent, {
    scriptName: 'scripts/generate-plugin-readmes.ts',
    exportName: 'pluginReadmes',
    typeName: 'PluginId',
    getterName: 'getPluginReadme',
    outputPath: path.join(__dirname, '..', '..', 'db', 'system-agents', 'generated-plugin-readmes.ts'),
  });

  // Report failures
  reportFailuresAndExit([...loadFailures, ...generationFailures]);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
