// Jest integration test file
import { MathAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';
// Test file uses real tool integration - no mocking needed for this import
import { extractMathExpressionsTool } from '../../../tools/extract-math-expressions';

// Skip these tests in CI or when no API key is available
const describeIfApiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '' ? describe : describe.skip;

describeIfApiKey('MathAnalyzerJob Integration', () => {
  it('should analyze a document with mathematical expressions', async () => {
    const documentText = `
# Investment Analysis

If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years.

This is calculated using the compound interest formula: A = P(1 + r)^t

Where:
- A = Final amount ($19,672)
- P = Principal ($10,000)
- r = Annual rate (7% = 0.07)
- t = Time in years (10)

Let's verify: $10,000 × (1.07)^10 = $10,000 × 1.9672 = $19,672 ✓

However, if we made an error and said: $10,000 × (1.07)^10 = $25,000, that would be incorrect.

The population grew by 15% over the last decade, from 1.2M to 1.38M.
Let's check: 1.2M × 1.15 = 1.38M ✓
`;

    const chunks = [
      new TextChunk(
        'If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years.',
        'chunk1',
        { position: { start: 0, end: 91 } }
      ),
      new TextChunk(
        'This is calculated using the compound interest formula: A = P(1 + r)^t',
        'chunk2',
        { position: { start: 93, end: 163 } }
      ),
      new TextChunk(
        "Let's verify: $10,000 × (1.07)^10 = $10,000 × 1.9672 = $19,672 ✓",
        'chunk3',
        { position: { start: 253, end: 319 } }
      ),
      new TextChunk(
        'However, if we made an error and said: $10,000 × (1.07)^10 = $25,000, that would be incorrect.',
        'chunk4',
        { position: { start: 321, end: 416 } }
      ),
      new TextChunk(
        'The population grew by 15% over the last decade, from 1.2M to 1.38M.',
        'chunk5',
        { position: { start: 418, end: 487 } }
      ),
      new TextChunk(
        "Let's check: 1.2M × 1.15 = 1.38M ✓",
        'chunk6',
        { position: { start: 488, end: 523 } }
      ),
    ];

    const analyzer = new MathAnalyzerJob();
    const result = await analyzer.analyze(chunks, documentText);

    // Verify results structure
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('llmInteractions');
    expect(result).toHaveProperty('cost');

    // Should find mathematical expressions
    expect(result.summary).toMatch(/mathematical expression/);
    
    // Should identify the error
    expect(result.comments.some(c => 
      (c.description || '').includes('25,000') || 
      (c.description || '').includes('error')
    )).toBe(true);

    // Analysis should mention both correct and incorrect calculations
    expect(result.analysis).toBeTruthy();
    expect(result.analysis.length).toBeGreaterThan(100);
  });

  it('should handle a document with complex mathematical content', async () => {
    const documentText = `
# Statistical Analysis

The standard deviation formula is: σ = √(Σ(x - μ)²/N)

For our dataset [2, 4, 6, 8, 10]:
- Mean (μ) = (2+4+6+8+10)/5 = 30/5 = 6
- Variance = [(2-6)² + (4-6)² + (6-6)² + (8-6)² + (10-6)²]/5
- Variance = [16 + 4 + 0 + 4 + 16]/5 = 40/5 = 8
- Standard deviation = √8 ≈ 2.83

If someone incorrectly calculated the mean as 5 instead of 6, 
they would get: σ = √((9+1+1+9+25)/5) = √9 = 3, which is wrong.
`;

    const chunks = [
      new TextChunk(
        'The standard deviation formula is: σ = √(Σ(x - μ)²/N)',
        'chunk1',
        { position: { start: 25, end: 79 } }
      ),
      new TextChunk(
        'Mean (μ) = (2+4+6+8+10)/5 = 30/5 = 6',
        'chunk2',
        { position: { start: 110, end: 147 } }
      ),
      new TextChunk(
        'Variance = [(2-6)² + (4-6)² + (6-6)² + (8-6)² + (10-6)²]/5',
        'chunk3',
        { position: { start: 150, end: 209 } }
      ),
      new TextChunk(
        'Variance = [16 + 4 + 0 + 4 + 16]/5 = 40/5 = 8',
        'chunk4',
        { position: { start: 212, end: 258 } }
      ),
      new TextChunk(
        'Standard deviation = √8 ≈ 2.83',
        'chunk5',
        { position: { start: 261, end: 291 } }
      ),
      new TextChunk(
        'If someone incorrectly calculated the mean as 5 instead of 6, they would get: σ = √((9+1+1+9+25)/5) = √9 = 3, which is wrong.',
        'chunk6',
        { position: { start: 294, end: 421 } }
      ),
    ];

    const analyzer = new MathAnalyzerJob();
    const result = await analyzer.analyze(chunks, documentText);

    // Should identify complex calculations
    expect(result.summary).toMatch(/mathematical expression/);
    
    // Should recognize the statistical content
    expect(result.analysis).toMatch(/statistic|standard deviation|variance/i);

    // Debug info should show processing
    const debugInfo = analyzer.getDebugInfo();
    expect(debugInfo.hasRun).toBe(true);
    expect(debugInfo.expressionsCount).toBeGreaterThan(0);
  });
});