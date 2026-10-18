import { describe, expect, it, vi } from 'vitest';
import { AgenticPlugin } from './index';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('@anthropic-ai/claude-agent-sdk', async importOriginal => ({
  ...await importOriginal<typeof import('@anthropic-ai/claude-agent-sdk')>(), query: queryMock,
}));
vi.mock('./profile-loader', async () => {
  const { createDefaultAgenticConfig } = await import('./profile-types');
  return { loadAgenticProfileOrDefault: async () => ({ ...createDefaultAgenticConfig(), enableSubAgents: true,
    subAgents: { 'fact-checker': { enabled: true, model: 'claude-sonnet-5-5' } } }) };
});

interface AgentSnapshot {
  agentName: string;
  status: string;
  completedAt?: string;
}

interface AgentTelemetry {
  subAgents: AgentSnapshot[];
}

describe('current SDK Agent delegation', () => {
  it.each([false, true])('finishes telemetry when a foreground Agent returns (is_error=%s)', async isError => {
    queryMock.mockImplementation(async function* () {
      yield { type: 'system', subtype: 'init', model: 'claude-sonnet-5-5', tools: ['Agent'] };
      yield { type: 'assistant', parent_tool_use_id: null, message: { content: [
        { type: 'tool_use', id: 'delegate-1', name: 'Agent', input: { subagent_type: 'fact-checker' } },
      ] } };
      yield { type: 'user', parent_tool_use_id: null, message: { content: [
        { type: 'tool_result', tool_use_id: 'delegate-1', content: 'Agent finished', is_error: isError },
      ] } };
      yield { type: 'result', subtype: 'success', total_cost_usd: 0.01, num_turns: 2,
        structured_output: { findings: [], summary: 'Complete', analysis: 'Complete', overallGrade: 100 } };
    });
    const plugin = new AgenticPlugin();
    await plugin.analyze([], 'A short test document.');
    const telemetry = plugin.getTelemetry() as unknown as AgentTelemetry;
    expect(telemetry.subAgents).toHaveLength(1);
    expect(telemetry.subAgents[0]).toMatchObject({ agentName: 'fact-checker', status: isError ? 'failed' : 'completed' });
    expect(telemetry.subAgents[0].completedAt).toBeDefined();
  });
});
