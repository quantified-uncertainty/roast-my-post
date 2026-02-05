"use client";

import { useState, useEffect } from "react";

interface AgenticConfig {
  version: 1;
  model: "sonnet" | "opus" | "haiku";
  maxTurns: number;
  maxBudgetUsd: number;
  maxThinkingTokens?: number;
  allowedTools: string[];
  systemPrompt: string;
  permissionMode: "default" | "acceptEdits" | "plan";
}

interface ProfileEditorProps {
  config: AgenticConfig;
  onSave: (config: AgenticConfig) => void;
  saving?: boolean;
}

const AVAILABLE_TOOLS = [
  "WebSearch",
  "WebFetch",
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
];

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
        <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Tools</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map((tool) => (
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
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => onSave(draft)}
          disabled={!dirty || saving}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
