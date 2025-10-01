#!/usr/bin/env tsx

/**
 * Unified README generation script
 * Generates both markdown files and TypeScript modules from readme generators
 *
 * Usage:
 *   tsx scripts/generate-readmes.ts --mode plugins
 *   tsx scripts/generate-readmes.ts --mode tools
 */

import fs from 'fs';
import path from 'path';
import { generateTypeScriptModule, reportFailuresAndExit } from './lib/readme-generator-utils';

interface GeneratorConfig {
  mode: 'plugins' | 'tools';
  sourceDir: string;
  outputDir: string;
  tsModulePath: string;
  tsModuleConfig: {
    scriptName: string;
    exportName: string;
    typeName: string;
    getterName: string;
  };
  idMapper?: (id: string) => string;
  getGeneratorPath: (id: string) => string;
  getMarkdownPath: (id: string) => string;
}

/**
 * Auto-discover and load readme generators
 */
async function loadGenerators(
  ids: string[],
  getGeneratorPath: (id: string) => string
): Promise<{
  generators: Record<string, () => string>;
  failures: string[];
}> {
  const generators: Record<string, () => string> = {};
  const failures: string[] = [];

  for (const id of ids) {
    const generatorPath = getGeneratorPath(id);

    if (fs.existsSync(generatorPath)) {
      try {
        const module = await import(generatorPath);
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

/**
 * Generate README files from generators
 */
function generateReadmeFiles(
  generators: Record<string, () => string>,
  getMarkdownPath: (id: string) => string,
  outputDir: string
): { content: Record<string, string>; failures: string[] } {
  const content: Record<string, string> = {};
  const failures: string[] = [];

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const [id, generator] of Object.entries(generators)) {
    try {
      const readmeContent = generator();
      content[id] = readmeContent;

      // Write markdown file
      const markdownPath = getMarkdownPath(id);
      const dir = path.dirname(markdownPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(markdownPath, readmeContent, 'utf-8');
      console.log(`✅ Generated markdown README for ${id} at ${markdownPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to generate README for ${id}:`, error);
      failures.push(`${id}: ${errorMsg}`);
    }
  }

  return { content, failures };
}

/**
 * Load static README files (for tools without generators)
 */
function loadStaticReadmes(
  ids: string[],
  generators: Record<string, () => string>,
  getMarkdownPath: (id: string) => string,
  fallbackName: (id: string) => string
): Record<string, string> {
  const readmes: Record<string, string> = {};

  for (const id of ids) {
    if (id in generators) {
      // Already handled by generator
      continue;
    }

    const markdownPath = getMarkdownPath(id);
    if (fs.existsSync(markdownPath)) {
      try {
        readmes[id] = fs.readFileSync(markdownPath, 'utf-8');
        console.log(`✅ Loaded README for ${id} (static)`);
      } catch (error) {
        console.warn(`⚠️  Failed to read README for ${id}:`, error);
        readmes[id] = `# ${fallbackName(id)}\n\n*README content not available*`;
      }
    } else {
      console.warn(`⚠️  No README found for ${id}`);
      readmes[id] = `# ${fallbackName(id)}\n\n*README content not available*`;
    }
  }

  return readmes;
}

/**
 * Plugin-specific configuration
 */
function getPluginConfig(scriptDir: string): GeneratorConfig {
  const PLUGIN_TO_AGENT_MAP: Record<string, string> = {
    'fact-check': 'fact-checker',
    'math': 'math-checker',
    'spelling': 'spelling-grammar',
    'forecast': 'forecast-checker',
    'link-analysis': 'link-checker',
  };

  const ADDITIONAL_AGENTS = ['comprehensive-checker'];
  const dbDir = path.join(scriptDir, '..', '..', 'db');
  const readmesDir = path.join(dbDir, 'system-agents', 'agents', 'readmes');

  return {
    mode: 'plugins',
    sourceDir: path.join(scriptDir, '..', 'src', 'analysis-plugins', 'plugins'),
    outputDir: readmesDir,
    tsModulePath: path.join(dbDir, 'system-agents', 'generated-plugin-readmes.ts'),
    tsModuleConfig: {
      scriptName: 'scripts/generate-readmes.ts',
      exportName: 'pluginReadmes',
      typeName: 'PluginId',
      getterName: 'getPluginReadme',
    },
    getGeneratorPath: (id: string) => {
      // Check if this is a plugin-based agent
      const pluginDir = Object.entries(PLUGIN_TO_AGENT_MAP).find(([_, agentId]) => agentId === id)?.[0];
      if (pluginDir) {
        return path.join(scriptDir, '..', 'src', 'analysis-plugins', 'plugins', pluginDir, 'readme-generator.ts');
      }
      // Check if this is an additional agent
      if (ADDITIONAL_AGENTS.includes(id)) {
        return path.join(readmesDir, `${id}-generator.ts`);
      }
      return '';
    },
    getMarkdownPath: (id: string) => path.join(readmesDir, `${id}.md`),
  };
}

/**
 * Tool-specific configuration
 */
function getToolConfig(scriptDir: string): GeneratorConfig {
  return {
    mode: 'tools',
    sourceDir: path.join(scriptDir, '..', 'src', 'tools'),
    outputDir: path.join(scriptDir, '..', 'src', 'tools'),
    tsModulePath: path.join(scriptDir, '..', 'src', 'tools', 'generated-readmes.ts'),
    tsModuleConfig: {
      scriptName: 'scripts/generate-readmes.ts',
      exportName: 'toolReadmes',
      typeName: 'ToolId',
      getterName: 'getToolReadme',
    },
    getGeneratorPath: (id: string) => path.join(scriptDir, '..', 'src', 'tools', id, 'readme-generator.ts'),
    getMarkdownPath: (id: string) => path.join(scriptDir, '..', 'src', 'tools', id, 'README.md'),
  };
}

async function main() {
  const scriptDir = __dirname;
  const mode = process.argv[2] === '--mode' ? process.argv[3] : null;

  if (!mode || (mode !== 'plugins' && mode !== 'tools')) {
    console.error('Usage: tsx scripts/generate-readmes.ts --mode <plugins|tools>');
    process.exit(1);
  }

  const config = mode === 'plugins' ? getPluginConfig(scriptDir) : getToolConfig(scriptDir);

  // Get list of IDs to process
  let ids: string[];
  if (mode === 'plugins') {
    // For plugins, manually specify the IDs
    const PLUGIN_TO_AGENT_MAP: Record<string, string> = {
      'fact-check': 'fact-checker',
      'math': 'math-checker',
      'spelling': 'spelling-grammar',
      'forecast': 'forecast-checker',
      'link-analysis': 'link-checker',
    };
    const ADDITIONAL_AGENTS = ['comprehensive-checker'];
    ids = [...Object.values(PLUGIN_TO_AGENT_MAP), ...ADDITIONAL_AGENTS];
  } else {
    // For tools, import allTools
    const { allTools } = await import('../src/tools/all-tools');
    ids = Object.keys(allTools);
  }

  // Load generators
  const { generators, failures: loadFailures } = await loadGenerators(ids, config.getGeneratorPath);

  // Generate README files from generators
  const { content: generatedContent, failures: generationFailures } = generateReadmeFiles(
    generators,
    config.getMarkdownPath,
    config.outputDir
  );

  // For tools, also load static READMEs
  let allContent = generatedContent;
  if (mode === 'tools') {
    const { allTools } = await import('../src/tools/all-tools');
    const staticContent = loadStaticReadmes(
      ids,
      generators,
      config.getMarkdownPath,
      (id) => allTools[id]?.config.name || id
    );
    allContent = { ...generatedContent, ...staticContent };
  }

  // Generate TypeScript module
  generateTypeScriptModule(allContent, {
    ...config.tsModuleConfig,
    outputPath: config.tsModulePath,
  });

  // Report failures
  reportFailuresAndExit([...loadFailures, ...generationFailures]);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
