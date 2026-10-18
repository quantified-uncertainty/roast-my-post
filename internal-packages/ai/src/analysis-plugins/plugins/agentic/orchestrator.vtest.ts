import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAgenticQueryOptions } from "./orchestrator";
import { createDefaultAgenticConfig } from "./profile-types";

const evaluationServer = createSdkMcpServer({ name: "sandbox-config-test", tools: [] });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([false, true])("agentic sandbox with subagents=%s", (enableSubAgents) => {
  const config = { ...createDefaultAgenticConfig(), enableSubAgents };

  it("keeps the SDK sandbox enabled by default", () => {
    vi.stubEnv("AGENTIC_SANDBOX_ENABLED", undefined);

    const options = buildAgenticQueryOptions(config, evaluationServer, "/tmp/agentic-test");

    expect(options.sandbox).toEqual({ enabled: true, allowUnsandboxedCommands: false });
  });

  it("disables the inner sandbox when the worker image opts out", () => {
    vi.stubEnv("AGENTIC_SANDBOX_ENABLED", "false");

    const options = buildAgenticQueryOptions(config, evaluationServer, "/tmp/agentic-test");

    expect(options.sandbox?.enabled).toBe(false);
    expect(options.cwd).toBe("/tmp/agentic-test");
    expect(options.canUseTool).toBeTypeOf("function");
  });

  it("does not opt out for an unrecognized setting", () => {
    vi.stubEnv("AGENTIC_SANDBOX_ENABLED", "0");

    const options = buildAgenticQueryOptions(config, evaluationServer, "/tmp/agentic-test");

    expect(options.sandbox).toEqual({ enabled: true, allowUnsandboxedCommands: false });
  });
});

it('retains explicit model IDs, prompts, and disabled agents from a multi-agent profile', async () => {
  const { validateAgenticConfig } = await import('./profile-types');
  const config = validateAgenticConfig({
    ...createDefaultAgenticConfig(), version: 2, enableSubAgents: true,
    model: 'claude-sonnet-5-5', researchModel: 'google/gemini-4-argon', maxThinkingTokens: 8192,
    subAgents: {
      'fact-checker': { enabled: true, model: 'claude-sonnet-5-5', prompt: 'Custom fact-check instructions' },
      'clarity-checker': { enabled: false, model: 'claude-haiku-5-5' },
      'math-checker': { enabled: false, model: 'claude-sonnet-5-5' },
    },
  });
  const options = buildAgenticQueryOptions(config, evaluationServer);
  expect(config.researchModel).toBe('google/gemini-4-argon');
  expect(options.agents?.['fact-checker']).toMatchObject({ model: 'claude-sonnet-5-5', prompt: 'Custom fact-check instructions' });
  expect(Object.keys(options.agents ?? {})).toEqual(['fact-checker']);
  expect(options.allowedTools).toContain('Agent');
  expect(options.thinking).toEqual({ type: 'adaptive' });
  expect(options.effort).toBe('medium');
  expect(options).not.toHaveProperty('maxThinkingTokens');
});
