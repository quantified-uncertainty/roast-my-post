/**
 * DocumentSelector - Reusable component for selecting documents
 *
 * Supports both single-select and multi-select modes, with optional text filtering.
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import type { DocumentChoice } from "@roast/db";
import { truncate, formatDate } from "./helpers";

export interface DocumentSelectorProps {
  /** Title shown at the top */
  title?: string;
  /** Subtitle/instruction text */
  subtitle?: string;
  /** Border color */
  borderColor?: string;
  /** Container height */
  height: number;
  /** Max items to show in the list */
  maxItems: number;
  /** Documents to display */
  documents: DocumentChoice[];
  /** Enable text filter input */
  showFilter?: boolean;
  /** Called when filter text changes (for server-side filtering) */
  onFilterChange?: (filter: string) => void;
  /** Enable multi-select mode */
  multiSelect?: boolean;
  /** Pre-selected document IDs (for multi-select) */
  selectedIds?: Set<string>;
  /** Called when a document is selected (single-select mode) */
  onSelect?: (doc: DocumentChoice) => void;
  /** Called when selection changes (multi-select mode) */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Called when confirmed (multi-select mode) */
  onConfirm?: (selectedDocs: DocumentChoice[]) => void;
  /** Called when cancelled */
  onCancel: () => void;
  /** Confirm button label (multi-select mode) */
  confirmLabel?: string;
}

export function DocumentSelector({
  title = "Select Document",
  subtitle,
  borderColor = "cyan",
  height,
  maxItems,
  documents,
  showFilter = false,
  onFilterChange,
  multiSelect = false,
  selectedIds: externalSelectedIds,
  onSelect,
  onSelectionChange,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm Selection",
}: DocumentSelectorProps) {
  const [filter, setFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
    externalSelectedIds || new Set()
  );
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use external or internal selected IDs
  const selectedIds = externalSelectedIds || internalSelectedIds;
  const setSelectedIds = onSelectionChange
    ? (ids: Set<string>) => onSelectionChange(ids)
    : setInternalSelectedIds;

  // Debounced filter change
  useEffect(() => {
    if (!showFilter || !onFilterChange) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      onFilterChange(filter);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filter, showFilter, onFilterChange]);

  // Handle escape to cancel
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  function toggleDocument(docId: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedIds(newSelected);
  }

  function toggleAll() {
    const allSelected = documents.every((d) => selectedIds.has(d.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  // Build items list
  const items: Array<{ label: string; value: string }> = [];

  if (multiSelect) {
    // Add "Select All" option
    const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));
    items.push({
      label: `[${allSelected ? "x" : " "}] Select All (${documents.length})`,
      value: "toggle-all",
    });
  }

  // Add document items
  const displayDocs = documents.slice(0, maxItems - (multiSelect ? 4 : 2));
  for (let i = 0; i < displayDocs.length; i++) {
    const d = displayDocs[i];
    if (multiSelect) {
      items.push({
        label: `[${selectedIds.has(d.id) ? "x" : " "}] ${truncate(d.title, 55)}`,
        value: d.id,
      });
    } else {
      items.push({
        label: `${String(i + 1).padStart(2)} | ${truncate(d.title, 50).padEnd(50)} | ${formatDate(new Date(d.createdAt))}`,
        value: d.id,
      });
    }
  }

  if (documents.length > displayDocs.length) {
    items.push({
      label: `... and ${documents.length - displayDocs.length} more`,
      value: "more",
    });
  }

  if (multiSelect) {
    const selectedCount = selectedIds.size;
    items.push({
      label: selectedCount > 0 ? `✓ ${confirmLabel} (${selectedCount} docs)` : "Select documents first",
      value: "confirm",
    });
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
          {subtitle || `${documents.length} document${documents.length !== 1 ? "s" : ""} found`}
          {filter && ` for "${filter}"`}
        </Text>
      </Box>

      {showFilter && (
        <Box marginBottom={1} paddingX={1}>
          <Text dimColor>Search: </Text>
          <TextInput
            value={filter}
            onChange={setFilter}
            placeholder="type to filter..."
          />
          {isSearching && (
            <Text dimColor>
              {" "}
              <Spinner type="dots" />
            </Text>
          )}
        </Box>
      )}

      <SelectInput
        items={items}
        limit={maxItems - (showFilter ? 5 : 3)}
        onSelect={(item) => {
          if (item.value === "cancel") {
            onCancel();
          } else if (item.value === "more") {
            // Ignore "more" item
          } else if (multiSelect) {
            if (item.value === "toggle-all") {
              toggleAll();
            } else if (item.value === "confirm") {
              if (selectedIds.size > 0 && onConfirm) {
                const selectedDocs = documents.filter((d) => selectedIds.has(d.id));
                onConfirm(selectedDocs);
              }
            } else {
              toggleDocument(item.value);
            }
          } else {
            // Single select mode
            const doc = documents.find((d) => d.id === item.value);
            if (doc && onSelect) {
              onSelect(doc);
            }
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>
          {multiSelect
            ? "Enter Toggle | Escape Cancel"
            : "Enter Select | Escape Cancel"}
        </Text>
      </Box>
    </Box>
  );
}

// Re-export types for convenience
export type { DocumentChoice };
