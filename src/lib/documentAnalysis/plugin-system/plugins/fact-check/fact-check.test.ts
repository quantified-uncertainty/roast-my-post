import { describe, it, expect } from '@jest/globals';
import { FactCheckAnalyzerJob } from './index';
import { FactCheckPlugin } from './plugin-wrapper';

describe('FactCheckPlugin', () => {
  it('should have correct metadata', () => {
    expect(FactCheckPlugin.name()).toBe('Fact Checker');
    expect(FactCheckPlugin.promptForWhenToUse()).toContain('factual claims');
    const examples = FactCheckPlugin.routingExamples && FactCheckPlugin.routingExamples();
    expect(examples).toBeDefined();
    expect(examples?.[0]?.chunkText).toBe('Check if the facts in this article are accurate');
  });

  it('should match static methods between job and plugin', () => {
    expect(FactCheckAnalyzerJob.displayName()).toBe(FactCheckPlugin.name());
    expect(FactCheckAnalyzerJob.promptForWhenToUse()).toBe(FactCheckPlugin.promptForWhenToUse());
    const jobExamples = FactCheckAnalyzerJob.routingExamples();
    const pluginExamples = FactCheckPlugin.routingExamples && FactCheckPlugin.routingExamples();
    expect(jobExamples.length).toBe(pluginExamples?.length);
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