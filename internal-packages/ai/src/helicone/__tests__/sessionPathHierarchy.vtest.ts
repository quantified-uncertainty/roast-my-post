import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getGlobalSessionManager,
  getCurrentHeliconeHeaders 
} from '../simpleSessionManager';

describe('Session Path Hierarchy', () => {
  beforeEach(() => {
    setGlobalSessionManager(undefined);
  });
  
  test('builds correct path hierarchy for job -> analysis -> plugins -> tool', async () => {
    const paths: string[] = [];
    
    // Create job session
    const jobManager = HeliconeSessionManager.forJob(
      'job-123',
      'Test Job',
      { JobId: 'job-123' }
    );
    
    setGlobalSessionManager(jobManager);
    
    // Track at each level and capture paths
    await jobManager.trackAnalysis('document', async () => {
      paths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
      
      // Get current manager and track plugins
      const analysisManager = getGlobalSessionManager()!;
      await analysisManager.withPath('/plugins', undefined, async () => {
        paths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
        
        // Track individual plugin using withPath to avoid double /plugins/
        const pluginsManager = getGlobalSessionManager()!;
        await pluginsManager.withPath('/math', { plugin: 'math' }, async () => {
          paths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
          
          // Track tool within plugin
          const pluginManager = getGlobalSessionManager()!;
          await pluginManager.trackTool('check-math', async () => {
            paths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
          });
        });
      });
    });
    
    // Verify the path hierarchy
    expect(paths).toEqual([
      '/analysis/document',
      '/analysis/document/plugins',
      '/analysis/document/plugins/math',
      '/analysis/document/plugins/math/tools/check-math'
    ]);
  });
  
  test('verifies actual plugin manager usage pattern', async () => {
    const capturedHeaders: Array<{ context: string; headers: Record<string, string> }> = [];
    
    // Simulate Job.ts setting up session
    const jobSession = HeliconeSessionManager.forJob(
      'real-job-456',
      'Fact Check Analysis',
      {
        JobId: 'real-job-456',
        AgentId: 'fact-checker-agent',
        DocumentId: 'doc-789'
      }
    );
    
    setGlobalSessionManager(jobSession);
    
    // Job.ts tracks analysis/document
    await jobSession.trackAnalysis('document', async () => {
      capturedHeaders.push({
        context: 'Job.ts - document analysis',
        headers: { ...getCurrentHeliconeHeaders() }
      });
      
      // PluginManager picks up global session and tracks /plugins
      const pluginManagerSession = getGlobalSessionManager()!;
      await pluginManagerSession.withPath('/plugins', undefined, async () => {
        capturedHeaders.push({
          context: 'PluginManager - plugins orchestration',
          headers: { ...getCurrentHeliconeHeaders() }
        });
        
        // Individual plugin execution - PluginManager now uses withPath after our fix
        const currentPluginManager = getGlobalSessionManager()!;
        await currentPluginManager.withPath('/fact-check', { plugin: 'fact-check' }, async () => {
          capturedHeaders.push({
            context: 'FactCheckPlugin - analysis',
            headers: { ...getCurrentHeliconeHeaders() }
          });
          
          // Tool execution within plugin
          const currentSession = getGlobalSessionManager()!;
          await currentSession.trackTool('extract-claims', async () => {
            capturedHeaders.push({
              context: 'ExtractClaims tool',
              headers: { ...getCurrentHeliconeHeaders() }
            });
          });
          
          await currentSession.trackTool('fact-checker', async () => {
            capturedHeaders.push({
              context: 'FactChecker tool',
              headers: { ...getCurrentHeliconeHeaders() }
            });
          });
        });
      });
    });
    
    // Verify all contexts have the same session ID
    const sessionIds = capturedHeaders.map(h => h.headers['Helicone-Session-Id']);
    expect(new Set(sessionIds).size).toBe(1);
    expect(sessionIds[0]).toBe('real-job-456');
    
    // Verify paths are correct
    expect(capturedHeaders[0].headers['Helicone-Session-Path']).toBe('/analysis/document');
    expect(capturedHeaders[1].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins');
    expect(capturedHeaders[2].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins/fact-check');
    expect(capturedHeaders[3].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins/fact-check/tools/extract-claims');
    expect(capturedHeaders[4].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins/fact-check/tools/fact-checker');
    
    // Verify properties are maintained throughout
    capturedHeaders.forEach(({ context, headers }) => {
      expect(headers['Helicone-Property-JobId']).toBe('real-job-456');
      expect(headers['Helicone-Property-AgentId']).toBe('fact-checker-agent');
      expect(headers['Helicone-Property-DocumentId']).toBe('doc-789');
    });
    
    // Log for debugging
    console.log('\nSession tracking hierarchy:');
    capturedHeaders.forEach(({ context, headers }) => {
      console.log(`${context}: ${headers['Helicone-Session-Path']}`);
    });
  });
});