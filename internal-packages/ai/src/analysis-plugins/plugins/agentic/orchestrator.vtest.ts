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
