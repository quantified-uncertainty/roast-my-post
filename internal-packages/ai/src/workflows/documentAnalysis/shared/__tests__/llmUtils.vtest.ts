import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { createLogDetails } from '../llmUtils';

describe('llmUtils', () => {
  describe('createLogDetails', () => {
    it('should create log details with correct structure', () => {
      const startTime = Date.now();
      const endTime = startTime + 5000; // 5 seconds later
      
      const logDetails = createLogDetails(
        'test-task',
        'claude-3-5-sonnet',
        startTime,
        endTime,
        150, // cost in cents
        100, // input tokens
        50,  // output tokens
        { documentId: 'test-doc' },
        { responseLength: 200 },
        'Test task completed successfully'
      );

      expect(logDetails.task.name).toBe('test-task');
      expect(logDetails.task.model).toBe('claude-3-5-sonnet');
      expect(logDetails.task.durationSeconds).toBe(5);
      expect(logDetails.cost.estimatedCents).toBe(150);
      expect(logDetails.cost.usage.input_tokens).toBe(100);
      expect(logDetails.cost.usage.output_tokens).toBe(50);
      expect(logDetails.context.documentId).toBe('test-doc');
      expect(logDetails.outputStats.responseLength).toBe(200);
      expect(logDetails.summary).toBe('Test task completed successfully');
    });

    it('should format timestamps correctly', () => {
      const testTime = new Date('2024-01-01T12:00:00.000Z').getTime();
      
      const logDetails = createLogDetails(
        'test-task',
        'claude-3-5-sonnet',
        testTime,
        testTime + 1000,
        0, 0, 0, {}, {}, 'test'
      );

      expect(logDetails.task.startTime).toBe('2024-01-01T12:00:00.000Z');
      expect(logDetails.task.endTime).toBe('2024-01-01T12:00:01.000Z');
    });
  });
});