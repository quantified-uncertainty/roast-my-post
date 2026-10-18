import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAgenticQueryOptions } from "./orchestrator";
import { createDefaultAgenticConfig } from "./profile-types";
import { createEvaluationServer } from "./tools";

const evaluationServer = createSdkMcpServer({ name: "sandbox-config-test", tools: [] });

afterEach(() => {
  vi.unstubAllEnvs();
});

it("exposes the evaluation tools and nested schemas through the upgraded SDK", async () => {
  const server = createEvaluationServer();
  const client = new Client({ name: "sdk-compatibility-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.instance.connect(serverTransport);
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([
      "fallacy_charity_filter", "fallacy_extract", "fallacy_supported_elsewhere",
      "forecast_check", "math_check", "perplexity_research", "spell_check", "web_fetch",
    ]);
    expect(tools.find(tool => tool.name === "fallacy_charity_filter")?.inputSchema).toMatchObject({
      properties: {
        documentText: { type: "string" },
        issues: { type: "array", items: { properties: { quotedText: { type: "string" } } } },
      },
    });
  } finally {
    await Promise.allSettled([client.close(), server.instance.close()]);
  }
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

  it("keeps fork agents opt-in after the SDK upgrade", () => {
    vi.stubEnv("CLAUDE_CODE_FORK_SUBAGENT", undefined);

    const options = buildAgenticQueryOptions(config, evaluationServer, "/tmp/agentic-test");

    expect(options.env?.CLAUDE_CODE_FORK_SUBAGENT).toBe("0");
  });

  it("preserves an explicit fork-agent setting", () => {
    vi.stubEnv("CLAUDE_CODE_FORK_SUBAGENT", "1");

    const options = buildAgenticQueryOptions(config, evaluationServer, "/tmp/agentic-test");

    expect(options.env?.CLAUDE_CODE_FORK_SUBAGENT).toBe("1");
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
