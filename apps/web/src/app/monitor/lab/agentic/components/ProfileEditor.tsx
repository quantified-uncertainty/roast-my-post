"use client";

import { useState, useEffect } from "react";
import { useAgenticDefaultPrompts } from "../hooks/useAgenticDefaultPrompts";
import { useFallacyCheckProfiles } from "../hooks/useFallacyCheckProfiles";

interface SubAgentConfig {
  enabled: boolean;
  model?: "sonnet" | "opus" | "haiku" | "inherit";
  maxTurns?: number;
  prompt?: string;
}

interface AgenticConfig {
  version: 1 | 2;
  model: "sonnet" | "opus" | "haiku";
  maxTurns: number;
  maxBudgetUsd: number;
  maxThinkingTokens?: number;
  allowedTools: string[];
  systemPrompt: string;
  permissionMode: "default" | "acceptEdits" | "plan";
  // v2 fields
  enableSubAgents?: boolean;
  subAgents?: Record<string, SubAgentConfig>;
  orchestratorPrompt?: string;
  enableMcpTools?: boolean;
  // MCP tool configuration
  fallacyCheckProfileId?: string;
}

interface ProfileEditorProps {
  config: AgenticConfig;
  onSave: (config: AgenticConfig) => void;
  saving?: boolean;
}

// Tools the orchestrator can use directly (sub-agents get tools automatically)
const ORCHESTRATOR_TOOLS = [
  "WebSearch",
  "WebFetch",
];

// These are automatically added when workspace exists - shown for info only
const AUTO_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "TodoWrite"];

// Note: These names must match SUBAGENT_PROMPTS keys in orchestrator.ts
const DEFAULT_SUBAGENTS: Record<string, SubAgentConfig> = {
  "fact-checker": { enabled: true, model: "sonnet" },
  "fallacy-checker": { enabled: true, model: "sonnet" },
  "clarity-checker": { enabled: true, model: "haiku" },
  "math-checker": { enabled: true, model: "sonnet" },
};

// Map old names to new names for migration
const AGENT_NAME_MIGRATIONS: Record<string, string> = {
  "spell-checker": "clarity-checker",
};

const DEFAULT_CONFIG: AgenticConfig = {
  version: 1,
  model: "sonnet",
  maxTurns: 10,
  maxBudgetUsd: 2.0,
  allowedTools: ["WebSearch", "WebFetch"],
  systemPrompt: "",
  permissionMode: "acceptEdits",
};

export function ProfileEditor({ config, onSave, saving }: ProfileEditorProps) {
  const [draft, setDraft] = useState<AgenticConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...config,
  }));
  const [dirty, setDirty] = useState(false);
  const { prompts: defaultPrompts } = useAgenticDefaultPrompts();
  const { profiles: fallacyProfiles, loading: fallacyProfilesLoading, defaultProfileId: defaultFallacyProfileId } = useFallacyCheckProfiles();

  useEffect(() => {
    setDraft({ ...DEFAULT_CONFIG, ...config });
    setDirty(false);
  }, [config]);

  function update<K extends keyof AgenticConfig>(key: K, value: AgenticConfig[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function toggleTool(tool: string) {
    setDraft((prev) => {
      const tools = prev.allowedTools.includes(tool)
        ? prev.allowedTools.filter((t) => t !== tool)
        : [...prev.allowedTools, tool];
      return { ...prev, allowedTools: tools };
    });
    setDirty(true);
  }

  function toggleSubAgent(name: string) {
    setDraft((prev) => {
      const subAgents = { ...DEFAULT_SUBAGENTS, ...prev.subAgents };
      subAgents[name] = { ...subAgents[name], enabled: !subAgents[name].enabled };
      return { ...prev, subAgents };
    });
    setDirty(true);
  }

  function updateSubAgentModel(name: string, model: SubAgentConfig["model"]) {
    setDraft((prev) => {
      const subAgents = { ...DEFAULT_SUBAGENTS, ...prev.subAgents };
      subAgents[name] = { ...subAgents[name], model };
      return { ...prev, subAgents };
    });
    setDirty(true);
  }

  function updateSubAgentPrompt(name: string, prompt: string) {
    setDraft((prev) => {
      const subAgents = { ...DEFAULT_SUBAGENTS, ...prev.subAgents };
      subAgents[name] = { ...subAgents[name], prompt: prompt || undefined };
      return { ...prev, subAgents };
    });
    setDirty(true);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Model */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
          <select
            value={draft.model}
            onChange={(e) => update("model", e.target.value as AgenticConfig["model"])}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        {/* Permission Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Permission Mode</label>
          <select
            value={draft.permissionMode}
            onChange={(e) => update("permissionMode", e.target.value as AgenticConfig["permissionMode"])}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="default">Default</option>
            <option value="acceptEdits">Accept Edits</option>
            <option value="plan">Plan</option>
          </select>
        </div>

        {/* Max Turns */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Turns</label>
          <input
            type="number"
            min={1}
            max={50}
            value={draft.maxTurns}
            onChange={(e) => update("maxTurns", Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>

        {/* Max Budget */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Budget (USD)</label>
          <input
            type="number"
            min={0.01}
            max={10}
            step={0.1}
            value={draft.maxBudgetUsd}
            onChange={(e) => update("maxBudgetUsd", Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>

        {/* Max Thinking Tokens */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Max Thinking Tokens <span className="text-gray-400">(optional, min 1024)</span>
          </label>
          <input
            type="number"
            min={1024}
            step={1024}
            value={draft.maxThinkingTokens ?? ""}
            placeholder="Not set"
            onChange={(e) =>
              update("maxThinkingTokens", e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Allowed Tools */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Orchestrator Tools <span className="text-gray-400">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ORCHESTRATOR_TOOLS.map((tool) => (
            <label
              key={tool}
              className="flex items-center gap-1 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={draft.allowedTools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="rounded border-gray-300"
              />
              {tool}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Auto-included: {AUTO_TOOLS.join(", ")} (workspace tools)
        </p>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          System Prompt <span className="text-gray-400">(leave empty for default)</span>
        </label>
        <textarea
          value={draft.systemPrompt}
          onChange={(e) => update("systemPrompt", e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
          placeholder="Default system prompt will be used if empty..."
        />
        {defaultPrompts?.systemPrompt && !draft.systemPrompt && (
          <details className="text-xs mt-1">
            <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
              View default prompt
            </summary>
            <pre className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-auto whitespace-pre-wrap text-gray-600">
              {defaultPrompts.systemPrompt}
            </pre>
          </details>
        )}
      </div>

      {/* Multi-Agent Mode (v2) */}
      <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.enableSubAgents ?? false}
            onChange={(e) => {
              update("enableSubAgents", e.target.checked);
              if (e.target.checked) {
                update("version", 2);
              }
            }}
            className="rounded border-gray-300"
          />
          Enable Multi-Agent Mode
          <span className="text-xs text-gray-400 font-normal">(v2 orchestrator with sub-agents)</span>
        </label>
      </div>

      {draft.enableSubAgents && (
        <>
          {/* MCP Tools Toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enableMcpTools ?? false}
                onChange={(e) => update("enableMcpTools", e.target.checked)}
                className="rounded border-gray-300"
              />
              Enable MCP Evaluation Tools
              <span className="text-xs text-gray-400">(fact_check, fallacy_check, etc.)</span>
            </label>
          </div>

          {/* Fallacy Check Profile Selector (shown when MCP tools enabled) */}
          {draft.enableMcpTools && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fallacy Checker Profile
              </label>
              <select
                value={draft.fallacyCheckProfileId ?? defaultFallacyProfileId ?? ""}
                onChange={(e) => update("fallacyCheckProfileId", e.target.value || undefined)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                disabled={fallacyProfilesLoading}
              >
                {fallacyProfilesLoading ? (
                  <option>Loading...</option>
                ) : fallacyProfiles.length === 0 ? (
                  <option value="">No profiles available</option>
                ) : (
                  <>
                    <option value="">Use default profile</option>
                    {fallacyProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Used by the fallacy_check MCP tool when sub-agents analyze logic errors
              </p>
            </div>
          )}

          {/* Sub-Agents */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Sub-Agents</label>
            <div className="space-y-3">
              {/* Only show agents defined in DEFAULT_SUBAGENTS, merge in saved config */}
              {Object.entries(DEFAULT_SUBAGENTS).map(([name, defaultSa]) => {
                // Check if there's a saved config for this agent (or migrated from old name)
                const savedConfig = draft.subAgents?.[name];
                const sa = savedConfig ?? defaultSa;
                return (
                <div key={name} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={sa.enabled}
                      onChange={() => toggleSubAgent(name)}
                      className="rounded border-gray-300"
                    />
                    <span className="flex-1 font-mono text-xs font-medium">{name}</span>
                    <select
                      value={sa.model ?? "inherit"}
                      onChange={(e) => updateSubAgentModel(name, e.target.value as SubAgentConfig["model"])}
                      className="border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                      disabled={!sa.enabled}
                    >
                      <option value="inherit">Inherit</option>
                      <option value="sonnet">Sonnet</option>
                      <option value="opus">Opus</option>
                      <option value="haiku">Haiku</option>
                    </select>
                  </div>
                  {sa.enabled && (
                    <div className="mt-2">
                      <textarea
                        value={sa.prompt ?? ""}
                        onChange={(e) => updateSubAgentPrompt(name, e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
                        placeholder="Leave empty to use default prompt..."
                      />
                      {defaultPrompts?.subAgentPrompts?.[name] && !sa.prompt && (
                        <details className="text-xs mt-1">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                            View default prompt
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-auto whitespace-pre-wrap text-gray-600">
                            {defaultPrompts.subAgentPrompts[name]}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Orchestrator Prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Orchestrator Prompt <span className="text-gray-400">(leave empty for default)</span>
            </label>
            <textarea
              value={draft.orchestratorPrompt ?? ""}
              onChange={(e) => update("orchestratorPrompt", e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              placeholder="Default orchestrator prompt will be used if empty..."
            />
            {defaultPrompts?.orchestratorPrompt && !draft.orchestratorPrompt && (
              <details className="text-xs mt-1">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                  View default prompt
                </summary>
                <pre className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-auto whitespace-pre-wrap text-gray-600">
                  {defaultPrompts.orchestratorPrompt}
                </pre>
              </details>
            )}
          </div>
        </>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => onSave({
            ...draft,
            // Persist the displayed fallacy profile ID (the dropdown shows defaultFallacyProfileId
            // as a display fallback, but without this the actual value stays undefined on save)
            fallacyCheckProfileId: draft.fallacyCheckProfileId ?? defaultFallacyProfileId ?? undefined,
          })}
          disabled={!dirty || saving}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
