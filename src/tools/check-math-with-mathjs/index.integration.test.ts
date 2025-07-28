import { checkMathWithMathJsTool } from './index';
import { ToolContext } from '../base/Tool';

// Mock logger that matches the Logger interface
const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  isDevelopment: false,
  log: jest.fn(),
  logRequest: jest.fn(),
  logResponse: jest.fn(),
  child: jest.fn(() => createMockLogger())
});

describe('CheckMathWithMathJsTool Integration Tests', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      logger: createMockLogger()
    };
  });

  describe('Early symbolic math detection', () => {
    it('should quickly return cannot_verify for derivative statements', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "The derivative of x³ is 3x²"
      }, mockContext);

      expect(result.status).toBe('cannot_verify');
      expect(result.explanation).toBe('Cannot verify symbolic math. MathJS only handles numerical computations.');
      expect(result.llmInteraction.tokensUsed.total).toBe(0); // No LLM call made
    });

    it('should detect various symbolic math keywords', async () => {
      const symbolicStatements = [
        "The integral of sin(x) is -cos(x)",
        "Prove that (a+b)² = a² + 2ab + b²",
        "The limit as x approaches 0 of sin(x)/x is 1",
        "Simplify the expression x² + 2x + 1",
        "d/dx(e^x) = e^x"
      ];

      for (const statement of symbolicStatements) {
        const result = await checkMathWithMathJsTool.execute({ statement }, mockContext);
        expect(result.status).toBe('cannot_verify');
        expect(result.explanation).toBe('Cannot verify symbolic math. MathJS only handles numerical computations.');
      }
    });
  });

  describe('Numerical verification with concise explanations', () => {
    it('should verify simple arithmetic with brief explanation', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "2 + 2 = 4"
      }, mockContext);

      expect(result.status).toBe('verified_true');
      expect(result.explanation.length).toBeLessThan(100); // Ensure explanation is concise
      expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
    }, 30000);

    it('should detect errors with brief explanation', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "10% of 50 is 10"
      }, mockContext);

      expect(result.status).toBe('verified_false');
      expect(result.explanation).toContain('5');
      expect(result.explanation.length).toBeLessThan(100);
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.conciseCorrection).toBe('10 → 5');
    }, 30000);

    it('should handle unit conversions with rounding tolerance', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "Converting 100 fahrenheit to celsius gives 37.78 degrees"
      }, mockContext);

      // Should accept reasonable rounding
      expect(result.status).toBe('verified_true');
      expect(result.explanation).toContain('rounding');
    }, 30000);

    it('should handle percentages correctly', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "30% equals 0.3"
      }, mockContext);

      expect(result.status).toBe('verified_true');
      expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
    }, 30000);
  });

  describe('Tool calls tracking', () => {
    it('should track tool calls made during verification', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "5 factorial equals 120"
      }, mockContext);

      expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(50); // Should have detailed reasoning
    }, 30000);
  });

  describe('Complex expressions', () => {
    it('should handle binomial coefficients', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: 'The binomial coefficient "10 choose 3" equals 120'
      }, mockContext);

      expect(result.status).toBe('verified_true');
      expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
    }, 30000);

    it('should handle unit operations', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "5 kilometers plus 3000 meters equals 8 kilometers"
      }, mockContext);

      expect(result.status).toBe('verified_true');
    }, 30000);
  });

  describe('Error handling', () => {
    it('should handle malformed expressions gracefully', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "2 + + 3 = 5"
      }, mockContext);

      expect(['verified_false', 'cannot_verify']).toContain(result.status);
      expect(result.explanation).toBeTruthy();
    }, 30000);

    it('should handle incomplete statements', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: "0.736 % ... So the risk is 0.00202 %"
      }, mockContext);

      expect(result.status).toBe('cannot_verify');
      expect(result.explanation).toContain('incomplete');
    }, 30000);
  });

  describe('Session management', () => {
    it('should create unique sessions for each execution', async () => {
      // Execute twice and check logs for different session IDs
      await checkMathWithMathJsTool.execute({
        statement: "1 + 1 = 2"
      }, mockContext);
      
      const firstSessionCall = (mockContext.logger.info as jest.Mock).mock.calls
        .find(call => call[0].includes('Created new session'));
      
      await checkMathWithMathJsTool.execute({
        statement: "2 + 2 = 4"
      }, mockContext);
      
      const secondSessionCall = (mockContext.logger.info as jest.Mock).mock.calls
        .filter(call => call[0].includes('Created new session'))
        .pop();
      
      expect(firstSessionCall).toBeTruthy();
      expect(secondSessionCall).toBeTruthy();
      expect(firstSessionCall[0]).not.toBe(secondSessionCall[0]);
    }, 30000);
  });
});