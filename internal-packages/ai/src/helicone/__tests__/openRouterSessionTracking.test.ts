// jest globals are available by default
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getCurrentHeliconeHeaders 
} from '../simpleSessionManager';
import { PerplexityClient } from '../../tools/perplexity-research/client';

// Mock OpenAI to capture API calls with headers
const mockOpenAICreate = jest.fn();
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    }))
  };
});

// Track API calls with headers
interface OpenRouterCall {
  model: string;
  headers: Record<string, string>;
  sessionId: string;
  path: string;
}

describe('OpenRouter Session Tracking', () => {
  let capturedCalls: OpenRouterCall[] = [];
  
  beforeEach(() => {
    setGlobalSessionManager(undefined);
    capturedCalls = [];
    
    // Mock OpenAI create to capture headers
    mockOpenAICreate.mockImplementation(async (params: any, options: any) => {
      const headers = options?.headers || {};
      capturedCalls.push({
        model: params.model,
        headers: { ...headers },
        sessionId: headers['Helicone-Session-Id'] || 'unknown',
        path: headers['Helicone-Session-Path'] || '/'
      });
      
      return {
        choices: [{
          message: {
            content: 'Mock response'
          }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };
    });
    
    // Set up environment variables for tests
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.HELICONE_API_KEY = 'test-helicone';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.HELICONE_API_KEY;
  });

  test('PerplexityClient passes session headers to OpenRouter API calls', async () => {
    
    // Set up session manager
    const sessionManager = HeliconeSessionManager.forJob(
      'test-session-123',
      'Test Session',
      { JobId: 'test-session-123', AgentId: 'test-agent' }
    );
    
    setGlobalSessionManager(sessionManager);
    
    // Test within a session hierarchy
    await sessionManager.trackAnalysis('document', async () => {
      await sessionManager.withPath('/plugins', undefined, async () => {
        await sessionManager.trackTool('fact-checker', async () => {
          // Log the current path for debugging
          const currentHeaders = getCurrentHeliconeHeaders();
          console.log('Current session path:', currentHeaders['Helicone-Session-Path']);
          
          // Create PerplexityClient and make a query
          const client = new PerplexityClient();
          await client.query('Test research query', {
            model: 'perplexity/sonar',
            maxTokens: 500
          });
        });
      });
    });
    
    // Verify API call was made
    expect(capturedCalls.length).toBe(1);
    
    const call = capturedCalls[0];
    
    // Verify basic call structure
    expect(call.model).toBe('perplexity/sonar');
    expect(call.sessionId).toBe('test-session-123');
    expect(call.path).toBe('/plugins/tools/fact-checker');
    
    // Verify session headers are present
    expect(call.headers['Helicone-Session-Id']).toBe('test-session-123');
    expect(call.headers['Helicone-Session-Path']).toBe('/plugins/tools/fact-checker');
    expect(call.headers['Helicone-Session-Name']).toBe('Test Session');
    expect(call.headers['Helicone-Property-JobId']).toBe('test-session-123');
    expect(call.headers['Helicone-Property-AgentId']).toBe('test-agent');
    
    console.log('OpenRouter call with session headers:', {
      model: call.model,
      sessionId: call.sessionId,
      path: call.path,
      hasHeliconeHeaders: Object.keys(call.headers).filter(k => k.startsWith('Helicone-')).length > 0
    });
  });

  test('PerplexityClient works without session manager', async () => {
    
    // No session manager set
    setGlobalSessionManager(undefined);
    
    const client = new PerplexityClient();
    await client.query('Test query without session');
    
    expect(capturedCalls.length).toBe(1);
    
    const call = capturedCalls[0];
    expect(call.sessionId).toBe('unknown');
    expect(call.path).toBe('/');
    expect(call.headers['Helicone-Session-Id']).toBeUndefined();
  });

  test('verifies getCurrentHeliconeHeaders integration', async () => {
    const sessionManager = HeliconeSessionManager.forJob(
      'header-test-456',
      'Header Test',
      { JobId: 'header-test-456' }
    );
    
    setGlobalSessionManager(sessionManager);
    
    await sessionManager.trackAnalysis('document', async () => {
      await sessionManager.trackTool('perplexity-research', async () => {
        // Verify getCurrentHeliconeHeaders returns the right data
        const headers = getCurrentHeliconeHeaders();
        
        expect(headers['Helicone-Session-Id']).toBe('header-test-456');
        expect(headers['Helicone-Session-Path']).toBe('/analysis/document/tools/perplexity-research');
        expect(headers['Helicone-Session-Name']).toBe('Header Test');
        expect(headers['Helicone-Property-JobId']).toBe('header-test-456');
        
        // Simulate what PerplexityClient does - get headers and pass to API
        const client = new PerplexityClient();
        await client.query('Test with headers');
      });
    });
    
    expect(capturedCalls.length).toBe(1);
    const call = capturedCalls[0];
    expect(call.headers['Helicone-Session-Path']).toBe('/analysis/document/tools/perplexity-research');
  });
});