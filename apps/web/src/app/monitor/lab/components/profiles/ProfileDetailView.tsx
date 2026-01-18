"use client";

import { useState, useEffect } from "react";
import { PencilIcon, CheckIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Profile, ProfileConfig, ExtractorConfig, JudgeConfig, FilterChainItem } from "../../types";
import { formatDate } from "../../utils/formatters";
import { ExtractorEditor } from "./ExtractorEditor";
import { useDefaultPrompts } from "../../hooks/useDefaultPrompts";
import { JudgeEditor } from "./JudgeEditor";
import { FilterChainEditor } from "./FilterChainEditor";

interface ProfileDetailViewProps {
  profile: Profile;
  onSave: (updates: { name?: string; description?: string; config?: ProfileConfig }) => Promise<void>;
}

const DEFAULT_CONFIG: ProfileConfig = {
  version: 1,
  models: {
    extractors: [
      { model: "claude-sonnet-4-5-20250929", temperature: 0, thinking: false },
      { model: "google/gemini-3-flash-preview", temperature: "default", thinking: true },
      { model: "google/gemini-2.5-flash", temperature: "default", thinking: true },
    ],
    judge: { model: "claude-sonnet-4-5-20250929", enabled: false },
  },
  thresholds: {
    minSeverityThreshold: 60,
    maxIssues: 15,
    dedupThreshold: 0.7,
    maxIssuesToProcess: 25,
  },
  filterChain: [
    {
      id: "default-supported-elsewhere",
      type: "supported-elsewhere",
      enabled: true,
      model: "claude-sonnet-4-5-20250929",
      temperature: 0.1,
    },
  ],
};

// Migrate old filterChain format { filters: [...] } to new format FilterChainItem[]
function migrateFilterChain(config: Profile["config"] | undefined): FilterChainItem[] {
  if (!config?.filterChain) return DEFAULT_CONFIG.filterChain;

  // New format: array of FilterChainItem
  if (Array.isArray(config.filterChain)) {
    return config.filterChain;
  }

  // Old format: { filters: Array<{ type, enabled }> }
  const oldFormat = config.filterChain as unknown as { filters: Array<{ type: string; enabled: boolean }> };
  if (oldFormat.filters && Array.isArray(oldFormat.filters)) {
    // Convert old format to new format - only migrate supported-elsewhere
    const supportedElsewhere = oldFormat.filters.find(f => f.type === "supported-elsewhere");
    if (supportedElsewhere) {
      return [{
        id: "migrated-supported-elsewhere",
        type: "supported-elsewhere" as const,
        enabled: supportedElsewhere.enabled,
        model: "claude-sonnet-4-5-20250929",
        temperature: 0.1,
      }];
    }
  }

  return DEFAULT_CONFIG.filterChain;
}

export function ProfileDetailView({ profile, onSave }: ProfileDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState(profile.name);
  const [editedDescription, setEditedDescription] = useState(profile.description || "");
  const { prompts: defaultPrompts } = useDefaultPrompts();

  // Merge profile config with defaults to ensure all values are present
  const mergedConfig: ProfileConfig = {
    ...DEFAULT_CONFIG,
    ...profile.config,
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...profile.config?.thresholds },
    models: {
      extractors: profile.config?.models?.extractors || DEFAULT_CONFIG.models.extractors,
      judge: { ...DEFAULT_CONFIG.models.judge, ...profile.config?.models?.judge },
    },
    filterChain: migrateFilterChain(profile.config),
    prompts: profile.config?.prompts,
  };

  const [editedConfig, setEditedConfig] = useState<ProfileConfig>(mergedConfig);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["extraction"]));

  // Reset state when profile changes
  useEffect(() => {
    const newMergedConfig: ProfileConfig = {
      ...DEFAULT_CONFIG,
      ...profile.config,
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...profile.config?.thresholds },
      models: {
        extractors: profile.config?.models?.extractors || DEFAULT_CONFIG.models.extractors,
        judge: { ...DEFAULT_CONFIG.models.judge, ...profile.config?.models?.judge },
      },
      filterChain: migrateFilterChain(profile.config),
      prompts: profile.config?.prompts,
    };
    setEditedName(profile.name);
    setEditedDescription(profile.description || "");
    setEditedConfig(newMergedConfig);
    setIsEditing(false);
  }, [profile.id]);

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: editedName,
        description: editedDescription || undefined,
        config: editedConfig,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const newMergedConfig: ProfileConfig = {
      ...DEFAULT_CONFIG,
      ...profile.config,
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...profile.config?.thresholds },
      models: {
        extractors: profile.config?.models?.extractors || DEFAULT_CONFIG.models.extractors,
        judge: { ...DEFAULT_CONFIG.models.judge, ...profile.config?.models?.judge },
      },
      filterChain: migrateFilterChain(profile.config),
      prompts: profile.config?.prompts,
    };
    setEditedName(profile.name);
    setEditedDescription(profile.description || "");
    setEditedConfig(newMergedConfig);
    setIsEditing(false);
  };

  const updateThreshold = (key: keyof ProfileConfig["thresholds"], value: number) => {
    setEditedConfig((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value },
    }));
  };

  const updatePrompt = (key: keyof NonNullable<ProfileConfig["prompts"]>, value: string) => {
    setEditedConfig((prev) => ({
      ...prev,
      prompts: { ...(prev.prompts || {}), [key]: value || undefined },
    }));
  };

  const updateExtractors = (extractors: ExtractorConfig[]) => {
    setEditedConfig((prev) => ({
      ...prev,
      models: { ...prev.models, extractors },
    }));
  };

  const updateJudge = (judge: JudgeConfig) => {
    setEditedConfig((prev) => ({
      ...prev,
      models: { ...prev.models, judge },
    }));
  };

  const updateFilterChain = (filterChain: FilterChainItem[]) => {
    setEditedConfig((prev) => ({
      ...prev,
      filterChain,
    }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-xl font-semibold text-gray-900 border-b border-blue-500 focus:outline-none w-full"
                placeholder="Profile name"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
                {profile.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                    Default
                  </span>
                )}
              </div>
            )}
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="text-sm text-gray-500 mt-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full resize-y min-h-[60px]"
                placeholder="Description (optional)"
                rows={2}
              />
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                {profile.description || "No description"}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Updated {formatDate(profile.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editedName.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Configuration */}
      <div className="flex-1 overflow-y-auto">
        <div className="border rounded-lg m-4 bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h4 className="font-medium text-gray-900">Pipeline Configuration</h4>
            <p className="text-xs text-gray-500 mt-0.5">Configure each phase of the fallacy detection pipeline</p>
          </div>

          <div className="divide-y">
            {/* Phase 1: Extraction */}
            <PipelineSection
              title="1. Extraction"
              subtitle="Find potential issues in the document"
              color="blue"
              isExpanded={expandedSections.has("extraction")}
              onToggle={() => toggleSection("extraction")}
            >
              <div className="space-y-4">
                {/* Models */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extractor Models
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    AI models that scan the document for issues. Multiple models improve coverage.
                  </p>
                  <ExtractorEditor
                    extractors={editedConfig.models.extractors}
                    onChange={updateExtractors}
                    disabled={!isEditing}
                  />
                </div>

                {/* Thresholds */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Min Severity
                    </label>
                    <p className="text-xs text-gray-500 mb-1">
                      Only flag issues with severity ≥ this value (0-100)
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editedConfig.thresholds.minSeverityThreshold}
                      onChange={(e) => updateThreshold("minSeverityThreshold", Number(e.target.value))}
                      disabled={!isEditing}
                      className="w-24 px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Issues
                    </label>
                    <p className="text-xs text-gray-500 mb-1">
                      Maximum issues to return per document
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editedConfig.thresholds.maxIssues}
                      onChange={(e) => updateThreshold("maxIssues", Number(e.target.value))}
                      disabled={!isEditing}
                      className="w-24 px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                {/* Custom Prompts */}
                <PromptEditor
                  label="System Prompt"
                  description="Instructions for the extraction model"
                  value={editedConfig.prompts?.extractorSystemPrompt || ""}
                  defaultValue={defaultPrompts?.extractorSystemPrompt}
                  onChange={(v) => updatePrompt("extractorSystemPrompt", v)}
                  disabled={!isEditing}
                  placeholder="Leave empty to use default extraction prompt"
                />
                <PromptEditor
                  label="User Prompt"
                  description="Task instructions (document text appended automatically)"
                  value={editedConfig.prompts?.extractorUserPrompt || ""}
                  defaultValue={defaultPrompts?.extractorUserPrompt}
                  onChange={(v) => updatePrompt("extractorUserPrompt", v)}
                  disabled={!isEditing}
                  placeholder="Leave empty to use default user prompt"
                  rows={2}
                />
              </div>
            </PipelineSection>

            {/* Phase 2: Deduplication */}
            <PipelineSection
              title="2. Deduplication"
              subtitle="Remove duplicate issues found by multiple extractors"
              color="purple"
              isExpanded={expandedSections.has("dedup")}
              onToggle={() => toggleSection("dedup")}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Similarity Threshold
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Jaccard similarity threshold (0-1). Issues above this are considered duplicates.
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={editedConfig.thresholds.dedupThreshold}
                    onChange={(e) => updateThreshold("dedupThreshold", Number(e.target.value))}
                    disabled={!isEditing}
                    className="w-24 px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Judge configuration (for multi-extractor mode) */}
                <JudgeEditor
                  judge={editedConfig.models.judge}
                  onChange={updateJudge}
                  disabled={!isEditing}
                />

                <PromptEditor
                  label="Judge System Prompt"
                  description="Instructions for the judge aggregation model"
                  value={editedConfig.prompts?.judgeSystemPrompt || ""}
                  defaultValue={defaultPrompts?.judgeSystemPrompt}
                  onChange={(v) => updatePrompt("judgeSystemPrompt", v)}
                  disabled={!isEditing}
                  placeholder="Leave empty to use default judge prompt"
                />
              </div>
            </PipelineSection>

            {/* Phase 3: Filtering */}
            <PipelineSection
              title="3. Filtering"
              subtitle="Remove false positives using configurable filters"
              color="orange"
              isExpanded={expandedSections.has("filtering")}
              onToggle={() => toggleSection("filtering")}
            >
              <div className="space-y-4">
                {/* Max Issues to Process */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Issues to Process
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Limit how many issues enter the filtering pipeline (after dedup)
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editedConfig.thresholds.maxIssuesToProcess}
                    onChange={(e) => updateThreshold("maxIssuesToProcess", Number(e.target.value))}
                    disabled={!isEditing}
                    className="w-24 px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Filter Chain */}
                <FilterChainEditor
                  filters={editedConfig.filterChain}
                  onChange={updateFilterChain}
                  disabled={!isEditing}
                  defaultFilterPrompt={defaultPrompts?.filterSystemPrompt}
                />
              </div>
            </PipelineSection>

            {/* Phase 4: Review */}
            <PipelineSection
              title="4. Review"
              subtitle="Final quality check and summary generation"
              color="green"
              isExpanded={expandedSections.has("review")}
              onToggle={() => toggleSection("review")}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  The review phase filters out redundant or low-value comments and generates a summary of the document's epistemic quality.
                </p>

                <PromptEditor
                  label="Review System Prompt"
                  description="Instructions for the final review model"
                  value={editedConfig.prompts?.reviewSystemPrompt || ""}
                  onChange={(v) => updatePrompt("reviewSystemPrompt", v)}
                  disabled={!isEditing}
                  placeholder="Leave empty to use default review prompt"
                />
              </div>
            </PipelineSection>
          </div>

          {/* Summary Bar */}
          <div className="px-4 py-3 bg-gray-100 border-t text-sm text-gray-600">
            <span className="font-medium">Flow:</span>{" "}
            Extract ({editedConfig.models.extractors.length} model{editedConfig.models.extractors.length !== 1 ? 's' : ''}, severity ≥{editedConfig.thresholds.minSeverityThreshold}, max {editedConfig.thresholds.maxIssues}/model) →{" "}
            Dedup (similarity ≥{editedConfig.thresholds.dedupThreshold}) →{" "}
            Filter ({editedConfig.filterChain.filter(f => f.enabled).length} active, intake max {editedConfig.thresholds.maxIssuesToProcess}) →{" "}
            Review
          </div>
        </div>
      </div>
    </div>
  );
}

interface PipelineSectionProps {
  title: string;
  subtitle: string;
  color: "blue" | "purple" | "orange" | "green";
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function PipelineSection({ title, subtitle, color, isExpanded, onToggle, children }: PipelineSectionProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    green: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
            {title}
          </span>
        </div>
        <span className="text-sm text-gray-500">{subtitle}</span>
      </button>
      {isExpanded && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

interface PromptEditorProps {
  label: string;
  description: string;
  value: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  rows?: number;
}

function PromptEditor({ label, description, value, defaultValue, onChange, disabled, placeholder, rows = 3 }: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDefault, setShowDefault] = useState(false);
  const hasValue = value.trim().length > 0;

  const handleUseDefault = () => {
    if (defaultValue) {
      onChange(defaultValue);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        {isOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
        <span className="font-medium">{label}</span>
        {hasValue ? (
          <span className="text-xs text-blue-600">(customized)</span>
        ) : (
          <span className="text-xs text-gray-400">(using default)</span>
        )}
      </button>
      {isOpen && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">{description}</p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={hasValue ? rows : 2}
            className="w-full px-3 py-2 border rounded-md text-sm font-mono disabled:bg-gray-50 disabled:text-gray-500"
            placeholder={placeholder}
          />
          {!hasValue && defaultValue && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setShowDefault(!showDefault)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showDefault ? "Hide default" : "View default prompt"}
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleUseDefault}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Copy to customize
                  </button>
                )}
              </div>
              {showDefault && (
                <pre className="p-2 bg-gray-50 border rounded text-xs font-mono text-gray-600 max-h-64 overflow-auto whitespace-pre-wrap">
                  {defaultValue}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

