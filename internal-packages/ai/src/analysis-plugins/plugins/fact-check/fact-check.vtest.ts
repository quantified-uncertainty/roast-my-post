import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { FactCheckPlugin, FactCheckAnalyzerJob } from './index';

describe('FactCheckPlugin', () => {
  it('should have correct metadata', () => {
    const plugin = new FactCheckPlugin();
    expect(plugin.name()).toBe('FACT_CHECK');
    expect(plugin.promptForWhenToUse()).toContain('factual claims');
    const examples = plugin.routingExamples();
    expect(examples).toBeDefined();
    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0]?.shouldProcess).toBeDefined();
  });

  it('should backward compatibility alias work', () => {
    // FactCheckAnalyzerJob should be an alias for FactCheckPlugin
    expect(FactCheckAnalyzerJob).toBe(FactCheckPlugin);
  });

  it('should be able to instantiate the job', () => {
    const job = new FactCheckAnalyzerJob();
    expect(job).toBeDefined();
  });

  it('should handle empty document', async () => {
    const plugin = new FactCheckPlugin();
    const result = await plugin.analyze([], '');
    
    expect(result).toBeDefined();
    expect(result.comments).toEqual([]);
    expect(result.summary).toBeDefined();
    expect(result.analysis).toBeDefined();
  });
});