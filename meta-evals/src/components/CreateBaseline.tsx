/**
 * Create Baseline Flow Component
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import type { DocumentChoice, AgentChoice } from "./types";
import { truncate } from "./helpers";
import { DocumentSelector } from "./DocumentSelector";

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

  // Handle escape to go back (document step handles its own escape via DocumentSelector)
  useInput((input, key) => {
    if (key.escape && step !== "document") {
      onBack();
    }
  });

  // Document selection using reusable DocumentSelector
  if (step === "document") {
    return (
      <DocumentSelector
        title="Create New Baseline - Select Document"
        subtitle="Step 1/2: Select a document"
        borderColor="yellow"
        height={height}
        maxItems={maxItems}
        documents={documents}
        showFilter={true}
        onFilterChange={onSearchDocuments}
        onSelect={onSelectDocument}
        onCancel={onBack}
      />
    );
  }

  if (step === "creating") {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Creating baseline...
        </Text>
      </Box>
    );
  }

  // Remaining steps: agents and confirm
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">
          Create New Baseline
        </Text>
      </Box>

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
        <Text dimColor>Esc Back | q Quit</Text>
      </Box>
    </Box>
  );
}
