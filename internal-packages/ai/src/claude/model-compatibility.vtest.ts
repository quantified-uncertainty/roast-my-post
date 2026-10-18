import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callClaudeWithTool } from './wrapper';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('../utils/anthropic', () => ({ createAnthropicClient: () => ({ messages: { create } }) }));

beforeEach(() => {
  create.mockResolvedValue({
    id: 'test', model: 'test', content: [{ type: 'tool_use', id: 'tool', name: 'answer', input: { value: 4 } }],
    stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 10 },
  });
});

const toolOptions = {
  messages: [{ role: 'user' as const, content: 'What is 2 + 2?' }],
  toolName: 'answer', toolDescription: 'Return the answer',
  toolSchema: { type: 'object' as const, properties: { value: { type: 'number' } }, required: ['value'] },
  max_tokens: 4000, temperature: 0.3,
};

describe('Claude request compatibility', () => {
  it('uses auto tools and between-tools thinking on Sonnet 5.5 without sampling parameters', async () => {
    const result = await callClaudeWithTool({ ...toolOptions, model: 'claude-sonnet-5-5', thinking: false });
    const body = create.mock.calls.at(-1)![0];
    expect(body).not.toHaveProperty('temperature');
    expect(body.thinking).toEqual({ type: 'between_tools' });
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(result.toolResult).toEqual({ value: 4 });
  });

  it('translates manual budgets into adaptive effort without increasing the output ceiling', async () => {
    const result = await callClaudeWithTool({ ...toolOptions, model: 'claude-sonnet-5-5', thinking: { type: 'enabled', budget_tokens: 32768 } });
    const body = create.mock.calls.at(-1)![0];
    expect(body.thinking).toEqual({ type: 'adaptive' });
    expect(body.output_config).toEqual({ effort: 'high' });
    expect(body.max_tokens).toBe(4000);
    expect(result.actualParams.temperature).toBeUndefined();
    expect(result.actualParams.outputConfig).toEqual({ effort: 'high' });
  });

  it('preserves an explicit low effort setting even when a legacy resolver supplied a large budget', async () => {
    await callClaudeWithTool({ ...toolOptions, model: 'claude-sonnet-5-5', thinking: { type: 'enabled', budget_tokens: 38400 }, reasoningEffort: 'low' });
    expect(create.mock.calls.at(-1)![0].output_config).toEqual({ effort: 'low' });
  });

  it('keeps forced tool calls available on Haiku 5.5 with thinking disabled', async () => {
    await callClaudeWithTool({ ...toolOptions, model: 'claude-haiku-5-5', thinking: false });
    const body = create.mock.calls.at(-1)![0];
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'answer' });
    expect(body).not.toHaveProperty('temperature');
  });

  it.each([undefined, false])('omits unsupported Opus modes with thinking=%s', async thinking => {
    await callClaudeWithTool({ ...toolOptions, model: 'claude-opus-5-5', thinking });
    const body = create.mock.calls.at(-1)![0];
    expect(body).not.toHaveProperty('thinking');
    expect(body.output_config).toEqual({ effort: 'low' });
    expect(body.tool_choice).toEqual({ type: 'auto' });
  });

  it.each(['claude-sonnet-5-5', 'claude-haiku-5-5'])('honors explicit none effort on %s', async model => {
    await callClaudeWithTool({ ...toolOptions, model, thinking: true, reasoningEffort: 'none' });
    const body = create.mock.calls.at(-1)![0];
    expect(body.thinking).toEqual({ type: model.includes('sonnet') ? 'between_tools' : 'disabled' });
    expect(body).not.toHaveProperty('output_config');
  });

  it('preserves legacy model request behavior for explicitly pinned callers', async () => {
    await callClaudeWithTool({ ...toolOptions, model: 'claude-sonnet-4-5-20250929', thinking: { type: 'enabled', budget_tokens: 8192 } });
    const body = create.mock.calls.at(-1)![0];
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 8192 });
    expect(body.temperature).toBe(1);
    expect(body.max_tokens).toBe(9192);
  });
});
