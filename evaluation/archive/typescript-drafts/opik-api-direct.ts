#!/usr/bin/env tsx

/**
 * Direct API exploration for Opik data
 * Trying to find the right endpoints
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API_KEY = process.env.OPIK_API_KEY;

async function exploreAPI() {
  if (!API_KEY) {
    console.error('❌ OPIK_API_KEY not set');
    return;
  }

  console.log('🔍 Exploring Opik/Comet API endpoints...\n');

  // Try various endpoint patterns
  const endpoints = [
    // Opik-specific endpoints
    'https://www.comet.com/api/opik/v1/experiments',
    'https://www.comet.com/api/opik/v1/traces',
    'https://www.comet.com/api/opik/v1/projects',
    
    // Comet API with different parameters
    'https://www.comet.com/api/rest/v2/experiments?workspaceName=opik',
    'https://www.comet.com/api/rest/v2/experiments?workspaceName=oagr&projectName=opik',
    
    // Try getting all experiments from workspace
    'https://www.comet.com/api/rest/v2/experiments?workspaceName=oagr&limit=100',
    
    // Opik cloud endpoints
    'https://cloud.comet.com/opik/api/v1/experiments',
    'https://cloud.comet.com/api/v1/experiments',
    
    // Direct workspace experiments
    `https://www.comet.com/api/rest/v2/experiments?workspaceName=oagr`,
    
    // User-specific endpoints
    'https://www.comet.com/api/rest/v2/users/me',
    'https://www.comet.com/api/rest/v2/account',
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const text = await response.text();
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          
          // Check for experiments
          if (data.experiments && Array.isArray(data.experiments)) {
            console.log(`  ✅ Found ${data.experiments.length} experiments!`);
            
            // Look for Opik-style experiments
            const opikExperiments = data.experiments.filter((exp: any) => 
              exp.experimentName?.includes('forecaster') ||
              exp.tags?.some((tag: string) => tag.includes('opik')) ||
              exp.projectName?.includes('opik')
            );
            
            if (opikExperiments.length > 0) {
              console.log(`  🎯 Found ${opikExperiments.length} Opik-related experiments:`);
              opikExperiments.slice(0, 3).forEach((exp: any) => {
                console.log(`     - ${exp.experimentName} (Project: ${exp.projectName})`);
              });
            }
          } else if (data.data && Array.isArray(data.data)) {
            console.log(`  ✅ Found ${data.data.length} items`);
          } else {
            console.log(`  ✅ Success - Response structure:`, Object.keys(data));
          }
        } catch (e) {
          console.log(`  ✅ Success but not JSON: ${text.substring(0, 100)}...`);
        }
      } else {
        console.log(`  ❌ Error: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`  ❌ Network error: ${error.message}`);
    }
    
    console.log('');
  }

  // Final check - see if we need a different API key
  console.log('\n💡 Notes:');
  console.log('- Your Opik experiments might be under a different workspace');
  console.log('- The API key might be for Comet ML, not Opik specifically');
  console.log('- You might need to check the browser dev tools on the Opik page');
  console.log('  to see what API endpoints are actually being called');
}

exploreAPI().catch(console.error);