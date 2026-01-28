"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { ExtractorConfig } from "../../types";
import { useModels, type ModelInfo } from "../../hooks/useModels";
import { ModelConfigurator } from "./ModelConfigurator";
import { ModelSelector } from "./ModelSelector";

interface ExtractorEditorProps {
  extractors: ExtractorConfig[];
  onChange: (extractors: ExtractorConfig[]) => void;
  disabled?: boolean;
}

export function ExtractorEditor({ extractors, onChange, disabled }: ExtractorEditorProps) {
  const { models, loading: modelsLoading } = useModels();
  const [addingExtractor, setAddingExtractor] = useState(false);

  const updateExtractor = (index: number, updates: Partial<ExtractorConfig>) => {
    const newExtractors = [...extractors];
    newExtractors[index] = { ...newExtractors[index], ...updates };
    onChange(newExtractors);
  };

  const removeExtractor = (index: number) => {
    if (extractors.length <= 1) return;
    onChange(extractors.filter((_, i) => i !== index));
  };

  const addExtractor = (model: ModelInfo) => {
    onChange([
      ...extractors,
      { model: model.id, temperature: "default", thinking: false },
    ]);
    setAddingExtractor(false);
  };

  return (
    <div className="space-y-3">
      {extractors.map((ext, index) => (
        <ModelConfigurator
          key={index}
          config={ext}
          onChange={(updates) => updateExtractor(index, updates)}
          disabled={disabled}
          label={index + 1}
          colorTheme="blue"
          showProvider={true}
          showDelete={true}
          onDelete={() => removeExtractor(index)}
          deleteDisabled={extractors.length <= 1}
          deleteDisabledReason="Cannot remove last extractor"
        />
      ))}

      {/* Add Extractor Button / Model Selector */}
      {!disabled && (
        addingExtractor ? (
          <div className="relative">
            <ModelSelector
              models={models}
              loading={modelsLoading}
              onSelect={addExtractor}
              onCancel={() => setAddingExtractor(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingExtractor(true)}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md text-sm w-full border border-dashed border-blue-200"
          >
            <PlusIcon className="h-4 w-4" />
            Add Extractor
          </button>
        )
      )}
    </div>
  );
}
