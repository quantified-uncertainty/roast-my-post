/**
 * ModelSelector - Reusable component for selecting AI models
 *
 * Fetches models from both Anthropic and OpenRouter APIs,
 * with text input filtering support.
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import {
  getAllModels,
  filterModels,
  type ModelInfo,
} from "@roast/ai";

export interface ModelSelectorProps {
  /** Title shown at the top */
  title?: string;
  /** Border color */
  borderColor?: string;
  /** Container height */
  height: number;
  /** Max items to show in the list */
  maxItems: number;
  /** Called when a model is selected */
  onSelect: (model: ModelInfo) => void;
  /** Called when cancelled */
  onCancel: () => void;
}

export function ModelSelector({
  title = "Select Model",
  borderColor = "cyan",
  height,
  maxItems,
  onSelect,
  onCancel,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [filteredModels, setFilteredModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  // Filter models when query changes (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setFilteredModels(filterModels(models, filter));
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filter, models]);

  // Handle escape to cancel
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  async function loadModels() {
    try {
      const allModels = await getAllModels();
      setModels(allModels);
      setFilteredModels(allModels);
      setLoading(false);
    } catch (e) {
      setError(`Failed to load models: ${e}`);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={borderColor}
        padding={1}
        height={height}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={borderColor}>
            {title}
          </Text>
        </Box>
        <Box justifyContent="center" padding={2}>
          <Text>
            <Spinner type="dots" /> Loading models from APIs...
          </Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="red"
        padding={1}
        height={height}
      >
        <Text color="red">{error}</Text>
        <Text dimColor>Press Escape to go back</Text>
      </Box>
    );
  }

  // Build list items grouped by provider
  const anthropicModels = filteredModels.filter((m) => m.provider === "anthropic");
  const openRouterModels = filteredModels.filter((m) => m.provider === "openrouter");

  const items: Array<{ label: string; value: string }> = [];

  if (anthropicModels.length > 0) {
    items.push({ label: `── Anthropic (${anthropicModels.length}) ──`, value: "header-anthropic" });
    for (const m of anthropicModels) {
      items.push({ label: `  ${m.name} (${m.id})`, value: m.id });
    }
  }

  if (openRouterModels.length > 0) {
    items.push({ label: `── OpenRouter (${openRouterModels.length}) ──`, value: "header-openrouter" });
    for (const m of openRouterModels) {
      items.push({ label: `  ${m.name}`, value: m.id });
    }
  }

  items.push({ label: "← Cancel", value: "cancel" });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      padding={1}
      height={height}
      overflow="hidden"
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={borderColor}>
          {title}
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>
          {filteredModels.length} models
          {filter && ` matching "${filter}"`}
          {" "}(Anthropic: {anthropicModels.length}, OpenRouter: {openRouterModels.length})
        </Text>
      </Box>

      <Box marginBottom={1} paddingX={1}>
        <Text dimColor>Filter: </Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          placeholder="type to filter models..."
        />
      </Box>

      <SelectInput
        items={items}
        limit={maxItems - 5}
        onSelect={(item) => {
          if (item.value === "cancel") {
            onCancel();
          } else if (item.value.startsWith("header-")) {
            // Ignore header clicks
          } else {
            const model = filteredModels.find((m) => m.id === item.value);
            if (model) {
              onSelect(model);
            }
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Enter Select | Escape Cancel</Text>
      </Box>
    </Box>
  );
}

// Re-export types for convenience
export type { ModelInfo };
