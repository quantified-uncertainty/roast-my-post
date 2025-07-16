#!/usr/bin/env node
/**
 * Simple test script to verify PromptBasedRouter LLM tracking works
 */

import { PromptBasedRouter } from './PromptBasedRouter';
import { SpellingPlugin, MathPlugin } from '.';
import { createChunks } from './TextChunk';

async function testRouterTracking() {
  console.log('🧪 Testing PromptBasedRouter LLM tracking...\n');

  const router = new PromptBasedRouter();
  
  // Register some plugins
  router.registerPlugin(new SpellingPlugin());
  router.registerPlugin(new MathPlugin());
  
  // Create test chunks
  const testText = `
    This is a simple test with some math: 2 + 2 = 5.
    There are also some speling errors in this text.
    The calculation 10 * 10 = 100 is correct though.
  `;
  
  const chunks = createChunks(testText, { chunkSize: 100 });
  console.log(`📄 Created ${chunks.length} chunks`);
  
  // Clear any existing interactions
  router.clearLLMInteractions();
  
  // Route the chunks (this should trigger LLM calls)
  console.log('🔀 Routing chunks...');
  const routingPlan = await router.routeChunks(chunks);
  
  // Check LLM interactions
  const interactions = router.getLLMInteractions();
  console.log(`\n📊 Router made ${interactions.length} LLM calls`);
  
  if (interactions.length > 0) {
    const lastInteraction = router.getLastLLMInteraction()!;
    console.log(`   Model: ${lastInteraction.model}`);
    console.log(`   Tokens: ${lastInteraction.tokensUsed.total} (${lastInteraction.tokensUsed.prompt} prompt + ${lastInteraction.tokensUsed.completion} completion)`);
    console.log(`   Duration: ${lastInteraction.duration}ms`);
    console.log(`   Timestamp: ${lastInteraction.timestamp.toISOString()}`);
    
    // Show routing results
    const stats = routingPlan.getStats();
    console.log(`\n🎯 Routing results:`);
    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Total routings: ${stats.totalRoutings}`);
    console.log(`   Plugin usage:`, Object.fromEntries(stats.pluginUsage));
    
    console.log('\n✅ Router LLM tracking is working correctly!');
  } else {
    console.log('\n❌ No LLM interactions were tracked!');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRouterTracking().catch(console.error);
}

export { testRouterTracking };