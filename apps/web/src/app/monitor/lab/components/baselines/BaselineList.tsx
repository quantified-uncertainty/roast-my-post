"use client";

import { BaselineCard } from "./BaselineCard";
import type { Baseline } from "../../types";

interface BaselineListProps {
  baselines: Baseline[];
  selectedId: string | null;
  onSelect: (baseline: Baseline) => void;
  onDelete: (id: string) => void;
}

export function BaselineList({ baselines, selectedId, onSelect, onDelete }: BaselineListProps) {
  return (
    <div className="space-y-2">
      {baselines.map((baseline) => (
        <BaselineCard
          key={baseline.id}
          baseline={baseline}
          isSelected={baseline.id === selectedId}
          onSelect={() => onSelect(baseline)}
          onDelete={() => onDelete(baseline.id)}
        />
      ))}
    </div>
  );
}
