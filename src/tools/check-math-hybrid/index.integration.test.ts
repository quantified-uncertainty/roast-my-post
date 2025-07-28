import { checkMathHybridTool } from './index';
import { checkMathWithMathJsTool } from '../check-math-with-mathjs';
import { checkMathTool } from '../check-math';

describe('CheckMathHybridTool Integration Tests', () => {
  const mockContext = {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hybrid tool routing', () => {
    it('should use MathJS for simple calculations', async () => {
      const result = await checkMathHybridTool.execute({
        statement: '2 + 2 = 4'
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
      expect(result.verifiedBy).toBe('mathjs');
      expect(result.toolsUsed).toEqual(['mathjs']);
    });

    it('should fall back to LLM for conceptual statements', async () => {
      const result = await checkMathHybridTool.execute({
        statement: 'The probability of rolling a six on a fair die is 1/6'
      }, mockContext);
      
      expect(['verified_true', 'cannot_verify']).toContain(result.status);
      expect(result.toolsUsed).toContain('llm');
    });
  });

  describe('Performance comparison', () => {
    it('should be faster for MathJS-compatible expressions', async () => {
      const mathJsStart = Date.now();
      const mathJsResult = await checkMathHybridTool.execute({
        statement: '100 * 25 = 2500'
      }, mockContext);
      const mathJsDuration = Date.now() - mathJsStart;
      
      const llmStart = Date.now();
      const llmResult = await checkMathHybridTool.execute({
        statement: 'The mortality rate increased by a factor of 2.5'
      }, mockContext);
      const llmDuration = Date.now() - llmStart;
      
      expect(mathJsResult.verifiedBy).toBe('mathjs');
      expect(llmResult.verifiedBy).toBe('llm');
      expect(mathJsDuration).toBeLessThan(llmDuration);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle mortality statistics from the original timeout case', async () => {
      const statements = [
        '0.736 % ... So the risk of death in 2019 was 0.00202 % per person-day',
        'Multiplying this by the above risk of death in 2019, I infer consuming SSBs increases the risk of death by 3.39*10^-7 per 100 mL'
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(
        statements.map(statement => 
          checkMathHybridTool.execute({ statement }, mockContext)
        )
      );
      const totalDuration = Date.now() - startTime;
      
      // Should complete both in reasonable time (not 60+ seconds)
      expect(totalDuration).toBeLessThan(15000); // 15 seconds for both
      expect(results).toHaveLength(2);
      expect(results[0].status).toBeDefined();
      expect(results[1].status).toBeDefined();
    });

    it('should handle scientific papers with multiple calculations', async () => {
      const scientificStatements = [
        'The sample size n = 1000 gives a margin of error of ±3.1%',
        'p-value = 0.0023 < 0.05, therefore the result is statistically significant',
        'Effect size d = 0.45 indicates a medium effect',
        'The 95% confidence interval is [0.23, 0.67]',
        'Power analysis shows β = 0.80 for detecting this effect'
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(
        scientificStatements.map(statement => 
          checkMathHybridTool.execute({ statement }, mockContext)
        )
      );
      const totalDuration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(totalDuration).toBeLessThan(30000); // Should handle all 5 in under 30 seconds
      
      // Most should be verified or marked as cannot_verify
      const statuses = results.map(r => r.status);
      expect(statuses.filter(s => s !== 'verified_false').length).toBeGreaterThan(3);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle timeout gracefully', async () => {
      // This is a complex statement that might take longer
      const result = await checkMathHybridTool.execute({
        statement: 'The integral of x^2 from 0 to infinity diverges'
      }, mockContext);
      
      expect(result.status).toBeDefined();
      expect(['verified_true', 'cannot_verify']).toContain(result.status);
    });

    it('should handle malformed mathematical notation', async () => {
      const malformedStatements = [
        '2 ++ 3 = 5',
        '((( 5 + 3 = 8',
        '10 / 0 = infinity',
        'sqrt(-1) = i'
      ];
      
      const results = await Promise.all(
        malformedStatements.map(statement => 
          checkMathHybridTool.execute({ statement }, mockContext)
        )
      );
      
      // Should handle all without crashing
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.status).toBeDefined();
        expect(result.explanation).toBeDefined();
      });
    });
  });

  describe('Concise correction generation', () => {
    it('should provide concise corrections from MathJS', async () => {
      const result = await checkMathHybridTool.execute({
        statement: '7 * 8 = 54'
      }, mockContext);
      
      expect(result.status).toBe('verified_false');
      expect(result.conciseCorrection).toBe('54 → 56');
    });

    it('should provide corrections from LLM when needed', async () => {
      const result = await checkMathHybridTool.execute({
        statement: 'The probability of getting heads twice in a row is 0.75'
      }, mockContext);
      
      if (result.status === 'verified_false') {
        expect(result.conciseCorrection).toBeDefined();
        expect(result.conciseCorrection).toContain('0.25');
      }
    });
  });

  describe('Stress test with document simulation', () => {
    it('should handle a document with 20+ mathematical statements', async () => {
      // Simulate processing many statements from a technical document
      const documentStatements = [
        // Basic arithmetic
        '2 + 2 = 4',
        '10 - 3 = 7',
        '5 * 6 = 30',
        '20 / 4 = 5',
        
        // Percentages
        '25% of 80 is 20',
        '10% increase from 100 is 110',
        
        // Scientific notation
        '1.5 * 10^3 = 1500',
        '3.2 * 10^-2 = 0.032',
        
        // Statistics
        'Mean of [1, 2, 3, 4, 5] is 3',
        'Standard deviation is approximately 1.58',
        
        // Complex expressions
        'sqrt(144) + 3^2 = 21',
        '(5 + 3) * (10 - 2) = 64',
        
        // Word problems
        'Five dozen eggs equals 60 eggs',
        'Half of 30 plus 10 equals 25',
        
        // Units
        '1 mile equals 1.609 kilometers',
        '0°C equals 32°F',
        
        // Conceptual
        'The probability sum equals 1',
        'The derivative of x^2 is 2x',
        
        // Errors to catch
        '2 + 2 = 5',
        '10% of 50 is 10'
      ];
      
      const startTime = Date.now();
      
      // Process in batches to simulate plugin behavior
      const batchSize = 5;
      const results = [];
      
      for (let i = 0; i < documentStatements.length; i += batchSize) {
        const batch = documentStatements.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(statement => 
            checkMathHybridTool.execute({ statement }, mockContext)
          )
        );
        results.push(...batchResults);
      }
      
      const totalDuration = Date.now() - startTime;
      
      expect(results).toHaveLength(20);
      expect(totalDuration).toBeLessThan(60000); // Should complete in under 60 seconds
      
      // Check that we caught the intentional errors
      const lastTwoResults = results.slice(-2);
      expect(lastTwoResults[0].status).toBe('verified_false'); // 2 + 2 = 5
      expect(lastTwoResults[1].status).toBe('verified_false'); // 10% of 50 is 10
      
      // Most others should be verified true
      const trueCount = results.filter(r => r.status === 'verified_true').length;
      expect(trueCount).toBeGreaterThan(15);
      
      // Log performance stats
      const mathJsCount = results.filter(r => r.verifiedBy === 'mathjs').length;
      const llmCount = results.filter(r => r.verifiedBy === 'llm').length;
      console.log(`Performance: ${mathJsCount} MathJS, ${llmCount} LLM, Total time: ${totalDuration}ms`);
    });
  });
});