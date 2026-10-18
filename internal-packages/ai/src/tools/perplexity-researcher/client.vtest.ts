import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerplexityClient } from './client';
import { callOpenRouterChat, callOpenRouterWithTool } from '../../utils/openrouter';

const fetchMock = vi.fn();
function mockCompletion() {
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(() => new Response(JSON.stringify({
    id: 'test', model: 'openai/gpt-6-luna',
    choices: [{ message: { role: 'assistant', content: '{"ok":true}',
      annotations: [{ type: 'url_citation', url_citation: { url: 'https://docs.python.org/', title: 'Python' } }],
      tool_calls: [{ function: { name: 'answer', arguments: '{"ok":true}' } }],
    }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.005011 },
  }), { status: 200 }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); fetchMock.mockReset(); });

function requestBody() { return JSON.parse(fetchMock.mock.calls.at(-1)![1].body); }

describe('OpenRouter research', () => {
  it('defaults to Luna with managed web search and preserves citations and reported search cost', async () => {
    mockCompletion();
    const result = await new PerplexityClient().query('Find Python documentation', { maxSources: 3 });
    expect(requestBody()).toMatchObject({ model: 'openai/gpt-6-luna', reasoning: { effort: 'low' },
      plugins: [{ id: 'web', engine: 'perplexity', max_results: 3 }] });
    expect(requestBody()).not.toHaveProperty('temperature');
    expect(result.usage?.cost).toBe(0.005011);
    expect(result.citations?.[0].url_citation.url).toBe('https://docs.python.org/');
  });

  it('uses the selected model and avoids adding a second search engine to Sonar', async () => {
    mockCompletion();
    await new PerplexityClient().query('Find sources', { model: 'google/gemini-4-argon' });
    expect(requestBody().model).toBe('google/gemini-4-argon');
    expect(requestBody().plugins).toHaveLength(1);
    await new PerplexityClient().query('Find sources', { model: 'perplexity/sonar-pro' });
    expect(requestBody().model).toBe('perplexity/sonar-pro');
    expect(requestBody()).not.toHaveProperty('plugins');
  });

  it('omits unsupported sampling parameters from Luna claim evaluations', async () => {
    mockCompletion();
    await callOpenRouterChat({ model: 'openai/gpt-6-luna', messages: [{ role: 'user', content: 'JSON please' }], temperature: 0.7, reasoningEffort: 'low' });
    expect(requestBody()).not.toHaveProperty('temperature');
    expect(requestBody().reasoning).toEqual({ effort: 'low' });
  });

  it('uses auto tool choice for Sonnet 5.5 through OpenRouter', async () => {
    mockCompletion();
    const result = await callOpenRouterWithTool({ model: 'anthropic/claude-sonnet-5.5', system: 'Test', messages: [], toolName: 'answer', toolDescription: 'Return answer', toolSchema: {}, temperature: 0.3 });
    expect(requestBody().tool_choice).toBe('auto');
    expect(requestBody()).not.toHaveProperty('temperature');
    expect(result.toolResult).toEqual({ ok: true });
  });
});

it('retains cited sources when a research model returns prose instead of JSON', async () => {
  const { PerplexityResearchTool } = await import('./index');
  mockCompletion();
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: 'Python was released on October 7, 2024. See [release](https://www.python.org/downloads/release/python-3130/).',
      annotations: [{ type: 'url_citation', url_citation: { title: 'Python 3.13.0', url: 'https://www.python.org/downloads/release/python-3130/' } }],
    } }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.005 },
  }), { status: 200 })));
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const result = await new PerplexityResearchTool().execute({ query: 'Find Python release date' }, { logger });
  expect(requestBody().response_format).toEqual({ type: 'json_object' });
  expect(result.sources[0].url).toBe('https://www.python.org/downloads/release/python-3130/');
  expect(result.keyFindings).toEqual([]);
  expect(result.costUsd).toBe(0.005);
});
