"use client";

import { useState } from "react";

interface ModelEvaluation {
  model: string;
  provider: string;
  agreement: number; // 0-100
  agreementLevel?: string;
  reasoning: string;
  thinkingText?: string; // Extended reasoning from GPT-5/o1/o3 models
}

interface OpinionSpectrumProps {
  results: ModelEvaluation[];
}

// Color mappings based on agreement level
const AGREEMENT_COLORS = {
  "Strongly Agree": "bg-green-100 border-green-300 text-green-700",
  "Agree": "bg-green-50 border-green-200 text-green-600",
  "Neutral": "bg-gray-100 border-gray-300 text-gray-700",
  "Disagree": "bg-orange-50 border-orange-200 text-orange-600",
  "Strongly Disagree": "bg-red-100 border-red-300 text-red-700",
};

// Model abbreviation helper
function getModelAbbreviation(modelId: string): string {
  const abbreviations: Record<string, string> = {
    // Anthropic Claude models
    "anthropic/claude-sonnet-4.5": "C4.5",
    "anthropic/claude-sonnet-4": "CS4",
    "anthropic/claude-4-sonnet-20250522": "CS4.5",
    "anthropic/claude-3-7-sonnet-20250219": "C3.7",
    "anthropic/claude-3.5-sonnet": "C3.5",
    "anthropic/claude-3-haiku": "Haiku",
    // Google models
    "google/gemini-2.5-pro": "G2.5",
    "google/gemini-pro": "Gem",
    // OpenAI models
    "openai/gpt-5": "GPT5",
    "openai/gpt-4.1-mini-2025-04-14": "GP4.1",
    "openai/gpt-4-turbo": "GP4T",
    "openai/gpt-4": "GP4",
    // xAI models
    "x-ai/grok-4": "Grok4",
    "x-ai/grok-beta": "Grok",
    // DeepSeek models
    "deepseek/deepseek-chat-v3.1:free": "DS3.1",
    "deepseek/deepseek-chat": "DeepS",
  };

  return abbreviations[modelId] || modelId.split("/")[1]?.substring(0, 5) || modelId.substring(0, 5);
}

// Get agreement level from score
function getAgreementLevel(agreement: number): string {
  if (agreement >= 80) return "Strongly Agree";
  if (agreement >= 60) return "Agree";
  if (agreement >= 40) return "Neutral";
  if (agreement >= 20) return "Disagree";
  return "Strongly Disagree";
}

// Calculate vertical offset for models that are close together
function getVerticalOffset(model: ModelEvaluation, allModels: ModelEvaluation[]): number {
  const PROXIMITY_THRESHOLD = 5; // Consider models within 5% as "nearby"
  const VERTICAL_SPACING = 60; // Pixels between stacked avatars

  // Find all models within proximity threshold, sorted by agreement
  const nearby = allModels
    .filter(m => Math.abs(m.agreement - model.agreement) < PROXIMITY_THRESHOLD)
    .sort((a, b) => a.agreement - b.agreement);

  if (nearby.length === 1) return 0; // No collision

  // Find this model's index in the nearby group
  const index = nearby.findIndex(m => m.model === model.model);

  // Center the cluster vertically by offsetting from the middle
  const centerOffset = ((nearby.length - 1) * VERTICAL_SPACING) / 2;
  return index * VERTICAL_SPACING - centerOffset;
}

interface ModelAvatarProps {
  model: ModelEvaluation;
  allModels: ModelEvaluation[];
  onHover: () => void;
  isHovered: boolean;
}

function ModelAvatar({ model, allModels, onHover, isHovered }: ModelAvatarProps) {
  const level = model.agreementLevel || getAgreementLevel(model.agreement);
  const colorClass = AGREEMENT_COLORS[level as keyof typeof AGREEMENT_COLORS] || AGREEMENT_COLORS["Neutral"];
  const verticalOffset = getVerticalOffset(model, allModels);
  const abbreviation = getModelAbbreviation(model.model);

  return (
    <div className="relative">
      <div
        className={`
          w-12 h-12 rounded-full border-2 flex items-center justify-center
          font-semibold text-xs cursor-pointer transition-all duration-200
          ${colorClass}
          ${isHovered ? "scale-125 shadow-lg z-10" : "hover:scale-110"}
        `}
        onMouseEnter={onHover}
        style={{
          position: "absolute",
          left: `${model.agreement}%`,
          top: `${verticalOffset}px`,
          transform: "translateX(-50%)",
        }}
      >
        {abbreviation}
      </div>

      {isHovered && (
        <div
          className="absolute bg-white border-2 border-gray-300 rounded-lg shadow-xl px-3 py-2 z-20"
          style={{
            left: `${model.agreement}%`,
            transform: "translateX(-50%)",
            top: `${verticalOffset - 70}px`,
            minWidth: "200px",
            maxWidth: "400px",
          }}
        >
          <div className="font-semibold text-sm">{model.model}</div>
          <div className="text-xs text-gray-600 mb-1">({model.provider})</div>
          <div className="text-sm font-medium text-blue-600 mb-1">
            {level}: {model.agreement}%
          </div>
          <div className="text-xs text-gray-700 italic mb-1">
            &ldquo;{model.reasoning}&rdquo;
          </div>
          {model.thinkingText && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                View extended reasoning
              </summary>
              <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {model.thinkingText}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export function OpinionSpectrum({ results }: OpinionSpectrumProps) {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Legend */}
      <div className="mb-6 flex gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-300"></div>
          <span>Strongly Agree</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-50 border-2 border-green-200"></div>
          <span>Agree</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-300"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-50 border-2 border-orange-200"></div>
          <span>Disagree</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-300"></div>
          <span>Strongly Disagree</span>
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
        <span>Strongly Agree</span>
        <span className="text-gray-400">Neutral</span>
        <span>Strongly Disagree</span>
      </div>

      {/* Spectrum visualization */}
      <div className="relative h-96 border-b-2 border-gray-300">
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {[0, 25, 50, 75, 100].map((pos) => (
            <div
              key={pos}
              className="flex-1 border-r border-gray-200 first:border-l"
              style={{ width: "25%" }}
            />
          ))}
        </div>

        {/* Model avatars - centered vertically with padding */}
        <div
          className="absolute inset-0 pt-40"
          onMouseLeave={() => setHoveredModel(null)}
        >
          {results.map((model) => (
            <ModelAvatar
              key={model.model}
              model={model}
              allModels={results}
              onHover={() => setHoveredModel(model.model)}
              isHovered={hoveredModel === model.model}
            />
          ))}
        </div>
      </div>

      {/* Scale markers */}
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      {/* Helper text */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Hover over any model to see details
      </div>
    </div>
  );
}
