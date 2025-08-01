#!/usr/bin/env tsx
/**
 * Test script to verify Helicone session integration
 * 
 * Usage: npm run test-helicone-sessions
 */

import 'dotenv/config';
import { heliconeAPI } from '@roast/ai';
import { logger } from '@/lib/logger';
import { setupTestCleanup } from './test-cleanup-utils';

async function testHeliconeIntegration() {
  console.log('🧪 Testing Helicone Session Integration...\n');

  // Setup cleanup analysis
  const cleanupManager = await setupTestCleanup({
    beforeTests: true,
    verbose: false
  });

  try {
    // Test 1: Basic connectivity and session detection
    console.log('1️⃣  Testing session detection...');
    const testResult = await heliconeAPI.testSessionIntegration();
    
    console.log(`   ✅ Sessions working: ${testResult.isWorking ? 'YES' : 'NO'}`);
    console.log(`   📊 Sessions found: ${testResult.sessionsFound}`);
    
    if (testResult.issues.length > 0) {
      console.log('   ⚠️  Issues detected:');
      testResult.issues.forEach(issue => console.log(`      - ${issue}`));
    }
    
    if (testResult.recentSessions.length > 0) {
      console.log('\n   📝 Recent sessions:');
      testResult.recentSessions.forEach(session => {
        console.log(`      - ${session.name} (${session.id.slice(0, 8)}...)`);
        console.log(`        Requests: ${session.requestCount}, Path: ${session.path}`);
      });
    }

    // Test 2: Get recent job sessions
    console.log('\n2️⃣  Fetching recent job sessions...');
    const jobSessions = await heliconeAPI.getRecentJobSessions(5);
    
    if (jobSessions.length > 0) {
      console.log(`   Found ${jobSessions.length} job sessions:`);
      jobSessions.forEach(session => {
        console.log(`\n   📋 Job: ${session.jobId}`);
        console.log(`      Agent: ${session.agentName}`);
        console.log(`      Document: ${session.documentTitle}`);
        console.log(`      Requests: ${session.requestCount}`);
        console.log(`      Cost: $${session.totalCost.toFixed(4)}`);
        console.log(`      Created: ${new Date(session.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('   No job sessions found');
    }

    // Test 3: Get detailed cost breakdown for a session
    if (testResult.recentSessions.length > 0) {
      console.log('\n3️⃣  Getting cost breakdown for most recent session...');
      const sessionId = testResult.recentSessions[0].id;
      const costs = await heliconeAPI.getSessionCosts(sessionId);
      
      console.log(`   💰 Total cost: $${costs.totalCost.toFixed(4)}`);
      console.log(`   🔢 Total tokens: ${costs.totalTokens.toLocaleString()}`);
      console.log(`   📊 Requests: ${costs.requestCount}`);
      
      if (costs.breakdown.length > 0) {
        console.log('\n   Model breakdown:');
        costs.breakdown.forEach(model => {
          console.log(`      - ${model.model}:`);
          console.log(`        Cost: $${model.cost.toFixed(4)}`);
          console.log(`        Tokens: ${model.tokens.toLocaleString()}`);
          console.log(`        Requests: ${model.count}`);
        });
      }
    }

    // Test 4: Get usage stats for the last 24 hours
    console.log('\n4️⃣  Getting usage stats for last 24 hours...');
    console.log('   ⚠️  Skipping usage stats due to API validation issues');

    console.log('\n✅ Helicone integration test completed!');
    
    // Post-test cleanup analysis
    console.log('\n─'.repeat(50));
    await cleanupManager.logCleanupRecommendations();
    
    // Provide recommendations
    console.log('\n💡 Recommendations:');
    if (!testResult.isWorking || testResult.sessionsFound === 0) {
      console.log('   - Make sure HELICONE_SESSIONS_ENABLED=true in your .env');
      console.log('   - Run some jobs with npm run process-jobs');
      console.log('   - Check that your Helicone API key has read permissions');
    } else {
      console.log('   - Sessions are working correctly!');
      console.log('   - You can view sessions at https://helicone.ai/sessions');
      console.log('   - Use the API client to build custom dashboards or monitoring');
    }
    
    // Add cleanup recommendations
    const cleanupSuggestions = await cleanupManager.getCleanupSuggestions();
    if (cleanupSuggestions.totalSessions > 0) {
      console.log('\n🧹 Test Data Cleanup:');
      cleanupSuggestions.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error testing Helicone integration:', error);
    logger.error('Helicone test failed:', error);
    
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check HELICONE_API_KEY is set in .env');
    console.log('   2. Ensure the API key has read permissions (starts with sk-)');
    console.log('   3. If in EU, set HELICONE_API_BASE_URL=https://eu.api.helicone.ai');
    console.log('   4. Check your Helicone dashboard for any issues');
  }
}

// Run the test
testHeliconeIntegration().catch(console.error);