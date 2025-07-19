#!/usr/bin/env tsx

/**
 * Export Opik experiment data to CSV format using TypeScript
 * Supports exporting experiments, datasets, and traces with all metrics
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Opik } from 'opik';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Types
interface ExperimentData {
  experiment_id: string;
  experiment_name: string;
  created_at: string;
  [key: string]: any;
}

interface TraceData {
  trace_id: string;
  trace_name: string;
  created_at: string;
  project_name: string;
  [key: string]: any;
}

interface DatasetData {
  item_id: string;
  [key: string]: any;
}

interface OpikClient {
  experiments?: {
    list?: (params?: any) => Promise<any[]>;
  };
  traces?: {
    list?: (params?: any) => Promise<any[]>;
  };
  datasets?: {
    list?: (params?: any) => Promise<any[]>;
    get?: (id: string) => Promise<any>;
  };
  getDatasetItems?: (params: { dataset_id: string; limit?: number }) => Promise<any[]>;
}

class OpikExporter {
  private client: Opik & OpikClient;
  private apiKey: string;
  private workspace: string;

  constructor() {
    this.apiKey = process.env.OPIK_API_KEY || '';
    this.workspace = process.env.OPIK_WORKSPACE || 'oagr';

    if (!this.apiKey) {
      throw new Error('OPIK_API_KEY environment variable not set');
    }

    this.client = new Opik({
      apiKey: this.apiKey,
      workspace: this.workspace,
      baseURL: 'https://www.comet.com/opik/api/v1'
    }) as Opik & OpikClient;
  }

  async exportExperiments(outputFile: string, limit: number = 100): Promise<void> {
    console.log(`📊 Fetching experiments (limit: ${limit})...`);
    
    try {
      const experiments = await this.client.experiments?.list?.({ limit }) || [];
      
      if (experiments.length === 0) {
        console.log('No experiments found.');
        return;
      }

      const csvData: ExperimentData[] = [];
      const headers = new Set(['experiment_id', 'experiment_name', 'created_at']);

      for (const exp of experiments) {
        console.log(`\n🧪 Processing experiment: ${exp.name || exp.id}`);
        
        const expData: ExperimentData = {
          experiment_id: exp.id || '',
          experiment_name: exp.name || '',
          created_at: exp.created_at || exp.timestamp || ''
        };

        // Add metadata
        if (exp.metadata) {
          Object.entries(exp.metadata).forEach(([key, value]) => {
            headers.add(`metadata_${key}`);
            expData[`metadata_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
          });
        }

        // Add feedback scores
        if (exp.feedback_scores) {
          exp.feedback_scores.forEach((score: any) => {
            headers.add(score.name);
            expData[score.name] = score.value;
          });
        }

        // Add metrics
        if (exp.metrics) {
          Object.entries(exp.metrics).forEach(([key, value]) => {
            headers.add(key);
            expData[key] = value;
          });
        }

        csvData.push(expData);
      }

      // Write to CSV
      this.writeCSV(outputFile, csvData, Array.from(headers).sort());
      console.log(`\n✅ Exported ${csvData.length} experiments to ${outputFile}`);
      
    } catch (error) {
      console.error('❌ Error exporting experiments:', error);
      throw error;
    }
  }

  async exportTraces(outputFile: string, limit: number = 1000): Promise<void> {
    console.log(`📈 Fetching traces (limit: ${limit})...`);
    
    try {
      const traces = await this.client.traces?.list?.({ limit }) || [];
      
      if (traces.length === 0) {
        console.log('No traces found.');
        return;
      }

      const csvData: TraceData[] = [];
      const headers = new Set(['trace_id', 'trace_name', 'created_at', 'project_name']);

      for (const trace of traces) {
        const traceData: TraceData = {
          trace_id: trace.id || '',
          trace_name: trace.name || '',
          created_at: trace.created_at || trace.timestamp || '',
          project_name: trace.project_name || ''
        };

        // Add input data
        if (trace.input) {
          if (typeof trace.input === 'object') {
            Object.entries(trace.input).forEach(([key, value]) => {
              headers.add(`input_${key}`);
              traceData[`input_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
            });
          } else {
            headers.add('input');
            traceData.input = String(trace.input);
          }
        }

        // Add output data
        if (trace.output) {
          if (typeof trace.output === 'object') {
            Object.entries(trace.output).forEach(([key, value]) => {
              headers.add(`output_${key}`);
              traceData[`output_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
            });
          } else {
            headers.add('output');
            traceData.output = String(trace.output);
          }
        }

        // Add metadata
        if (trace.metadata) {
          Object.entries(trace.metadata).forEach(([key, value]) => {
            headers.add(`metadata_${key}`);
            traceData[`metadata_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
          });
        }

        // Add feedback scores
        if (trace.feedback_scores) {
          trace.feedback_scores.forEach((score: any) => {
            headers.add(score.name);
            traceData[score.name] = score.value;
          });
        }

        // Add tags
        if (trace.tags && trace.tags.length > 0) {
          headers.add('tags');
          traceData.tags = trace.tags.join(', ');
        }

        csvData.push(traceData);
      }

      // Write to CSV
      this.writeCSV(outputFile, csvData, Array.from(headers).sort());
      console.log(`\n✅ Exported ${csvData.length} traces to ${outputFile}`);
      
    } catch (error) {
      console.error('❌ Error exporting traces:', error);
      throw error;
    }
  }

  async exportDataset(datasetName: string, outputFile: string): Promise<void> {
    console.log(`📊 Fetching dataset: ${datasetName}`);
    
    try {
      // Get dataset by name
      const datasets = await this.client.datasets?.list?.({ limit: 100 }) || [];
      const dataset = datasets.find(ds => ds.name === datasetName);
      
      if (!dataset) {
        console.log(`❌ Dataset '${datasetName}' not found`);
        return;
      }

      // Get dataset items
      const items = await this.client.getDatasetItems?.({ 
        dataset_id: dataset.id, 
        limit: 1000 
      }) || [];
      
      if (items.length === 0) {
        console.log('No items found in dataset.');
        return;
      }

      const csvData: DatasetData[] = [];
      const headers = new Set(['item_id']);

      for (const item of items) {
        const itemData: DatasetData = {
          item_id: item.id || ''
        };

        // Add all fields from the item
        const processObject = (obj: any, prefix: string = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            if (key === 'id' && prefix === '') return; // Skip root id
            
            const fieldName = prefix ? `${prefix}_${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              processObject(value, fieldName);
            } else {
              headers.add(fieldName);
              itemData[fieldName] = Array.isArray(value) || typeof value === 'object' 
                ? JSON.stringify(value) 
                : value;
            }
          });
        };

        processObject(item);
        csvData.push(itemData);
      }

      // Write to CSV
      const outputPath = outputFile === 'dataset.csv' ? `${datasetName}.csv` : outputFile;
      this.writeCSV(outputPath, csvData, Array.from(headers).sort());
      console.log(`\n✅ Exported ${csvData.length} items from dataset '${datasetName}' to ${outputPath}`);
      
    } catch (error) {
      console.error(`❌ Error exporting dataset:`, error);
      throw error;
    }
  }

  async listAvailableData(): Promise<void> {
    console.log('🔍 Checking available data in Opik...\n');
    
    // List experiments
    console.log('🧪 Recent Experiments:');
    try {
      const experiments = await this.client.experiments?.list?.({ limit: 10 }) || [];
      if (experiments.length > 0) {
        experiments.forEach((exp, i) => {
          console.log(`  ${i + 1}. ${exp.name || 'Unnamed'} (ID: ${exp.id})`);
          if (exp.created_at) {
            console.log(`     Created: ${exp.created_at}`);
          }
          if (exp.feedback_scores) {
            const scores = exp.feedback_scores
              .map((s: any) => `${s.name}=${s.value?.toFixed(3) || 'N/A'}`)
              .join(', ');
            console.log(`     Scores: ${scores}`);
          }
          if (exp.metrics) {
            const metrics = Object.entries(exp.metrics)
              .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(3) : v}`)
              .join(', ');
            console.log(`     Metrics: ${metrics}`);
          }
        });
      } else {
        console.log('  No experiments found.');
      }
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    
    console.log('');
    
    // List datasets
    console.log('📊 Recent Datasets:');
    try {
      const datasets = await this.client.datasets?.list?.({ limit: 10 }) || [];
      if (datasets.length > 0) {
        for (const [i, ds] of datasets.entries()) {
          console.log(`  ${i + 1}. ${ds.name || 'Unnamed'} (ID: ${ds.id})`);
          try {
            const items = await this.client.getDatasetItems?.({ 
              dataset_id: ds.id, 
              limit: 1 
            }) || [];
            console.log(`     Sample size: ${items.length}+ items`);
          } catch {
            // Ignore errors when fetching item count
          }
        }
      } else {
        console.log('  No datasets found.');
      }
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    
    console.log('');
    console.log(`🔗 Dashboard: https://www.comet.com/opik/${this.workspace}/experiments`);
  }

  private writeCSV(filename: string, data: any[], headers: string[]): void {
    const csv = stringify(data, {
      header: true,
      columns: headers
    });
    
    fs.writeFileSync(filename, csv, 'utf8');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help') {
    console.log(`
Usage: npx tsx evaluation/scripts/export-opik-data.ts <command> [options]

Commands:
  list                List available data
  experiments         Export experiments to CSV
  traces              Export traces to CSV
  dataset <name>      Export a specific dataset to CSV

Options:
  -o, --output <file>  Output CSV file (default: command-specific)
  -l, --limit <number> Number of items to export (default: 100 for experiments, 1000 for traces)
  --help               Show this help message

Examples:
  npx tsx evaluation/scripts/export-opik-data.ts list
  npx tsx evaluation/scripts/export-opik-data.ts experiments -o experiments.csv -l 50
  npx tsx evaluation/scripts/export-opik-data.ts traces -o traces.csv -l 1000
  npx tsx evaluation/scripts/export-opik-data.ts dataset "my-dataset" -o dataset.csv
    `);
    process.exit(command === '--help' ? 0 : 1);
  }

  const exporter = new OpikExporter();
  
  try {
    // Parse options
    let outputFile = '';
    let limit = 0;
    
    for (let i = 1; i < args.length; i++) {
      switch (args[i]) {
        case '-o':
        case '--output':
          outputFile = args[++i];
          break;
        case '-l':
        case '--limit':
          limit = parseInt(args[++i]);
          break;
      }
    }

    // Execute command
    switch (command) {
      case 'list':
        await exporter.listAvailableData();
        break;
        
      case 'experiments':
        await exporter.exportExperiments(
          outputFile || 'experiments.csv',
          limit || 100
        );
        break;
        
      case 'traces':
        await exporter.exportTraces(
          outputFile || 'traces.csv',
          limit || 1000
        );
        break;
        
      case 'dataset':
        const datasetName = args[1];
        if (!datasetName) {
          console.error('❌ Dataset name is required');
          process.exit(1);
        }
        await exporter.exportDataset(
          datasetName,
          outputFile || 'dataset.csv'
        );
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { OpikExporter };