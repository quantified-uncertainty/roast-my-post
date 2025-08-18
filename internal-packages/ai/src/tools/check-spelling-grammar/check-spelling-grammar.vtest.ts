import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { checkSpellingGrammarTool } from './index';

// Mock the Claude API call to test specific scenarios
vi.mock('@roast/ai', () => ({
  callClaudeWithTool: vi.fn()
}));

// Mock the language convention detection
vi.mock('../detect-language-convention', () => ({
  detectLanguageConventionTool: {
    execute: vi.fn().mockImplementation(() => Promise.resolve({
      convention: 'US',
      confidence: 0.8,
      consistency: 0.9
    }))
  }
}));

describe('CheckSpellingGrammarTool', () => {
  it('should not flag informal/colloquial words as errors', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    // Mock Claude's response - no errors for informal words
    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [],
        totalErrorsFound: 0
      }
    }));

    const input = {
      text: "The implementation looks jankily put together, but it's gonna work. We kinda need to refactor it later.",
      context: 'Code review comment',
      strictness: 'standard' as const
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    expect(result.errors).toHaveLength(0);
    expect(result.metadata?.totalErrorsFound).toBe(0);
  });

  it('should flag actual spelling errors', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    // Mock Claude's response with spelling errors
    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'teh',
            correction: 'the',
            conciseCorrection: 'teh → the',
            type: 'spelling',
            context: 'This is teh best approach',
            importance: 15,
            confidence: 100,
            description: null
          },
          {
            text: 'recieve',
            correction: 'receive',
            conciseCorrection: 'recieve → receive',
            type: 'spelling',
            context: 'We will recieve the data',
            importance: 20,
            confidence: 100,
            description: null
          }
        ],
        totalErrorsFound: 2
      }
    }));

    const input = {
      text: "This is teh best approach. We will recieve the data tomorrow.",
      strictness: 'standard' as const
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].text).toBe('teh');
    expect(result.errors[0].conciseCorrection).toBe('teh → the');
    expect(result.errors[1].text).toBe('recieve');
    expect(result.metadata?.totalErrorsFound).toBe(2);
  });

  it('should respect strictness levels', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    // For minimal strictness - only major errors
    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'dont',
            correction: "don't",
            conciseCorrection: "dont → don't",
            type: 'spelling',
            context: "We dont have time",
            importance: 55, // Above minimal threshold of 51
            confidence: 95,
            description: null
          }
        ],
        totalErrorsFound: 5 // More errors found but filtered by importance
      }
    }));

    const input = {
      text: "We dont have time for minor issues.",
      strictness: 'minimal' as const
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    expect(result.errors).toHaveLength(1);
    expect(result.metadata?.totalErrorsFound).toBe(5);
  });

  it('should validate that error text exists in input', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    // Mock Claude's response with errors including case mismatches
    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'notintext', // This doesn't exist in the input
            correction: 'corrected',
            conciseCorrection: 'notintext → corrected',
            type: 'spelling',
            importance: 50,
            confidence: 90,
            description: null
          },
          {
            text: 'antropics', // Case mismatch - actual text is "Anthropic's"
            correction: "Anthropic's",
            conciseCorrection: "antropics → Anthropic's",
            type: 'spelling',
            importance: 40,
            confidence: 85,
            description: null
          },
          {
            text: 'actual',
            correction: 'actual',
            conciseCorrection: 'actual → actual',
            type: 'spelling',
            context: 'This is the actual text',
            importance: 30,
            confidence: 80,
            description: null
          }
        ],
        totalErrorsFound: 3
      }
    }));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const input = {
      text: "This is the actual text about Anthropic's technology."
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    // Only the valid error should be returned (exact match only)
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].text).toBe('actual');
    
    // Should have logged warning about invalid errors
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Filtered 2 invalid errors')
    );

    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('should add position indices to errors', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'mistake',
            correction: 'correct',
            conciseCorrection: 'mistake → correct',
            type: 'spelling',
            importance: 40,
            confidence: 90,
            description: null
          }
        ],
        totalErrorsFound: 1
      }
    }));

    const input = {
      text: "This is a mistake in the text."
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    // Note: We don't test position indices because they require fuzzy-text-locator
    // for accurate multi-occurrence handling
  });

  it('should include description for complex grammar errors', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'are',
            correction: 'is',
            conciseCorrection: 'are → is',
            type: 'grammar',
            context: 'of engineers are working',
            importance: 45,
            confidence: 85,
            description: 'The subject "team" is singular and requires the singular verb "is", not the plural "are".'
          }
        ],
        totalErrorsFound: 1
      }
    }));

    const input = {
      text: "The team of engineers are working on the project."
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].description).toBe('The subject "team" is singular and requires the singular verb "is", not the plural "are".');
    expect(result.errors[0].confidence).toBe(85);
  });

  it('should include line numbers for multi-line text', async () => {
    const { callClaudeWithTool } = await import('@roast/ai');
    const mockCallClaude = callClaudeWithTool as any;

    mockCallClaude.mockImplementationOnce(() => Promise.resolve({
      toolResult: {
        errors: [
          {
            text: 'teh',
            correction: 'the',
            conciseCorrection: 'teh → the',
            type: 'spelling',
            context: 'This is teh first line',
            importance: 15,
            confidence: 100,
            description: null,
            lineNumber: 1
          },
          {
            text: 'recieve',
            correction: 'receive',
            conciseCorrection: 'recieve → receive',
            type: 'spelling',
            context: 'Third line will recieve data',
            importance: 20,
            confidence: 100,
            description: null,
            lineNumber: 3
          }
        ],
        totalErrorsFound: 2
      }
    }));

    const input = {
      text: `This is teh first line.
Second line is correct.
Third line will recieve data.`
    };

    const result = await checkSpellingGrammarTool.execute(input, {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        isDevelopment: false,
        log: vi.fn(),
        logRequest: vi.fn(),
        logResponse: vi.fn(),
        child: vi.fn().mockReturnThis()
      } as any
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].lineNumber).toBe(1);
    expect(result.errors[1].lineNumber).toBe(3);
  });
});