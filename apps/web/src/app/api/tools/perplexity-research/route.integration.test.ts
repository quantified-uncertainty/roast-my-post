import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the Perplexity client
jest.mock('@/tools/perplexity-research/client', () => ({
  PerplexityClient: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: 'Test summary',
        keyFindings: ['Finding 1', 'Finding 2'],
        sources: [
          { title: 'Source 1', url: 'https://example.com', snippet: 'Test snippet' }
        ]
      }),
      usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
    })
  }))
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock authentication 
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn().mockResolvedValue('test-user-id')
}));

describe('Perplexity Research API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.HELICONE_API_KEY = 'test-helicone-key';
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.HELICONE_API_KEY;
  });

  it('should handle research request successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-research', {
      method: 'POST',
      body: JSON.stringify({
        query: 'What are the latest AI developments?'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('toolId', 'perplexity-research');
    expect(data).toHaveProperty('result');
    expect(data.result).toHaveProperty('summary', 'Test summary');
    expect(data.result).toHaveProperty('keyFindings');
    expect(data.result.keyFindings).toHaveLength(2);
    expect(data.result).toHaveProperty('sources');
    expect(data.result.sources).toHaveLength(1);
  });

  it('should handle validation errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-research', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required query field
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Invalid input');
  });
});