import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { generateMathComment, generateDocumentSummary } from './commentGeneration';
import type { ExtractedMathExpression } from '../../../tools/extract-math-expressions';

describe('generateMathComment', () => {
  describe('error comments', () => {
    it('should NOT include duplicate header in description', () => {
      const expression: ExtractedMathExpression = {
        originalText: '2 + 2 = 5',
        hasError: true,
        errorType: 'calculation',
        errorExplanation: '2 + 2 equals 4, not 5',
        correctedVersion: '2 + 2 = 4',
        conciseCorrection: '5 → 4',
        complexityScore: 10,
        contextImportanceScore: 50,
        errorSeverityScore: 70,
        verificationStatus: 'verified'
      };

      const comment = generateMathComment(expression);
      
      // Check that the description doesn't contain styled header
      expect(comment).not.toContain('[Math]');
      expect(comment).not.toContain('<span style=');
      expect(comment).not.toContain('5 → 4'); // conciseCorrection should NOT be in description
      
      // Check that it contains the explanation
      expect(comment).toContain('2 + 2 equals 4, not 5');
      
      // Check that it contains the score table
      expect(comment).toContain('| Metric | Score |');
      expect(comment).toContain('| Complexity | 10/100 |');
      expect(comment).toContain('| Context Importance | 50/100 |');
      expect(comment).toContain('| Error Severity | 70/100 |');
    });

    it('should use default message when no explanation provided', () => {
      const expression: ExtractedMathExpression = {
        originalText: '3 * 3 = 10',
        hasError: true,
        errorType: 'calculation',
        // No errorExplanation provided
        complexityScore: 20,
        contextImportanceScore: 40,
        errorSeverityScore: 60,
        verificationStatus: 'verified'
      };

      const comment = generateMathComment(expression);
      
      // Should use fallback message
      expect(comment).toContain('Mathematical expression contains an error.');
      
      // Should still have score table
      expect(comment).toContain('| Metric | Score |');
    });
  });

  describe('informative comments', () => {
    it('should generate comment for highly complex expressions with explanation', () => {
      const expression: ExtractedMathExpression = {
        originalText: 'E = mc²',
        hasError: false,
        complexityScore: 95,
        contextImportanceScore: 90,
        errorSeverityScore: 0,
        verificationStatus: 'verified',
        simplifiedExplanation: 'This is Einstein\'s mass-energy equivalence formula'
      };

      const comment = generateMathComment(expression);
      
      // Should NOT contain styled header
      expect(comment).not.toContain('[Math]');
      expect(comment).not.toContain('<span style=');
      
      // Should contain the simplified explanation
      expect(comment).toContain('Einstein\'s mass-energy equivalence formula');
      
      // Should have score table
      expect(comment).toContain('| Complexity | 95/100 |');
    });

    it('should return empty string for simple verified calculations', () => {
      const expression: ExtractedMathExpression = {
        originalText: '1 + 1 = 2',
        hasError: false,
        complexityScore: 10,
        contextImportanceScore: 20,
        errorSeverityScore: 0,
        verificationStatus: 'verified'
      };

      const comment = generateMathComment(expression);
      
      // Should not generate a comment for simple verified math
      expect(comment).toBe('');
    });

    it('should return empty string for unverifiable calculations', () => {
      const expression: ExtractedMathExpression = {
        originalText: 'x = y + z',
        hasError: false,
        complexityScore: 30,
        contextImportanceScore: 40,
        errorSeverityScore: 0,
        verificationStatus: 'unverifiable'
      };

      const comment = generateMathComment(expression);
      
      // Should not generate a comment for unverifiable expressions
      expect(comment).toBe('');
    });
  });
});

describe('Math Plugin Integration', () => {
  it('should generate correct header and level for verified_true', async () => {
    // This test verifies that HybridMathErrorWrapper creates proper headers
    // @ts-ignore - Test file, import path doesn't need extension
    const { HybridMathErrorWrapper } = await import('./index');
    
    const wrapper = new HybridMathErrorWrapper(
      {
        statement: '2 + 2 = 4',
        status: 'verified_true',
        explanation: 'Correct calculation',
        verifiedBy: 'mathjs',
        toolsUsed: ['mathjs'],
        mathJsResult: {
          status: 'verified_true',
          explanation: 'Verified by MathJS',
          mathJsExpression: '2 + 2',
          computedValue: '4',
        }
      },
      {
        originalText: '2 + 2 = 4',
        hasError: false,
        complexityScore: 10,
        contextImportanceScore: 30,
        errorSeverityScore: 0,
        verificationStatus: 'verified'
      },
      'Math: 2 + 2 = 4',
      'chunk1',
      Date.now()
    );

    // Test private methods through reflection (not ideal but necessary for unit testing)
    const header = (wrapper as any).buildHeader();
    const level = (wrapper as any).getLevel();
    
    expect(header).toBe('✓ Verified correct');
    expect(level).toBe('success');
  });

  it('should generate correct header and level for verified_false with correction', async () => {
    // @ts-ignore - Test file, import path doesn't need extension
    const { HybridMathErrorWrapper } = await import('./index');
    
    const wrapper = new HybridMathErrorWrapper(
      {
        statement: '2 + 2 = 5',
        status: 'verified_false',
        explanation: '2 + 2 equals 4, not 5',
        verifiedBy: 'mathjs',
        toolsUsed: ['mathjs'],
        conciseCorrection: '5 → 4',
        mathJsResult: {
          status: 'verified_false',
          explanation: 'Incorrect',
          mathJsExpression: '2 + 2',
          computedValue: '4',
        }
      },
      {
        originalText: '2 + 2 = 5',
        hasError: true,
        complexityScore: 10,
        contextImportanceScore: 50,
        errorSeverityScore: 70,
        verificationStatus: 'verified'
      },
      'Math: 2 + 2 = 5',
      'chunk1',
      Date.now()
    );

    const header = (wrapper as any).buildHeader();
    const level = (wrapper as any).getLevel();
    
    expect(header).toBe('5 → 4'); // Should use conciseCorrection
    expect(level).toBe('error');
  });

  it('should NOT duplicate correction in description', async () => {
    // @ts-ignore - Test file, import path doesn't need extension
    const { HybridMathErrorWrapper } = await import('./index');
    
    const wrapper = new HybridMathErrorWrapper(
      {
        statement: '2 + 2 = 5',
        status: 'verified_false',
        explanation: '2 + 2 equals 4, not 5',
        verifiedBy: 'mathjs',
        toolsUsed: ['mathjs'],
        conciseCorrection: '5 → 4',
        mathJsResult: {
          status: 'verified_false',
          explanation: 'Incorrect',
          mathJsExpression: '2 + 2',
          computedValue: '4',
        }
      },
      {
        originalText: '2 + 2 = 5',
        hasError: true,
        complexityScore: 10,
        contextImportanceScore: 50,
        errorSeverityScore: 70,
        verificationStatus: 'verified'
      },
      'Math: 2 + 2 = 5',
      'chunk1',
      Date.now()
    );

    // Test the description generation
    const description = (wrapper as any).generateEnhancedComment();
    
    // The description should NOT contain the "Quick Fix:" line that was removed
    expect(description).not.toContain('Quick Fix:');
    
    // Should contain the explanation
    expect(description).toContain('2 + 2 equals 4, not 5');
    
    // Should contain MathJS debug info
    expect(description).toContain('Debug information');
  });
});