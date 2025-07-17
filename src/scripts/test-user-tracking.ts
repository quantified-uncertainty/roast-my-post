#!/usr/bin/env tsx
/**
 * Test script to verify user tracking in Helicone sessions
 */

import 'dotenv/config';
import { createJobSessionConfig, createHeliconeHeaders } from '../lib/helicone/sessions';
import { createTestEnvironment } from './test-cleanup-utils';

async function testUserTracking() {
  console.log('🧪 Testing Helicone User Tracking...\n');

  // Setup test environment for cleanup tracking
  const testEnv = createTestEnvironment('user-tracking');

  // Test 1: Session config without user ID
  console.log('1️⃣ Test without user ID:');
  const testJobId1 = testEnv.sessionIdGenerator();
  const configWithoutUser = createJobSessionConfig(
    testJobId1,
    null,
    'Test Agent',
    'Test Document',
    '/job/test',
    { TestProp: 'value' }
  );
  const headersWithoutUser = createHeliconeHeaders(configWithoutUser);
  console.log('Headers:', JSON.stringify(headersWithoutUser, null, 2));
  console.log('Has User ID:', 'Helicone-User-Id' in headersWithoutUser);
  console.log();

  // Test 2: Session config with user ID
  console.log('2️⃣ Test with user ID:');
  const testJobId2 = testEnv.sessionIdGenerator();
  const configWithUser = createJobSessionConfig(
    testJobId2,
    null,
    'Test Agent',
    'Test Document',
    '/job/test',
    { TestProp: 'value' },
    'user-123-test'
  );
  const headersWithUser = createHeliconeHeaders(configWithUser);
  console.log('Headers:', JSON.stringify(headersWithUser, null, 2));
  console.log('Has User ID:', 'Helicone-User-Id' in headersWithUser);
  console.log('User ID:', headersWithUser['Helicone-User-Id']);
  console.log();

  // Test 3: Make actual API call to Helicone
  const apiKey = process.env.HELICONE_API_KEY;
  if (apiKey) {
    console.log('3️⃣ Testing with Helicone API:');
    
    try {
      const response = await fetch('https://api.helicone.ai/v1/request/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          filter: 'all',
          limit: 5,
          offset: 0,
          sort: {
            created_at: 'desc'
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Found ${data.data?.length || 0} recent requests`);
        
        // Check for user tracking in recent requests
        if (data.data && Array.isArray(data.data)) {
          let requestsWithUsers = 0;
          data.data.forEach((req: any, i: number) => {
            const props = req.request_properties || {};
            const userId = props['Helicone-User-Id'];
            
            if (userId) {
              requestsWithUsers++;
              console.log(`\nRequest ${i + 1} has user tracking:`);
              console.log('  User ID:', userId);
              console.log('  Session ID:', props['Helicone-Session-Id']);
              console.log('  Session Name:', props['Helicone-Session-Name']);
            }
          });
          
          console.log(`\n📊 Summary: ${requestsWithUsers} out of ${data.data.length} requests have user tracking`);
        }
      } else {
        console.error('❌ API request failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Error calling API:', error);
    }
  } else {
    console.log('⚠️ HELICONE_API_KEY not found, skipping API test');
  }

  // Log test sessions created for cleanup tracking
  const markedSessions = testEnv.getMarkedSessions();
  if (markedSessions.length > 0) {
    console.log('\n🧹 Test Sessions Created (for cleanup tracking):');
    markedSessions.forEach((sessionId, i) => {
      console.log(`   ${i + 1}. ${sessionId}`);
    });
    console.log('\n💡 These test sessions can be identified and cleaned up using the test-cleanup-utils');
  }
}

testUserTracking().catch(console.error);