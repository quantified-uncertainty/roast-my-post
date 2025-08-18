import { MathPlugin } from './index';
import { TextChunk } from '../../TextChunk';
import { checkMathHybridTool } from '../../../tools/check-math-hybrid';

// Mock the math checking tool
vi.mock('../../../tools/check-math-hybrid');
const mockCheckMathHybrid = checkMathHybridTool as anyed<typeof checkMathHybridTool>;

describe('Math Plugin Parallelization Tests', () => {
  let mathPlugin: MathPlugin;
  let executionOrder: string[] = [];
  let executionTimestamps: { [key: string]: number } = {};

  beforeEach(() => {
    mathPlugin = new MathPlugin();
    executionOrder = [];
    executionTimestamps = {};
    vi.clearAllMocks();

    // Mock the hybrid math check tool to track execution
    mockCheckMathHybrid.execute = vi.fn().mockImplementation(async (input) => {
      const expression = input.statement;
      const startTime = Date.now();
      
      // Record when this expression started executing
      executionOrder.push(`start-${expression}`);
      executionTimestamps[`start-${expression}`] = startTime;

      // Simulate varying processing times to test parallelization
      const delay = expression.includes('2+2') ? 100 : 
                   expression.includes('3*3') ? 200 : 
                   expression.includes('10/2') ? 150 : 50;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Record when this expression finished
      const endTime = Date.now();
      executionOrder.push(`end-${expression}`);
      executionTimestamps[`end-${expression}`] = endTime;

      return {
        statement: expression,
        status: 'verified_true',
        explanation: `Verified ${expression}`,
        verifiedBy: 'mathjs',
        mathJsResult: {
          status: 'verified_true',
          explanation: 'Correct calculation',
          computedValue: '4',
          mathJsExpression: expression,
        },
        toolsUsed: ['mathjs']
      };
    });
  });

  describe('Parallel Execution Verification', () => {
    it('should execute math checks in parallel, not sequentially', async () => {
      // Create test chunks with multiple math expressions
      const chunks: TextChunk[] = [
        new TextChunk(
          'chunk-1',
          'First we calculate 2+2=4',
          {
            position: { start: 0, end: 25 }
          }
        ),
        new TextChunk(
          'chunk-2',
          'Then we have 3*3=9',
          {
            position: { start: 26, end: 44 }
          }
        ),
        new TextChunk(
          'chunk-3',
          'Finally 10/2=5',
          {
            position: { start: 45, end: 59 }
          }
        )
      ];

      const documentText = chunks.map(c => c.text).join(' ');

      // Mock the extract math expressions tool
      const extractMathExpressionsTool = require('../../../tools/extract-math-expressions').extractMathExpressionsTool;
      extractMathExpressionsTool.execute = vi.fn()
        .mockResolvedValueOnce({
          expressions: [{
            originalText: '2+2=4',
            expression: '2+2',
            expectedResult: '4',
            complexityScore: 20,
            contextImportanceScore: 50,
            errorSeverityScore: 30,
            hasError: false
          }]
        })
        .mockResolvedValueOnce({
          expressions: [{
            originalText: '3*3=9',
            expression: '3*3',
            expectedResult: '9',
            complexityScore: 25,
            contextImportanceScore: 55,
            errorSeverityScore: 35,
            hasError: false
          }]
        })
        .mockResolvedValueOnce({
          expressions: [{
            originalText: '10/2=5',
            expression: '10/2',
            expectedResult: '5',
            complexityScore: 30,
            contextImportanceScore: 60,
            errorSeverityScore: 40,
            hasError: false
          }]
        });

      // Run the analysis
      const startTime = Date.now();
      await mathPlugin.analyze(chunks, documentText);
      const totalTime = Date.now() - startTime;

      // Verify all expressions were checked
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledTimes(3);

      // Check execution pattern for parallelization
      // In parallel execution, we should see multiple "start" events before their corresponding "end" events
      const startIndices = {
        '2+2=4': executionOrder.indexOf('start-2+2=4'),
        '3*3=9': executionOrder.indexOf('start-3*3=9'),
        '10/2=5': executionOrder.indexOf('start-10/2=5')
      };

      const endIndices = {
        '2+2=4': executionOrder.indexOf('end-2+2=4'),
        '3*3=9': executionOrder.indexOf('end-3*3=9'),
        '10/2=5': executionOrder.indexOf('end-10/2=5')
      };

      // In parallel execution, the starts should happen close together
      // Sequential would show: start1, end1, start2, end2, start3, end3
      // Parallel shows: start1, start2, start3, end1, end3, end2 (order of ends depends on processing time)
      
      // All starts should happen before any ends (indicating parallel execution)
      const allStarts = Object.values(startIndices);
      const firstEnd = Math.min(...Object.values(endIndices));
      const lastStart = Math.max(...allStarts);

      // This assertion verifies parallel execution:
      // All expressions should start before the first one finishes
      expect(lastStart).toBeLessThan(firstEnd);

      // Additional timing check: total time should be less than sum of individual times
      // Sequential would take 100 + 200 + 150 = 450ms minimum
      // Parallel should take around 200ms (the longest individual task)
      expect(totalTime).toBeLessThan(350); // Allow some overhead

      console.log('Execution order:', executionOrder);
      console.log('Total execution time:', totalTime, 'ms');
    });

    it('should maintain correct results despite parallel execution', async () => {
      const chunks: TextChunk[] = [
        new TextChunk(
          'chunk-1',
          'Math: 5+5=10, 6*6=36, 100/4=25',
          {
            position: { start: 0, end: 30 }
          }
        )
      ];

      const documentText = chunks[0].text;

      // Mock extract to return multiple expressions from one chunk
      const extractMathExpressionsTool = require('../../../tools/extract-math-expressions').extractMathExpressionsTool;
      extractMathExpressionsTool.execute = vi.fn().mockResolvedValue({
        expressions: [
          {
            originalText: '5+5=10',
            expression: '5+5',
            expectedResult: '10',
            complexityScore: 20,
            contextImportanceScore: 50,
            errorSeverityScore: 30,
            hasError: false
          },
          {
            originalText: '6*6=36',
            expression: '6*6',
            expectedResult: '36',
            complexityScore: 25,
            contextImportanceScore: 55,
            errorSeverityScore: 35,
            hasError: false
          },
          {
            originalText: '100/4=25',
            expression: '100/4',
            expectedResult: '25',
            complexityScore: 30,
            contextImportanceScore: 60,
            errorSeverityScore: 40,
            hasError: false
          }
        ]
      });

      // Configure mock responses for each expression
      mockCheckMathHybrid.execute
        .mockResolvedValueOnce({
          statement: '5+5=10',
          status: 'verified_true',
          explanation: 'Correct: 5+5=10',
          verifiedBy: 'mathjs',
          mathJsResult: { 
            status: 'verified_true',
            explanation: 'Correct calculation',
            computedValue: '10', 
            mathJsExpression: '5+5' 
          },
          toolsUsed: ['mathjs']
        })
        .mockResolvedValueOnce({
          statement: '6*6=36',
          status: 'verified_true',
          explanation: 'Correct: 6*6=36',
          verifiedBy: 'mathjs',
          mathJsResult: { 
            status: 'verified_true',
            explanation: 'Correct calculation',
            computedValue: '36', 
            mathJsExpression: '6*6' 
          },
          toolsUsed: ['mathjs']
        })
        .mockResolvedValueOnce({
          statement: '100/4=25',
          status: 'verified_true',
          explanation: 'Correct: 100/4=25',
          verifiedBy: 'mathjs',
          mathJsResult: { 
            status: 'verified_true',
            explanation: 'Correct calculation',
            computedValue: '25', 
            mathJsExpression: '100/4' 
          },
          toolsUsed: ['mathjs']
        });

      const result = await mathPlugin.analyze(chunks, documentText);

      // Verify all expressions were processed
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledTimes(3);
      
      // Check that all expressions were called with correct inputs
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: '5+5=10' }),
        expect.anything()
      );
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: '6*6=36' }),
        expect.anything()
      );
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: '100/4=25' }),
        expect.anything()
      );

      // Verify the result contains analysis
      expect(result.analysis).toContain('3 mathematical expression');
      expect(result.summary).toBeDefined();
    });

    it('should handle errors gracefully in parallel execution', async () => {
      const chunks: TextChunk[] = [
        new TextChunk(
          'chunk-1',
          'Valid: 2+2=4, Invalid: abc=xyz, Valid: 3+3=6',
          {
            position: { start: 0, end: 45 }
          }
        )
      ];

      const documentText = chunks[0].text;

      const extractMathExpressionsTool = require('../../../tools/extract-math-expressions').extractMathExpressionsTool;
      extractMathExpressionsTool.execute = vi.fn().mockResolvedValue({
        expressions: [
          {
            originalText: '2+2=4',
            expression: '2+2',
            expectedResult: '4',
            complexityScore: 20,
            contextImportanceScore: 50,
            errorSeverityScore: 30,
            hasError: false
          },
          {
            originalText: 'abc=xyz',
            expression: 'abc',
            expectedResult: 'xyz',
            complexityScore: 10,
            contextImportanceScore: 30,
            errorSeverityScore: 20,
            hasError: false
          },
          {
            originalText: '3+3=6',
            expression: '3+3',
            expectedResult: '6',
            complexityScore: 20,
            contextImportanceScore: 50,
            errorSeverityScore: 30,
            hasError: false
          }
        ]
      });

      // Make the second expression throw an error
      let callCount = 0;
      mockCheckMathHybrid.execute = vi.fn().mockImplementation(async (input) => {
        callCount++;
        if (input.statement === 'abc=xyz') {
          throw new Error('Invalid mathematical expression');
        }
        return {
          statement: input.statement,
          status: 'verified_true',
          explanation: `Verified ${input.statement}`,
          verifiedBy: 'mathjs',
          mathJsResult: { 
            status: 'verified_true',
            explanation: 'Correct calculation',
            computedValue: '4', 
            mathJsExpression: input.statement 
          },
          toolsUsed: ['mathjs']
        };
      });

      const result = await mathPlugin.analyze(chunks, documentText);

      // All three should be attempted
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledTimes(3);

      // The error shouldn't prevent other expressions from being processed
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: '2+2=4' }),
        expect.anything()
      );
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: 'abc=xyz' }),
        expect.anything()
      );
      expect(mockCheckMathHybrid.execute).toHaveBeenCalledWith(
        expect.objectContaining({ statement: '3+3=6' }),
        expect.anything()
      );

      // Result should still be generated despite one error
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Performance Comparison', () => {
    it('should demonstrate significant speedup with parallel execution', async () => {
      // Create many expressions to make the difference clear
      const expressions = Array.from({ length: 10 }, (_, i) => ({
        originalText: `${i}+${i}=${i*2}`,
        expression: `${i}+${i}`,
        expectedResult: `${i*2}`,
        complexityScore: 20 + i,
        contextImportanceScore: 50,
        errorSeverityScore: 30,
        hasError: false
      }));

      const chunk = new TextChunk(
        'chunk-1',
        expressions.map(e => e.originalText).join(', '),
        {
          position: { start: 0, end: 100 }
        }
      );

      const extractMathExpressionsTool = require('../../../tools/extract-math-expressions').extractMathExpressionsTool;
      extractMathExpressionsTool.execute = vi.fn().mockResolvedValue({ expressions });

      // Each check takes 50ms
      mockCheckMathHybrid.execute = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          statement: '0+0=0',
          status: 'verified_true',
          explanation: 'Verified',
          verifiedBy: 'mathjs',
          mathJsResult: { 
            status: 'verified_true',
            explanation: 'Correct calculation',
            computedValue: '0', 
            mathJsExpression: '0+0' 
          },
          toolsUsed: ['mathjs']
        };
      });

      const startTime = Date.now();
      await mathPlugin.analyze([chunk], chunk.text);
      const parallelTime = Date.now() - startTime;

      // With 10 expressions at 50ms each:
      // - Sequential would take 500ms minimum
      // - Parallel should take around 50-100ms (all run simultaneously)
      expect(parallelTime).toBeLessThan(200); // Much less than 500ms
      
      console.log(`Parallel execution of 10 expressions took ${parallelTime}ms`);
      console.log(`Sequential would have taken ~500ms minimum`);
      console.log(`Speedup: ~${Math.round(500/parallelTime)}x faster`);
    });
  });
});