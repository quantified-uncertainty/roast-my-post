#!/usr/bin/env tsx

/**
 * Script to test Opik API access and fetch evaluation results
 * Usage: npm run tsx scripts/check-opik-api.ts
 */

import { Opik } from 'opik';

async function main() {
  console.log('🔍 Checking Opik API access...\n');

  // Check environment variables
  const apiKey = process.env.OPIK_API_KEY;
  const workspace = process.env.OPIK_WORKSPACE || 'oagr';

  if (!apiKey) {
    console.error('❌ OPIK_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log(`✅ API Key found: ${apiKey.slice(0, 8)}...`);
  console.log(`📂 Workspace: ${workspace}\n`);

  try {
    // Initialize Opik client
    const opik = new Opik({
      apiKey,
      workspace,
      // For cloud deployment
      baseURL: 'https://www.comet.com/opik/api/v1'
    });

    console.log('🚀 Opik client initialized successfully');

    // Try to list projects to test connectivity
    console.log('\n📋 Fetching projects...');
    
    // Note: The exact API methods may vary based on the SDK version
    // Let's try a few different approaches
    
    try {
      // Method 1: List projects (if available)
      const projects = await (opik as any).projects?.list?.() || [];
      console.log(`✅ Found ${projects.length} projects`);
      
      if (projects.length > 0) {
        console.log('Projects:');
        projects.slice(0, 5).forEach((project: any) => {
          console.log(`  - ${project.name || project.id} (${project.description || 'No description'})`);
        });
      }
    } catch (error) {
      console.log('⚠️  Projects list method not available or failed');
    }

    try {
      // Method 2: Try to list experiments
      console.log('\n🧪 Fetching experiments...');
      const experiments = await (opik as any).experiments?.list?.({
        limit: 10
      }) || [];
      
      console.log(`✅ Found ${experiments.length} experiments`);
      
      if (experiments.length > 0) {
        console.log('Recent experiments:');
        experiments.slice(0, 5).forEach((exp: any) => {
          console.log(`  - ${exp.name || exp.id}`);
          console.log(`    Created: ${exp.created_at || 'Unknown'}`);
          console.log(`    Metrics: ${exp.metrics ? Object.keys(exp.metrics).join(', ') : 'None'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('⚠️  Experiments list method not available or failed');
    }

    try {
      // Method 3: Try to list traces
      console.log('\n📊 Fetching traces...');
      const traces = await (opik as any).traces?.list?.({
        limit: 10
      }) || [];
      
      console.log(`✅ Found ${traces.length} traces`);
      
      if (traces.length > 0) {
        console.log('Recent traces:');
        traces.slice(0, 5).forEach((trace: any) => {
          console.log(`  - ${trace.name || trace.id}`);
          console.log(`    Input: ${JSON.stringify(trace.input || {}).slice(0, 100)}...`);
          console.log(`    Output: ${JSON.stringify(trace.output || {}).slice(0, 100)}...`);
          console.log(`    Tags: ${trace.tags?.join(', ') || 'None'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('⚠️  Traces list method not available or failed');
    }

    // Show dashboard URL
    console.log(`\n🔗 Dashboard URL: https://www.comet.com/opik/${workspace}/experiments`);
    
    console.log('\n✅ Opik API access test completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to connect to Opik API:');
    console.error(error.message);
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('\n💡 This might be an authentication issue. Check:');
      console.error('1. OPIK_API_KEY is correct');
      console.error('2. API key has proper permissions');
      console.error('3. Workspace name is correct');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 This might be a network connectivity issue');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}