import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock the perplexity research tool
jest.mock('@roast/ai/server', () => ({
  perplexityResearchTool: {
    config: {
      name: 'perplexity-research',
      description: 'Research using Perplexity'
    },
    execute: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      keyFindings: ['Finding 1', 'Finding 2'],
      sources: [
        { title: 'Source 1', url: 'https://example.com', snippet: 'Test snippet' }
      ]
    })
  }
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
    expect(data).toHaveProperty('result');
    expect(data.result).toHaveProperty('summary', 'Test summary');
    expect(data.result).toHaveProperty('keyFindings');
    expect(data.result.keyFindings).toHaveLength(2);
    expect(data.result).toHaveProperty('sources');
    expect(data.result.sources).toHaveLength(1);
  });

  it('should handle authentication failures', async () => {
    // Override auth mock for this test
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-research', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Test query'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error', 'Not authenticated');
  });

  it('should handle tool execution errors', async () => {
    // Override tool mock for this test
    const { perplexityResearchTool } = require('@roast/ai/server');
    perplexityResearchTool.execute.mockRejectedValueOnce(new Error('API request failed'));

    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-research', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Test query'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error', 'API request failed');
  });
});