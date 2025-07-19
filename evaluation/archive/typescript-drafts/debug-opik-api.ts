#!/usr/bin/env tsx

/**
 * Debug Opik API connection and find correct workspace/project settings
 */

import { Opik } from 'opik';
import fetch from 'node-fetch';

async function debugOpikConnection() {
  const apiKey = process.env.OPIK_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPIK_API_KEY not found');
    return;
  }

  console.log('🔍 Debugging Opik API connection...\n');
  console.log(`API Key: ${apiKey.slice(0, 10)}...`);
  
  // Try different API endpoint patterns
  const endpoints = [
    'https://www.comet.com/api/rest/v2/experiments?workspaceName=oagr&projectName=tool-evals-forecaster',
    'https://www.comet.com/api/rest/v2/projects?workspaceName=oagr',
    'https://www.comet.com/api/rest/v2/workspaces',
    'https://www.comet.com/opik/api/v1/experiments',
    'https://www.comet.com/opik/api/v1/projects',
  ];

  console.log('Testing various API endpoints:\n');

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      const text = await response.text();
      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
      
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          console.log(`  ✅ Success! Found ${Array.isArray(data) ? data.length : 'data'}`);
          if (data.experiments) {
            console.log(`  Experiments: ${data.experiments.length}`);
          }
          if (data.projects) {
            console.log(`  Projects: ${data.projects.length}`);
          }
        } catch (e) {
          console.log(`  ⚠️ Valid response but not JSON`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  // Also try the Opik SDK with different configurations
  console.log('\nTrying Opik SDK with different configurations:\n');
  
  const configurations = [
    { workspace: 'oagr', projectName: 'tool-evals-forecaster' },
    { workspace: 'oagr', projectName: 'oagr' },
    { workspace: 'default', projectName: 'default' },
    { workspace: undefined, projectName: undefined }
  ];

  for (const config of configurations) {
    console.log(`Testing workspace='${config.workspace}', project='${config.projectName}'`);
    try {
      const opik = new Opik({
        apiKey,
        workspace: config.workspace,
        projectName: config.projectName,
        baseURL: 'https://www.comet.com/opik/api/v1'
      } as any);

      // Try to access data
      const result = await (opik as any).experiments?.list?.({ limit: 1 });
      if (result && result.length > 0) {
        console.log(`  ✅ Found ${result.length} experiments!`);
        return config;
      } else {
        console.log(`  ❌ No experiments found`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n💡 Suggestions:');
  console.log('1. Check if the API key is a Comet ML API key (not just Opik)');
  console.log('2. The workspace might need to be your Comet username');
  console.log('3. Project name might be "tool-evals-forecaster" based on the URL');
  console.log('4. You might need to use Comet ML SDK instead of Opik SDK');
}

debugOpikConnection().catch(console.error);