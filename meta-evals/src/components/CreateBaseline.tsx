/**
 * Create Baseline Flow Component
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import type { DocumentChoice, AgentChoice } from "./types";
import { truncate, formatDate } from "./helpers";

interface CreateBaselineProps {
  step: "document" | "agents" | "confirm" | "creating";
  documents: DocumentChoice[];
  agents: AgentChoice[];
  selectedDoc: DocumentChoice | null;
  selectedAgents: AgentChoice[];
  maxItems: number;
  height: number;
  onSelectDocument: (doc: DocumentChoice) => void;
  onSelectAgents: (agents: AgentChoice[]) => void;
  onSearchDocuments: (filter: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function CreateBaseline({
  step,
  documents,
  agents,
  selectedDoc,
  selectedAgents,
  maxItems,
  height,
  onSelectDocument,
  onSelectAgents,
  onSearchDocuments,
  onConfirm,
  onBack,
}: CreateBaselineProps) {
  const [agentSelection, setAgentSelection] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced DB search when filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      onSearchDocuments(filter);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filter]);

  if (step === "creating") {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Creating baseline...
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">
          Create New Baseline
        </Text>
      </Box>

      {step === "document" && (
        <>
          <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
            <Text>Step 1/2: Select a document ({documents.length} found{filter ? ` for "${filter}"` : ""})</Text>
          </Box>
          <Box marginBottom={1} paddingX={1}>
            <Text dimColor>Search: </Text>
            <TextInput
              value={filter}
              onChange={setFilter}
              placeholder="type to search in DB..."
            />
            {isSearching && <Text dimColor> <Spinner type="dots" /></Text>}
          </Box>
          <SelectInput
            items={documents.map((d, i) => ({
              label: `${String(i + 1).padStart(2)} | ${truncate(d.title, 50).padEnd(50)} | ${formatDate(new Date(d.createdAt))}`,
              value: d.id,
            }))}
            limit={maxItems - 2}
            onSelect={(item) => {
              const doc = documents.find((d) => d.id === item.value);
              if (doc) onSelectDocument(doc);
            }}
          />
        </>
      )}

      {step === "agents" && (
        <>
          <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
            <Text>Step 2/2: Select agents (Enter to toggle, select Confirm when done)</Text>
          </Box>
          <Box marginBottom={1} paddingX={1}>
            <Text dimColor>Document: {truncate(selectedDoc?.title || "", 50)}</Text>
          </Box>
          <SelectInput
            items={[
              ...agents.map((a) => ({
                label: `${agentSelection.has(a.id) ? "[x]" : "[ ]"} ${a.name} (v${a.version})`,
                value: a.id,
              })),
              { label: "-> Confirm Selection", value: "confirm" },
            ]}
            limit={maxItems}
            onSelect={(item) => {
              if (item.value === "confirm") {
                const selected = agents.filter((a) => agentSelection.has(a.id));
                if (selected.length > 0) {
                  onSelectAgents(selected);
                }
              } else {
                setAgentSelection((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.value)) {
                    next.delete(item.value);
                  } else {
                    next.add(item.value);
                  }
                  return next;
                });
              }
            }}
          />
        </>
      )}

      {step === "confirm" && (
        <>
          <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
            <Text>Confirm baseline creation:</Text>
          </Box>
          <Box marginBottom={1} flexDirection="column" paddingX={1}>
            <Text>Document: {truncate(selectedDoc?.title || "", 50)}</Text>
            <Text>Agents: {selectedAgents.map((a) => a.name).join(", ")}</Text>
          </Box>
          <SelectInput
            items={[
              { label: "-> Create Baseline", value: "confirm" },
              { label: "<- Back", value: "back" },
            ]}
            onSelect={(item) => {
              if (item.value === "confirm") onConfirm();
              else onBack();
            }}
          />
        </>
      )}

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Esc Back | {step === "document" ? "Ctrl+C" : "q"} Quit</Text>
      </Box>
    </Box>
  );
}
