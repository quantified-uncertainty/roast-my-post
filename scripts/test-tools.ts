#!/usr/bin/env tsx
/**
 * Test script for tool endpoints
 * Run with: npm run tsx scripts/test-tools.ts
 */

import { prisma } from '../src/lib/prisma';
import { hash } from 'bcryptjs';

// Test data for each tool
const testCases = {
  'math-checker': {
    text: 'Revenue grew by 50% from $2 million to $3.5 million. With a 15% profit margin, we made $525,000 in profit.',
    maxErrors: 10
  },
  'forecaster': {
    question: 'Will AI assistants be widely adopted in software development by 2025?',
    context: 'GitHub Copilot has millions of users, ChatGPT is being integrated into IDEs',
    numForecasts: 3,
    usePerplexity: false
  },
  'fact-check': {
    text: 'The Earth is approximately 4.5 billion years old. The moon is about 384,400 km from Earth.',
    maxClaims: 10,
    verifyHighPriority: false
  },
  'extract-forecasting-claims': {
    text: 'We expect revenue to grow 20% next year. AI will likely replace 30% of jobs by 2030.',
    maxDetailedAnalysis: 2
  },
  'perplexity-research': {
    query: 'Latest developments in quantum computing 2024',
    focusArea: 'technical',
    maxSources: 3,
    includeForecastingContext: false
  },
  'extract-factual-claims': {
    text: 'Apple was founded in 1976. Microsoft was founded in 1975. Both are tech giants.',
    checkContradictions: true,
    prioritizeVerification: true
  },
  'check-spelling-grammar': {
    text: 'Their are many reasons why this approch might not work. We should of done better.',
    includeStyle: true,
    maxErrors: 20
  }
};

async function createTestUser() {
  // Check if test user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  });

  if (existingUser) {
    console.log('✓ Test user already exists');
    return existingUser.id;
  }

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      emailVerified: new Date(),
      hashedPassword: await hash('testpassword123', 12),
      name: 'Test User'
    }
  });

  console.log('✓ Created test user');
  return user.id;
}

async function createSession(userId: string) {
  // Create a session
  const session = await prisma.session.create({
    data: {
      userId,
      sessionToken: `test-session-${Date.now()}`,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  });

  console.log('✓ Created test session');
  return session.sessionToken;
}

async function testToolEndpoint(
  toolId: string,
  payload: any,
  sessionToken: string
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  console.log(`\n🧪 Testing ${toolId}...`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/tools/${toolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${toolId} failed with status ${response.status}:`, errorText);
      return false;
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ ${toolId} succeeded`);
      
      // Log key results
      if (toolId === 'math-checker' && result.result?.errors) {
        console.log(`  Found ${result.result.errors.length} math errors`);
      } else if (toolId === 'forecaster' && result.result?.probability) {
        console.log(`  Forecast: ${result.result.probability.toFixed(1)}% (${result.result.consensus} consensus)`);
      } else if (toolId === 'fact-check' && result.result?.claims) {
        console.log(`  Found ${result.result.claims.length} factual claims`);
      } else if (toolId === 'check-spelling-grammar' && result.result?.errors) {
        console.log(`  Found ${result.result.errors.length} spelling/grammar issues`);
      }
      
      return true;
    } else {
      console.error(`❌ ${toolId} returned error:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${toolId} threw error:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting tool endpoint tests...\n');

  try {
    // Create test user and session
    const userId = await createTestUser();
    const sessionToken = await createSession(userId);

    console.log('\n📋 Running tool tests...');

    const results: Record<string, boolean> = {};

    // Test each tool
    for (const [toolId, payload] of Object.entries(testCases)) {
      results[toolId] = await testToolEndpoint(toolId, payload, sessionToken);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n📊 Test Summary:');
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    for (const [toolId, passed] of Object.entries(results)) {
      console.log(`  ${passed ? '✓' : '✗'} ${toolId}`);
    }
    
    console.log(`\n${passed}/${total} tests passed`);
    
    if (passed < total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}