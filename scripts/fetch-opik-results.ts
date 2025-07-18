#!/usr/bin/env tsx

/**
 * Script to fetch and analyze Opik evaluation results
 * Usage: npx tsx scripts/fetch-opik-results.ts [options]
 */

import { Opik } from 'opik';

interface OpikResult {
  id: string;
  name: string;
  input: any;
  output: any;
  metadata: any;
  tags: string[];
  createdAt: string;
  feedback?: any;
  scores?: any;
}

interface EvaluationSummary {
  totalTraces: number;
  totalExperiments: number;
  totalProjects: number;
  averageScores: Record<string, number>;
  tagDistribution: Record<string, number>;
  recentActivity: OpikResult[];
}

async function fetchOpikResults(options: {
  limit?: number;
  projectName?: string;
  tags?: string[];
  since?: Date;
} = {}): Promise<EvaluationSummary> {
  const apiKey = process.env.OPIK_API_KEY;
  const workspace = process.env.OPIK_WORKSPACE || 'oagr';

  if (!apiKey) {
    throw new Error('OPIK_API_KEY environment variable not set');
  }

  const opik = new Opik({
    apiKey,
    workspace,
    baseURL: 'https://www.comet.com/opik/api/v1'
  });

  console.log(`🔍 Fetching Opik results from workspace: ${workspace}`);
  
  const summary: EvaluationSummary = {
    totalTraces: 0,
    totalExperiments: 0,
    totalProjects: 0,
    averageScores: {},
    tagDistribution: {},
    recentActivity: []
  };

  try {
    // Fetch projects
    const projects = await (opik as any).projects?.list?.() || [];
    summary.totalProjects = projects.length;
    console.log(`📋 Found ${projects.length} projects`);

    // Fetch experiments
    const experiments = await (opik as any).experiments?.list?.({
      limit: options.limit || 100,
      ...(options.projectName && { project_name: options.projectName })
    }) || [];
    summary.totalExperiments = experiments.length;
    console.log(`🧪 Found ${experiments.length} experiments`);

    // Fetch traces
    const traces = await (opik as any).traces?.list?.({
      limit: options.limit || 100,
      ...(options.tags && { tags: options.tags }),
      ...(options.since && { created_after: options.since.toISOString() })
    }) || [];
    summary.totalTraces = traces.length;
    console.log(`📊 Found ${traces.length} traces`);

    // Analyze traces
    for (const trace of traces) {
      // Count tags
      if (trace.tags) {
        for (const tag of trace.tags) {
          summary.tagDistribution[tag] = (summary.tagDistribution[tag] || 0) + 1;
        }
      }

      // Extract scores from metadata or feedback
      if (trace.metadata) {
        Object.keys(trace.metadata).forEach(key => {
          if (key.toLowerCase().includes('score') || key.toLowerCase().includes('quality')) {
            const value = parseFloat(trace.metadata[key]);
            if (!isNaN(value)) {
              if (!summary.averageScores[key]) {
                summary.averageScores[key] = 0;
              }
              summary.averageScores[key] += value;
            }
          }
        });
      }

      // Add to recent activity
      summary.recentActivity.push({
        id: trace.id,
        name: trace.name || 'Unnamed trace',
        input: trace.input,
        output: trace.output,
        metadata: trace.metadata,
        tags: trace.tags || [],
        createdAt: trace.created_at || trace.timestamp,
        feedback: trace.feedback,
        scores: trace.scores
      });
    }

    // Calculate average scores
    Object.keys(summary.averageScores).forEach(key => {
      summary.averageScores[key] = summary.averageScores[key] / traces.length;
    });

    return summary;

  } catch (error) {
    console.error('❌ Error fetching Opik results:', error.message);
    throw error;
  }
}

async function displayResults(summary: EvaluationSummary) {
  console.log('\n📈 OPIK EVALUATION SUMMARY');
  console.log('========================\n');

  console.log(`📊 Overview:`);
  console.log(`  - Total Projects: ${summary.totalProjects}`);
  console.log(`  - Total Experiments: ${summary.totalExperiments}`);
  console.log(`  - Total Traces: ${summary.totalTraces}\n`);

  if (Object.keys(summary.averageScores).length > 0) {
    console.log(`📋 Average Scores:`);
    Object.entries(summary.averageScores).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value.toFixed(3)}`);
    });
    console.log('');
  }

  if (Object.keys(summary.tagDistribution).length > 0) {
    console.log(`🏷️  Tag Distribution:`);
    Object.entries(summary.tagDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  - ${tag}: ${count}`);
      });
    console.log('');
  }

  if (summary.recentActivity.length > 0) {
    console.log(`🕐 Recent Activity (last ${Math.min(5, summary.recentActivity.length)}):`);
    summary.recentActivity.slice(0, 5).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name}`);
      console.log(`     ID: ${result.id}`);
      console.log(`     Created: ${result.createdAt}`);
      console.log(`     Tags: ${result.tags.join(', ') || 'None'}`);
      if (result.input) {
        const inputStr = typeof result.input === 'string' ? result.input : JSON.stringify(result.input);
        console.log(`     Input: ${inputStr.slice(0, 100)}${inputStr.length > 100 ? '...' : ''}`);
      }
      if (result.metadata) {
        console.log(`     Metadata: ${JSON.stringify(result.metadata).slice(0, 100)}...`);
      }
      console.log('');
    });
  }

  console.log(`🔗 Dashboard: https://www.comet.com/opik/${process.env.OPIK_WORKSPACE || 'oagr'}/experiments`);
}

async function exportResults(summary: EvaluationSummary, outputFile?: string) {
  const filename = outputFile || `opik-results-${new Date().toISOString().split('T')[0]}.json`;
  const fs = await import('fs');
  
  fs.writeFileSync(filename, JSON.stringify(summary, null, 2));
  console.log(`💾 Results exported to: ${filename}`);
}

async function main() {
  const args = process.argv.slice(2);
  const options: any = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i]);
        break;
      case '--project':
        options.projectName = args[++i];
        break;
      case '--tags':
        options.tags = args[++i].split(',');
        break;
      case '--since':
        options.since = new Date(args[++i]);
        break;
      case '--export':
        options.export = args[++i] || true;
        break;
      case '--help':
        console.log(`
Usage: npx tsx scripts/fetch-opik-results.ts [options]

Options:
  --limit <number>     Limit number of results (default: 100)
  --project <name>     Filter by project name
  --tags <tag1,tag2>   Filter by tags (comma-separated)
  --since <date>       Filter by date (YYYY-MM-DD)
  --export [file]      Export results to JSON file
  --help               Show this help message

Examples:
  npx tsx scripts/fetch-opik-results.ts --limit 50
  npx tsx scripts/fetch-opik-results.ts --tags evaluation,forecaster
  npx tsx scripts/fetch-opik-results.ts --since 2024-01-01 --export
        `);
        process.exit(0);
    }
  }

  try {
    const summary = await fetchOpikResults(options);
    await displayResults(summary);
    
    if (options.export) {
      await exportResults(summary, typeof options.export === 'string' ? options.export : undefined);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { fetchOpikResults, displayResults, exportResults };
export type { OpikResult, EvaluationSummary };