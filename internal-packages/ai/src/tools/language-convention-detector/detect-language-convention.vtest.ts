import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { detectLanguageConventionTool } from './index';
import { logger } from '../../shared/logger';

describe('DetectLanguageConventionTool', () => {
  const mockContext = {
    logger,
    userId: 'test-user'
  };

  describe('US English detection', () => {
    it('should detect clear US English text', async () => {
      const input = {
        text: 'I organized a program to analyze the behavior patterns in our data center. We utilized specialized algorithms to optimize performance.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.convention).toBe('US');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.some(e => e.word === 'organized')).toBe(true);
    });
  });

  describe('UK English detection', () => {
    it('should detect clear UK English text', async () => {
      const input = {
        text: 'I organised a programme to analyse the behaviour patterns in our data centre. We utilised specialised algorithms to optimise performance.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.convention).toBe('UK');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.some(e => e.word === 'organised')).toBe(true);
    });

  });

  describe('Mixed convention detection', () => {
    it('should detect mixed US/UK usage', async () => {
      const input = {
        text: 'I organized the programme to analyse behavior in our data center. We utilised specialized algorithms.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // Mixed usage is indicated by lower confidence, not a 'mixed' value
      expect(result.convention).toBe('US'); // US wins slightly due to more US words
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence indicates mixed usage
      expect(result.evidence.length).toBeGreaterThan(0);
      // Check that we have evidence from both conventions
      const usWords = result.evidence.filter(e => e.convention === 'US');
      const ukWords = result.evidence.filter(e => e.convention === 'UK');
      expect(usWords.length).toBeGreaterThan(0);
      expect(ukWords.length).toBeGreaterThan(0);
    });
  });

  describe('Unknown convention', () => {
    it('should return US with 0 confidence for text without convention markers', async () => {
      const input = {
        text: 'The quick brown fox jumps over the lazy dog.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // No convention markers means US default with 0 confidence
      expect(result.convention).toBe('US');
      expect(result.confidence).toBe(0);
      expect(result.evidence.length).toBe(0);
    });
  });

  describe('Document type detection', () => {
    it('should detect academic documents', async () => {
      const input = {
        text: 'Abstract: This study examines the theoretical framework. Introduction: Previous empirical studies have shown significant results. Methodology: We conducted systematic analysis.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.documentType).toBeDefined();
      expect(result.documentType?.type).toBe('academic');
      expect(result.documentType?.confidence).toBeGreaterThan(0.3);
    });

    it('should detect technical documents', async () => {
      const input = {
        text: '## Installation\nRun `npm install` to install dependencies.\n\n### API Documentation\nThe following methods are available:\n- `initialize()`: Setup the application'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.documentType).toBeDefined();
      expect(result.documentType?.type).toBe('technical');
    });
  });

  describe('Sample size', () => {
    it('should respect custom sample size', async () => {
      const longText = 'a'.repeat(5000);
      const input = {
        text: longText,
        sampleSize: 100
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // With only 100 chars of 'a', should default to US with 0 confidence
      expect(result.convention).toBe('US');
      expect(result.confidence).toBe(0);
    });
  });
});