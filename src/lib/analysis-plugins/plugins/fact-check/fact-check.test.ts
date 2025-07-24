import { describe, it, expect } from '@jest/globals';
import { FactCheckAnalyzerJob } from './index';
import { FactCheckPlugin } from './plugin-wrapper';

describe('FactCheckPlugin', () => {
  it('should have correct metadata', () => {
    const plugin = new FactCheckPlugin();
    expect(plugin.name()).toBe('Fact Checker');
    expect(plugin.promptForWhenToUse()).toContain('factual claims');
    const examples = plugin.routingExamples();
    expect(examples).toBeDefined();
    expect(examples[0]?.chunkText).toBe('Check if the facts in this article are accurate');
  });

  it('should match static methods between job and plugin', () => {
    const plugin = new FactCheckPlugin();
    expect(FactCheckAnalyzerJob.displayName()).toBe(plugin.name());
    expect(FactCheckAnalyzerJob.promptForWhenToUse()).toBe(plugin.promptForWhenToUse());
    const jobExamples = FactCheckAnalyzerJob.routingExamples();
    const pluginExamples = plugin.routingExamples();
    expect(jobExamples.length).toBe(pluginExamples.length);
  });

  it('should be able to instantiate the job', () => {
    const job = new FactCheckAnalyzerJob();
    expect(job).toBeDefined();
  });

  it('should handle empty document', async () => {
    const job = new FactCheckAnalyzerJob();
    const result = await job.analyze('', []);
    
    expect(result).toBeDefined();
    expect(result.comments).toEqual([]);
    expect(result.summary).toBeDefined();
    expect(result.analysis).toBeDefined();
  });
});