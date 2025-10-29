import { vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { auth } from '@/infrastructure/auth/auth';
import { toolRegistry } from '@roast/ai/server';

// Mock the auth module
vi.mock('@/infrastructure/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock Helicone cost tracking
vi.mock('@roast/ai', async () => {
  const actual = await vi.importActual('@roast/ai');
  return {
    ...actual,
    fetchJobCostWithRetry: vi.fn().mockResolvedValue(null),
    HeliconeSessionManager: {
      forJob: vi.fn().mockReturnValue({
        getHeaders: vi.fn().mockReturnValue({}),
        generateRequestId: vi.fn().mockReturnValue('test-request-id')
      })
    },
    setGlobalSessionManager: vi.fn()
  };
});

// Mock the perplexity research tool
const mockPerplexityTool = {
  config: {
    name: 'perplexity-research',
    description: 'Research using Perplexity',
    id: 'perplexity-researcher'
  },
  execute: vi.fn().mockResolvedValue({
    summary: 'Test summary',
    keyFindings: ['Finding 1', 'Finding 2'],
    sources: [
      { title: 'Source 1', url: 'https://example.com', snippet: 'Test snippet' }
    ]
  })
};

vi.mock('@roast/ai/server', async () => {
  const actual = await vi.importActual('@roast/ai/server');
  return {
    ...actual,
    toolRegistry: {
      get: vi.fn((id: string) => {
        if (id === 'perplexity-researcher') {
          return mockPerplexityTool;
        }
        return undefined;
      }),
      getMetadata: vi.fn(),
      getAll: vi.fn(),
      getByCategory: vi.fn()
    },
    perplexityResearchTool: mockPerplexityTool
  };
});

// Mock the logger
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Perplexity Research API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.HELICONE_API_KEY = 'test-helicone-key';
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.HELICONE_API_KEY;
  });

  it('should handle research request successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-researcher', {
      method: 'POST',
      body: JSON.stringify({
        query: 'What are the latest AI developments?'
      })
    });

    const responsePromise = POST(request, {
      params: Promise.resolve({ id: 'perplexity-researcher' })
    });

    // Fast-forward through the 5-second delay
    await vi.advanceTimersByTimeAsync(5000);

    const response = await responsePromise;
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
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-researcher', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Test query'
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'perplexity-researcher' })
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error', 'Not authenticated');
  });

  it('should handle tool execution errors', async () => {
    // Override tool mock for this test
    vi.mocked(mockPerplexityTool.execute).mockRejectedValueOnce(new Error('API request failed'));

    const request = new NextRequest('http://localhost:3000/api/tools/perplexity-researcher', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Test query'
      })
    });

    const responsePromise = POST(request, {
      params: Promise.resolve({ id: 'perplexity-researcher' })
    });

    // Fast-forward through any timers
    await vi.advanceTimersByTimeAsync(5000);

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error', 'API request failed');
  });
});

