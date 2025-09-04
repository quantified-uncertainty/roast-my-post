import { describe, it, expect, vi, beforeAll } from 'vitest';
import { FactCheckerTool } from './index';
import * as claudeWrapper from '../../claude/wrapper';

// Mock the Claude wrapper
vi.mock('../../claude/wrapper');

describe('FactCheckerTool', () => {
  const mockCallClaudeWithTool = vi.mocked(claudeWrapper.callClaudeWithTool);
  
  beforeAll(() => {
    // Mock successful fact check response
    mockCallClaudeWithTool.mockImplementation(() => 
      Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: {
              verdict: 'false',
              confidence: 'high',
              explanation: 'The Earth is approximately spherical, not flat.',
              corrections: 'The Earth is a sphere',
              conciseCorrection: 'The Earth is spherical',
              sources: []
            }
          }],
          usage: { input_tokens: 100, output_tokens: 50 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          timestamp: new Date(),
          duration: 1000
        },
        toolResult: {
          verdict: 'false',
          confidence: 'high',
          explanation: 'The Earth is approximately spherical, not flat.',
          corrections: 'The Earth is a sphere',
          conciseCorrection: 'The Earth is spherical',
          sources: []
        }
      })
    );
  });

  it('should have correct metadata', () => {
    const tool = new FactCheckerTool();
    expect(tool.config.id).toBe('fact-checker');
    expect(tool.config.name).toBe('Fact Checker');
    expect(tool.config.description).toContain('Verify');
  });

  it('should fact-check a single claim', async () => {
    const tool = new FactCheckerTool();
    const input = {
      claim: 'The Earth is flat',
      context: 'A claim about the shape of the Earth',
      searchForEvidence: false
    };

    const result = await tool.execute(input, {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      }
    });

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toBe('false');
    expect(result.result.confidence).toBe('high');
    expect(result.result.explanation).toContain('spherical');
  });

  it('should validate input', () => {
    const tool = new FactCheckerTool();
    
    // Valid input
    expect(() => tool.inputSchema.parse({
      claim: 'The sky is blue',
      searchForEvidence: false
    })).not.toThrow();
    
    // Invalid input - empty claim
    expect(() => tool.inputSchema.parse({
      claim: '',
      searchForEvidence: false
    })).toThrow();
    
    // Invalid input - missing claim
    expect(() => tool.inputSchema.parse({
      searchForEvidence: false
    })).toThrow();
  });
});