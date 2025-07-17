/**
 * Test Cleanup Utilities for Helicone Integration Tests
 * 
 * Provides cleanup mechanisms to prevent test data pollution in production systems
 */

import { HeliconeAPIClient } from '@/lib/helicone/api-client';

export interface TestCleanupConfig {
  dryRun?: boolean;
  maxAge?: number; // milliseconds
  testSessionPrefix?: string;
  verbose?: boolean;
}

export class TestCleanupManager {
  private apiClient: HeliconeAPIClient;
  private config: Required<TestCleanupConfig>;

  constructor(apiClient: HeliconeAPIClient, config: TestCleanupConfig = {}) {
    this.apiClient = apiClient;
    this.config = {
      dryRun: config.dryRun ?? true, // Safe default
      maxAge: config.maxAge ?? 24 * 60 * 60 * 1000, // 24 hours
      testSessionPrefix: config.testSessionPrefix ?? 'test-',
      verbose: config.verbose ?? false
    };
  }

  /**
   * Generate a unique test session ID that can be easily identified for cleanup
   */
  generateTestSessionId(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${this.config.testSessionPrefix}${prefix}-${timestamp}-${random}`;
  }

  /**
   * Identify test sessions that can be cleaned up
   */
  async identifyTestSessions(): Promise<Array<{
    sessionId: string;
    sessionName: string;
    requestCount: number;
    createdAt: Date;
    isOldEnough: boolean;
  }>> {
    try {
      // Get recent requests to find test sessions
      const result = await this.apiClient.queryRequests({
        filter: 'all',
        sort: { created_at: 'desc' },
        limit: 1000 // Increase limit to find more test sessions
      });

      // Group by session and identify test sessions
      const sessionMap = new Map<string, {
        sessionId: string;
        sessionName: string;
        requests: any[];
        createdAt: Date;
      }>();

      result.data.forEach(req => {
        const sessionId = req.properties?.['Helicone-Session-Id'];
        const sessionName = req.properties?.['Helicone-Session-Name'] || '';
        
        if (!sessionId) return;

        // Only track sessions that match our test prefix
        if (!sessionId.startsWith(this.config.testSessionPrefix)) return;

        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId,
            sessionName,
            requests: [],
            createdAt: new Date(req.created_at)
          });
        }

        const session = sessionMap.get(sessionId)!;
        session.requests.push(req);
        
        // Update creation date to earliest request
        const reqDate = new Date(req.created_at);
        if (reqDate < session.createdAt) {
          session.createdAt = reqDate;
        }
      });

      // Convert to cleanup candidates
      const now = Date.now();
      return Array.from(sessionMap.values()).map(session => ({
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        requestCount: session.requests.length,
        createdAt: session.createdAt,
        isOldEnough: (now - session.createdAt.getTime()) > this.config.maxAge
      }));

    } catch (error) {
      console.error('Error identifying test sessions:', error);
      return [];
    }
  }

  /**
   * Log cleanup recommendations without actually cleaning up
   */
  async logCleanupRecommendations(): Promise<void> {
    console.log('🧹 Analyzing test sessions for cleanup...\n');

    const testSessions = await this.identifyTestSessions();
    
    if (testSessions.length === 0) {
      console.log('✅ No test sessions found that match cleanup criteria');
      return;
    }

    const oldSessions = testSessions.filter(s => s.isOldEnough);
    const recentSessions = testSessions.filter(s => !s.isOldEnough);

    console.log(`📊 Found ${testSessions.length} test sessions:`);
    console.log(`   - ${oldSessions.length} sessions older than ${this.config.maxAge / (60 * 60 * 1000)} hours (eligible for cleanup)`);
    console.log(`   - ${recentSessions.length} recent sessions (keeping for now)\n`);

    if (oldSessions.length > 0) {
      console.log('⚠️  Sessions eligible for cleanup:');
      oldSessions.forEach((session, i) => {
        const age = Date.now() - session.createdAt.getTime();
        const ageHours = Math.round(age / (60 * 60 * 1000));
        console.log(`   ${i + 1}. ${session.sessionId}`);
        console.log(`      Name: ${session.sessionName}`);
        console.log(`      Age: ${ageHours} hours`);
        console.log(`      Requests: ${session.requestCount}`);
        console.log('');
      });

      console.log('💡 To clean up these sessions:');
      console.log('   1. Contact your Helicone administrator');
      console.log('   2. Sessions cannot be deleted via API, only through dashboard');
      console.log('   3. Consider using shorter test session prefixes');
      console.log('   4. Use staging/development Helicone workspace for tests');
    }

    if (recentSessions.length > 0 && this.config.verbose) {
      console.log('ℹ️  Recent test sessions (keeping):');
      recentSessions.forEach((session, i) => {
        const age = Date.now() - session.createdAt.getTime();
        const ageMinutes = Math.round(age / (60 * 1000));
        console.log(`   ${i + 1}. ${session.sessionId} (${ageMinutes} minutes old, ${session.requestCount} requests)`);
      });
    }
  }

  /**
   * Get cleanup suggestions for manual action
   */
  async getCleanupSuggestions(): Promise<{
    eligibleSessions: string[];
    recommendations: string[];
    totalSessions: number;
    oldSessions: number;
  }> {
    const testSessions = await this.identifyTestSessions();
    const oldSessions = testSessions.filter(s => s.isOldEnough);
    
    const recommendations = [
      'Use a dedicated test/staging Helicone workspace to avoid production pollution',
      'Set up environment-specific API keys (dev/staging/prod)',
      'Use time-based session IDs that are easy to identify and clean',
      'Consider implementing session expiration in your application logic',
      'Document test data cleanup procedures for your team'
    ];

    if (oldSessions.length > 0) {
      recommendations.unshift(
        `Found ${oldSessions.length} old test sessions that should be cleaned up manually`,
        'Contact Helicone support or use dashboard to remove old test sessions'
      );
    }

    return {
      eligibleSessions: oldSessions.map(s => s.sessionId),
      recommendations,
      totalSessions: testSessions.length,
      oldSessions: oldSessions.length
    };
  }
}

/**
 * Setup test cleanup for a test script
 */
export async function setupTestCleanup(options: {
  apiKey?: string;
  beforeTests?: boolean;
  afterTests?: boolean;
  verbose?: boolean;
}): Promise<TestCleanupManager> {
  const apiClient = new HeliconeAPIClient(options.apiKey);
  const cleanupManager = new TestCleanupManager(apiClient, {
    verbose: options.verbose ?? true,
    dryRun: true // Always dry run for safety
  });

  if (options.beforeTests) {
    console.log('🔍 Pre-test cleanup analysis...');
    await cleanupManager.logCleanupRecommendations();
    console.log('─'.repeat(50));
  }

  // Return cleanup manager for potential post-test cleanup
  return cleanupManager;
}

/**
 * Create a test environment configuration
 */
export function createTestEnvironment(prefix: string = 'test'): {
  sessionIdGenerator: () => string;
  markForCleanup: (sessionId: string) => void;
  getMarkedSessions: () => string[];
} {
  const markedSessions: string[] = [];
  const testPrefix = `test-${prefix}-`;

  return {
    sessionIdGenerator: () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6);
      const sessionId = `${testPrefix}${timestamp}-${random}`;
      markedSessions.push(sessionId);
      return sessionId;
    },
    markForCleanup: (sessionId: string) => {
      if (!markedSessions.includes(sessionId)) {
        markedSessions.push(sessionId);
      }
    },
    getMarkedSessions: () => [...markedSessions]
  };
}