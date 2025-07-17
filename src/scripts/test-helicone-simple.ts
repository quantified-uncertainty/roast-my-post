#!/usr/bin/env tsx
/**
 * Simple test to check Helicone API connectivity
 */

import 'dotenv/config';

async function testHeliconeAPI() {
  const apiKey = process.env.HELICONE_API_KEY;
  if (!apiKey) {
    console.error('❌ HELICONE_API_KEY not found in environment');
    return;
  }

  console.log('🧪 Testing Helicone API...\n');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    // Try the simplest possible query
    const response = await fetch('https://api.helicone.ai/v1/request/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        filter: 'all',
        limit: 10,
        offset: 0,
        sort: {
          created_at: 'desc'
        }
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API call successful!');
    console.log('Response structure:', Object.keys(data));
    
    if (data.data && Array.isArray(data.data)) {
      console.log(`\nFound ${data.data.length} requests`);
      
      // Log first request in detail
      if (data.data.length > 0) {
        console.log('\nFirst request full structure:');
        console.log(JSON.stringify(data.data[0], null, 2));
      }
      
      // Check for sessions in recent requests
      let sessionsFound = 0;
      data.data.forEach((req: any, i: number) => {
        console.log(`\nRequest ${i + 1}:`);
        console.log('  Model:', req.model || req.request_model);
        console.log('  Created:', req.request_created_at);
        console.log('  Request ID:', req.request_id);
        console.log('  Response status:', req.response_status);
        console.log('  Cost:', req.costUSD);
        console.log('  Total tokens:', req.total_tokens);
        
        // Check for session in request_properties
        const props = req.request_properties || {};
        const sessionId = props['Helicone-Session-Id'];
        const sessionName = props['Helicone-Session-Name'];
        const sessionPath = props['Helicone-Session-Path'];
        
        if (sessionId) {
          sessionsFound++;
          console.log('  🎯 Session found!');
          console.log('    ID:', sessionId);
          console.log('    Name:', sessionName);
          console.log('    Path:', sessionPath);
          console.log('    Job ID:', props.jobid);
          console.log('    Agent:', props.agentname);
        }
      });
      
      console.log(`\n📊 Summary: ${sessionsFound} requests with sessions out of ${data.data.length} total`);
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

testHeliconeAPI().catch(console.error);