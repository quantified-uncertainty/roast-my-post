"use client";

import { useState } from "react";
import { YamlEditor } from "@/components/YamlEditor";
import * as yaml from "js-yaml";

interface AgentConfig {
  name: string;
  primaryInstructions: string;
  selfCritiqueInstructions?: string;
  providesGrades: boolean;
  description?: string;
}

interface AgentConfigFormProps {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
}

export function AgentConfigForm({ config, onChange }: AgentConfigFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "yaml">("form");
  const [yamlValue, setYamlValue] = useState("");
  const [yamlValid, setYamlValid] = useState(false);

  // Convert config to YAML
  const configToYaml = (cfg: AgentConfig) => {
    return yaml.dump(cfg, {
      styles: {
        '!!str': 'literal'  // Use literal style for multiline strings
      }
    });
  };

  // Handle YAML changes
  const handleYamlChange = (value: string) => {
    setYamlValue(value);
  };

  const handleYamlValidation = (isValid: boolean, parsed?: any) => {
    setYamlValid(isValid);
    if (isValid && parsed) {
      // Update config from parsed YAML
      onChange({
        name: parsed.name || "",
        description: parsed.description || "",
        primaryInstructions: parsed.primaryInstructions || "",
        selfCritiqueInstructions: parsed.selfCritiqueInstructions || "",
        providesGrades: parsed.providesGrades || false,
      });
    }
  };

  // Switch to YAML tab - convert current config to YAML
  const switchToYaml = () => {
    setYamlValue(configToYaml(config));
    setActiveTab("yaml");
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-6 pb-0">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          Agent Configuration
        </h2>
        
        {/* Form/YAML Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("form")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "form"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Form
            </button>
            <button
              onClick={switchToYaml}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "yaml"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              YAML
            </button>
          </nav>
        </div>
      </div>

      <div className="flex-1 p-6 pt-0 overflow-auto">
        {activeTab === "form" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => onChange({ ...config, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Technical Reviewer v1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={config.description}
                onChange={(e) => onChange({ ...config, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Brief description of the agent's purpose"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                value={config.primaryInstructions}
                onChange={(e) => onChange({ ...config, primaryInstructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                rows={10}
                placeholder="Instructions for how the agent should evaluate documents..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Self-Critique Instructions <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <textarea
                value={config.selfCritiqueInstructions}
                onChange={(e) => onChange({ ...config, selfCritiqueInstructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                rows={6}
                placeholder="Instructions for self-critique phase..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="providesGrades"
                checked={config.providesGrades}
                onChange={(e) => onChange({ ...config, providesGrades: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="providesGrades" className="ml-2 text-sm text-gray-700">
                Agent provides numerical grades
              </label>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <YamlEditor
              value={yamlValue}
              onChange={handleYamlChange}
              onValidationChange={handleYamlValidation}
              placeholder={`name: My Agent
description: A helpful agent that evaluates documents
primaryInstructions: |
  You are an expert evaluator...
selfCritiqueInstructions: |
  Review your evaluation for accuracy...
providesGrades: true`}
              requiredFields={["name", "primaryInstructions"]}
              optionalFields={["description", "selfCritiqueInstructions", "providesGrades"]}
              height="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}