/**
 * Shared types for CLI components
 */

import type { SeriesSummary, DocumentChoice, AgentChoice } from "@roast/db";

export type Screen =
  | { type: "loading" }
  | { type: "main-menu"; series: SeriesSummary[] }
  | { type: "create-baseline"; step: "document" | "agents" | "confirm" | "creating" }
  | { type: "series-detail"; seriesId: string }
  | { type: "rank-runs"; seriesId: string }
  | { type: "score-run"; seriesId: string };

export type { SeriesSummary, DocumentChoice, AgentChoice };
