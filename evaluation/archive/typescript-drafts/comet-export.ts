#!/usr/bin/env tsx

/**
 * Export experiments from Comet ML (which hosts Opik)
 * This uses the Comet ML REST API v2
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API_KEY = process.env.OPIK_API_KEY;
const BASE_URL = 'https://www.comet.com/api/rest/v2';
const WORKSPACE = 'oagr';

interface CometExperiment {
  experimentKey: string;
  experimentName: string;
  userName: string;
  projectName: string;
  durationMillis: number;
  startTimeMillis: number;
  endTimeMillis: number;
  optimization?: {
    metric: string;
    value: number;
  };
  tags?: string[];
  [key: string]: any;
}

async function fetchWithAuth(url: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': API_KEY!,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${await response.text()}`);
  }
  
  return response.json();
}

async function listProjects() {
  console.log('📋 Fetching projects...');
  const data = await fetchWithAuth(`${BASE_URL}/projects?workspaceName=${WORKSPACE}`);
  
  console.log(`Found ${data.projects.length} projects:\n`);
  data.projects.forEach((project: any) => {
    console.log(`  - ${project.projectName} (ID: ${project.projectId})`);
    console.log(`    Experiments: ${project.numberOfExperiments}`);
    console.log(`    Description: ${project.projectDescription || 'None'}`);
    console.log('');
  });
  
  // Also try to find Opik-specific experiments
  console.log('\n🔍 Searching for Opik experiments...');
  
  // Try various project names that might contain the Opik experiments
  const possibleProjects = [
    'tool-evals-forecaster',
    'forecaster',
    'opik',
    'evaluations',
    'oagr'
  ];
  
  for (const projectName of possibleProjects) {
    try {
      const expData = await fetchWithAuth(
        `${BASE_URL}/experiments?workspaceName=${WORKSPACE}&projectName=${projectName}`
      );
      if (expData.experiments && expData.experiments.length > 0) {
        console.log(`\n✅ Found Opik experiments in project: ${projectName}`);
        console.log(`   Total experiments: ${expData.experiments.length}`);
        console.log(`   Recent experiments:`);
        expData.experiments.slice(0, 5).forEach((exp: any) => {
          console.log(`     - ${exp.experimentName || exp.experimentKey}`);
        });
        
        // Add this to the projects list
        data.projects.push({
          projectName: projectName,
          projectId: projectName,
          numberOfExperiments: expData.experiments.length,
          projectDescription: 'Opik evaluations'
        });
      }
    } catch (error) {
      // Silently skip if project doesn't exist
    }
  }
  
  return data.projects;
}

async function exportExperiments(projectName: string, outputFile: string = 'comet-experiments.csv') {
  console.log(`\n🧪 Fetching experiments from project: ${projectName}...`);
  
  // First get all experiment keys
  const experimentsData = await fetchWithAuth(
    `${BASE_URL}/experiments?workspaceName=${WORKSPACE}&projectName=${projectName}`
  );
  
  if (!experimentsData.experiments || experimentsData.experiments.length === 0) {
    console.log('No experiments found in this project.');
    return;
  }
  
  console.log(`Found ${experimentsData.experiments.length} experiments\n`);
  
  // Fetch detailed data for each experiment
  const detailedExperiments = [];
  for (const exp of experimentsData.experiments) {
    console.log(`Fetching details for: ${exp.experimentName || exp.experimentKey}`);
    
    try {
      // Get experiment metrics
      const metricsData = await fetchWithAuth(
        `${BASE_URL}/experiments/${exp.experimentKey}/metrics-summaries`
      );
      
      // Get experiment parameters
      const paramsData = await fetchWithAuth(
        `${BASE_URL}/experiments/${exp.experimentKey}/parameters`
      );
      
      // Combine all data
      const combined = {
        ...exp,
        metrics: metricsData.metricsSummaries || [],
        parameters: paramsData.parameters || []
      };
      
      detailedExperiments.push(combined);
    } catch (error) {
      console.log(`  ⚠️ Error fetching details: ${error.message}`);
      detailedExperiments.push(exp);
    }
  }
  
  // Convert to CSV format
  const csvData = detailedExperiments.map(exp => {
    const row: any = {
      experiment_key: exp.experimentKey,
      experiment_name: exp.experimentName || '',
      project_name: exp.projectName,
      created_at: new Date(exp.startTimeMillis).toISOString(),
      duration_seconds: Math.round((exp.durationMillis || 0) / 1000),
      tags: (exp.tags || []).join(', ')
    };
    
    // Add metrics
    if (exp.metrics) {
      exp.metrics.forEach((metric: any) => {
        row[`metric_${metric.name}`] = metric.valueCurrent || metric.valueMax || metric.valueMin || '';
      });
    }
    
    // Add parameters
    if (exp.parameters) {
      exp.parameters.forEach((param: any) => {
        row[`param_${param.name}`] = param.valueCurrent || '';
      });
    }
    
    return row;
  });
  
  // Write to CSV
  const csv = stringify(csvData, {
    header: true
  });
  
  fs.writeFileSync(outputFile, csv, 'utf8');
  console.log(`\n✅ Exported ${csvData.length} experiments to ${outputFile}`);
  
  // Also save as JSON for complete data
  const jsonFile = outputFile.replace('.csv', '.json');
  fs.writeFileSync(jsonFile, JSON.stringify(detailedExperiments, null, 2), 'utf8');
  console.log(`📄 Also saved complete data to ${jsonFile}`);
}

async function main() {
  if (!API_KEY) {
    console.error('❌ OPIK_API_KEY environment variable not set');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (!command || command === 'list') {
      await listProjects();
      console.log('\n💡 To export experiments, run:');
      console.log('   npx tsx evaluation/scripts/comet-export.ts export <project-name>');
      
    } else if (command === 'export') {
      const projectName = args[1];
      const outputFile = args[2] || 'comet-experiments.csv';
      
      if (!projectName) {
        console.error('❌ Please specify a project name');
        console.log('Usage: npx tsx evaluation/scripts/comet-export.ts export <project-name> [output-file]');
        process.exit(1);
      }
      
      await exportExperiments(projectName, outputFile);
      
    } else if (command === 'export-all') {
      // Export all projects
      const projects = await listProjects();
      
      for (const project of projects) {
        if (project.numberOfExperiments > 0) {
          const filename = `comet-${project.projectName}-experiments.csv`;
          await exportExperiments(project.projectName, filename);
        }
      }
      
    } else {
      console.log(`
Usage: npx tsx evaluation/scripts/comet-export.ts <command>

Commands:
  list              List all projects
  export <project>  Export experiments from a specific project
  export-all        Export experiments from all projects

Examples:
  npx tsx evaluation/scripts/comet-export.ts list
  npx tsx evaluation/scripts/comet-export.ts export general
  npx tsx evaluation/scripts/comet-export.ts export tool-evals-forecaster forecaster-results.csv
      `);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}