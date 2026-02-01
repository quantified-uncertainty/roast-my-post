#!/usr/bin/env node
/**
 * CLI entry point for the research agent
 *
 * Usage:
 *   # Single-shot analysis
 *   pnpm --filter @roast/agent run start -f document.md
 *
 *   # With specific task
 *   pnpm --filter @roast/agent run start -f document.md -t "Check all factual claims"
 *
 *   # Quick check (single plugin)
 *   pnpm --filter @roast/agent run start -f document.md --quick fact
 *
 *   # Interactive mode
 *   pnpm --filter @roast/agent run start -f document.md -i
 *
 *   # Resume previous session
 *   pnpm --filter @roast/agent run start -f document.md -r session_abc123
 *
 *   # Use specific model
 *   pnpm --filter @roast/agent run start -f document.md -m opus
 */

import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { runResearchAgent, runQuickCheck } from '../agent/index.js';
import type { ResearchAgentConfig } from '../types/index.js';

interface CLIOptions {
  file?: string;
  task?: string;
  interactive?: boolean;
  resume?: string;
  model?: 'sonnet' | 'opus' | 'haiku';
  quick?: 'fact' | 'fallacy' | 'spell' | 'math' | 'forecast';
  maxBudget?: number;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--task':
      case '-t':
        options.task = args[++i];
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--resume':
      case '-r':
        options.resume = args[++i];
        break;
      case '--model':
      case '-m':
        options.model = args[++i] as CLIOptions['model'];
        break;
      case '--quick':
      case '-q':
        options.quick = args[++i] as CLIOptions['quick'];
        break;
      case '--budget':
      case '-b':
        options.maxBudget = parseFloat(args[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Research Agent - Document Analysis with Claude Agent SDK

Usage:
  node --import tsx/esm src/cli/run-agent.ts [options]

Options:
  -f, --file <path>       Path to document file to analyze
  -t, --task <task>       Analysis task (default: comprehensive evaluation)
  -i, --interactive       Run in interactive mode
  -r, --resume <id>       Resume a previous session by ID
  -m, --model <model>     Model to use: sonnet, opus, haiku (default: opus)
  -q, --quick <type>      Quick check: fact, fallacy, spell, math, forecast
  -b, --budget <usd>      Maximum budget in USD
  -h, --help              Show this help message

Examples:
  # Full analysis
  pnpm --filter @roast/agent run start -f article.md

  # Quick fact check
  pnpm --filter @roast/agent run start -f article.md --quick fact

  # Interactive mode
  pnpm --filter @roast/agent run start -f article.md -i

  # With budget limit
  pnpm --filter @roast/agent run start -f article.md --budget 1.00
`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function runInteractiveSession(
  documentText: string,
  options: CLIOptions
): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let sessionId = options.resume;

  console.log('Interactive Research Agent');
  console.log('Commands: /quit, /reset, /info');
  console.log('---');

  const askQuestion = (): void => {
    rl.question('\nYou: ', async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/quit') {
        console.log(`\nSession saved: ${sessionId || '(none)'}`);
        rl.close();
        return;
      }

      if (trimmed === '/reset') {
        sessionId = undefined;
        console.log('Session reset.');
        askQuestion();
        return;
      }

      if (trimmed === '/info') {
        console.log(`Current session: ${sessionId || '(new)'}`);
        askQuestion();
        return;
      }

      console.log('\nAgent:');
      const result = await runResearchAgent(trimmed, documentText, {
        model: options.model,
        sessionId,
        maxBudgetUsd: options.maxBudget,
      });

      console.log(result.synthesis);
      console.log(`\n[Cost: $${result.metadata.costUSD.toFixed(4)}]`);

      sessionId = result.sessionId;
      askQuestion();
    });
  };

  // Initial analysis if no resume
  if (!sessionId) {
    console.log('\nAgent: Starting initial analysis...\n');
    const result = await runResearchAgent(
      'Provide an initial assessment of this document. What are the main claims and potential issues?',
      documentText,
      { model: options.model, maxBudgetUsd: options.maxBudget }
    );
    console.log(result.synthesis);
    console.log(`\n[Cost: $${result.metadata.costUSD.toFixed(4)}]`);
    sessionId = result.sessionId;
  }

  askQuestion();
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Load document
  let documentText: string;
  if (options.file) {
    try {
      documentText = readFileSync(options.file, 'utf-8');
    } catch (err) {
      console.error(`Error reading file: ${options.file}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    documentText = await readStdin();
  } else {
    console.error('No document provided. Use --file or pipe to stdin.');
    printHelp();
    process.exit(1);
  }

  if (!documentText.trim()) {
    console.error('Document is empty.');
    process.exit(1);
  }

  console.log(`Document loaded: ${documentText.length} characters`);

  // Quick check mode
  if (options.quick) {
    console.log(`Running quick ${options.quick} check...`);
    const result = await runQuickCheck(documentText, options.quick, {
      model: options.model,
    });

    console.log('\n--- Results ---\n');
    console.log(result.synthesis);
    console.log('\n--- Session Info ---');
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Tool calls: ${result.metadata.toolCalls}`);
    console.log(`Duration: ${(result.metadata.durationMs / 1000).toFixed(1)}s`);
    console.log(`Cost: $${result.metadata.costUSD.toFixed(4)}`);
    return;
  }

  // Interactive mode
  if (options.interactive) {
    await runInteractiveSession(documentText, options);
    return;
  }

  // Single-shot mode
  const task = options.task || 'Comprehensively evaluate this document for accuracy, logic, and quality.';

  console.log(`Running analysis: "${task.slice(0, 50)}${task.length > 50 ? '...' : ''}"`);
  console.log('This may take a few minutes...\n');

  const config: ResearchAgentConfig = {
    model: options.model,
    sessionId: options.resume,
    maxBudgetUsd: options.maxBudget,
  };

  const result = await runResearchAgent(task, documentText, config);

  console.log('\n--- Analysis Results ---\n');
  console.log(result.synthesis);

  console.log('\n--- Session Info ---');
  console.log(`Session ID: ${result.sessionId}`);
  console.log(`Tool calls: ${result.metadata.toolCalls}`);
  console.log(`Subagent calls: ${result.metadata.subagentCalls}`);
  console.log(`Duration: ${(result.metadata.durationMs / 1000).toFixed(1)}s`);
  console.log(`Cost: $${result.metadata.costUSD.toFixed(4)}`);

  if (result.findings.length > 0) {
    console.log(`\n--- Extracted Findings (${result.findings.length}) ---`);
    for (const finding of result.findings) {
      console.log(`  [${finding.severity}] ${finding.message}`);
    }
  }

  console.log(`\nTo continue this session: --resume ${result.sessionId}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
