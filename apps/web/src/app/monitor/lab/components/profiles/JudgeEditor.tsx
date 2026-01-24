"use client";

import type { JudgeConfig } from "../../types";
import { ModelConfigurator } from "./ModelConfigurator";

interface JudgeEditorProps {
  judge: JudgeConfig;
  onChange: (judge: JudgeConfig) => void;
  disabled?: boolean;
}

export function JudgeEditor({ judge, onChange, disabled }: JudgeEditorProps) {
  const updateJudge = (updates: Partial<JudgeConfig>) => {
    onChange({ ...judge, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Enable Judge</label>
          <p className="text-xs text-gray-500">
            When using multiple extractors, the judge aggregates and deduplicates results.
          </p>
        </div>
        <button
          type="button"
          onClick={() => !disabled && updateJudge({ enabled: !judge.enabled })}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            judge.enabled ? "bg-purple-600" : "bg-gray-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              judge.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Model Configuration - only shown when enabled */}
      {judge.enabled && (
        <ModelConfigurator
          config={judge}
          onChange={updateJudge}
          disabled={disabled}
          colorTheme="purple"
          showProvider={true}
          showDelete={false}
        />
      )}
    </div>
  );
}
