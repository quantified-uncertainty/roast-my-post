# Agentic Plugin: Session Handoff

> This document captures the full context from the implementation session on 2026-02-05.
> Use it to continue work in a new Claude Code session.

## Instructions for New Session

**Start with:** "Read `/dev/docs/agentic-plugin-handoff.md` and continue from where we left off. Create a plan for the Agentic Lab UI (Part 2-4), then implement it."

**Branch:** `feat/research-agent-sdk`

---

## What Was Accomplished

### AgenticPlugin — Fully Implemented & Tested

The plugin lives at `internal-packages/ai/src/analysis-plugins/plugins/agentic/index.ts` and is fully wired into the plugin system.

**Files modified:**
- `internal-packages/ai/package.json` — added `@anthropic-ai/claude-agent-sdk: ^0.2.29`
- `internal-packages/ai/src/analysis-plugins/types/plugin-types.ts` — added `AGENTIC = 'agentic'` to PluginType enum
- `internal-packages/ai/src/analysis-plugins/PluginManager.ts` — registered in `registerDefaultPlugins()` and `createPluginInstances()`
- `internal-packages/ai/src/analysis-plugins/index.ts` — added export

**New files:**
- `internal-packages/ai/src/analysis-plugins/plugins/agentic/index.ts` — the plugin
- `internal-packages/ai/scripts/test-agentic-plugin.ts` — test script (reads a file, runs plugin, prints results)

**Build status:** `pnpm turbo run typecheck` passes clean (all 11 tasks).

### How the Plugin Works

1. Implements `SimpleAnalysisPlugin` with `runOnAllChunks = true`
2. Calls Claude Agent SDK's `query()` with the full document
3. Uses `outputFormat` (JSON schema) to get structured findings: `{ findings[], summary, overallGrade }`
4. Maps each finding's `quotedText` to document offsets via `indexOf()`
5. Creates Comments using `CommentBuilder.build()`
6. SDK config: `model: 'sonnet'`, `maxTurns: 10`, `maxBudgetUsd: 2.0`, `allowedTools: ['WebSearch']`, `permissionMode: 'acceptEdits'`, `persistSession: false`

### Authentication

The SDK uses whatever auth Claude Code is configured with. When `ANTHROPIC_API_KEY` is unset from the environment, it falls back to the user's Claude Max subscription. The test confirmed this works — cost is still tracked internally by the SDK but not billed per-token on Max.

---

## Test Results

### Test 1: Fake quantum computing article (1,371 chars)
- **Result:** Grade 8/100, 2 comments out of 13 findings attempted
- **Problem:** 11 findings had quoted text that didn't match the document (SDK Claude paraphrases slightly)
- Cost: $0.46, Duration: 75s

### Test 2: Real CalMatters Bay Area transit article (4,930 chars) — budget $0.50
- **Result:** Budget exceeded before producing findings
- Cost: $0.51, Duration: 78s

### Test 3: Same article — budget bumped to $2.00
- **Result:** Grade 72/100, 2 comments out of 8 findings attempted
- 6 findings lost to quote matching failure
- The 2 surviving findings were genuinely good:
  - Outdated revenue projection ($500M vs ~$1B from more recent analyses)
  - Imprecise pandemic timing reference
- Summary was thorough and balanced
- Cost: $0.47, Duration: 95s

### Key Issue: Quote Matching

**75% of findings are lost** because the SDK returns slightly modified quotes (single vs double quotes, minor rephrasing, whitespace differences) that fail exact `indexOf()`. This is the #1 priority fix. The codebase already has `@leeoniya/ufuzzy` and `fuse.js` available.

---

## Proposed Plan: Agentic Lab UI + Plugin Fixes

### Part 1: Fix Quote Matching

**File:** `internal-packages/ai/src/analysis-plugins/plugins/agentic/index.ts`

Replace exact `indexOf()` in `createCommentFromFinding()` with cascading search:
1. Try exact `indexOf()` first (cheapest)
2. If no match, try case-insensitive search
3. If still no match, use sliding-window substring similarity (normalize both texts, find best-matching window using character-level comparison)
4. Log when falling back to fuzzy match
5. Skip finding if fuzzy match confidence is below threshold

### Part 2: Add Streaming Support to Plugin

**File:** `internal-packages/ai/src/analysis-plugins/plugins/agentic/index.ts`

Add `onMessage` callback option so the plugin emits SDK messages as they arrive:

```typescript
interface AgenticPluginOptions {
  onMessage?: (event: AgenticStreamEvent) => void;
  maxBudgetUsd?: number;
}

type AgenticStreamEvent =
  | { type: 'init'; model: string; tools: string[] }
  | { type: 'assistant_text'; text: string }
  | { type: 'tool_use'; toolName: string; input: string }
  | { type: 'tool_result'; toolName: string; output: string }
  | { type: 'status'; message: string }
  | { type: 'cost_update'; cost: number; turns: number }
  | { type: 'result'; findings: number; grade: number; cost: number }
  | { type: 'error'; message: string };
```

In the `for await` loop, call `onMessage` for each SDK message type (system → init, assistant → text/tool_use blocks, result → final). Plugin works both with and without callback.

### Part 3: SSE API Route

**New file:** `apps/web/src/app/api/monitor/agentic/stream/route.ts`

POST endpoint:
1. Authenticates + admin check (same pattern as all `/api/monitor/lab/` routes)
2. Accepts `{ documentId }` in body
3. Fetches document content from DB (latest DocumentVersion)
4. Instantiates `AgenticPlugin` with `onMessage` callback
5. Returns `ReadableStream` with `text/event-stream` content type
6. Each `onMessage` writes an SSE event to the stream
7. Final result + stream close when `analyze()` completes

**New file:** `apps/web/src/app/api/monitor/agentic/documents/route.ts`

GET endpoint to list documents for selection. Can reuse the corpus query pattern or query DocumentVersion directly.

### Part 4: Lab UI Page

**New route:** `/monitor/agentic` — separate from existing `/monitor/lab`

**Modified:** `apps/web/src/app/monitor/client-layout.tsx` — add "Agentic" nav link

**Layout:** Two-panel, no sidebar tabs:

```
┌─────────────────────────────────────────────────┐
│  Document Selection      [Run Analysis] button  │
├─────────────────────┬───────────────────────────┤
│  Live Activity Feed │  Results Panel            │
│  (streaming events) │  (grade, summary, cards)  │
└─────────────────────┴───────────────────────────┘
```

**New files:**
- `apps/web/src/app/monitor/agentic/page.tsx` — main page
- `apps/web/src/app/monitor/agentic/components/DocumentPicker.tsx` — search + select document
- `apps/web/src/app/monitor/agentic/components/ActivityFeed.tsx` — color-coded streaming event log
- `apps/web/src/app/monitor/agentic/components/ResultsPanel.tsx` — grade + summary + finding cards
- `apps/web/src/app/monitor/agentic/components/FindingCard.tsx` — individual finding display
- `apps/web/src/app/monitor/agentic/hooks/useAgenticAnalysis.ts` — SSE connection hook

---

## Key Technical Context

### Existing Lab Architecture (for reference)
- Path: `apps/web/src/app/monitor/lab/`
- Pattern: Polling-based (3s intervals), no SSE/WebSocket anywhere in codebase
- Auth: `authenticateRequest()` + `isAdmin()` on all endpoints
- UI: Pure Tailwind CSS, no shadcn. Expandable sections, color-coded stages.
- Hooks pattern: `useBaselines`, `useRuns`, `useProfiles`, `useCorpusDocs`, etc.
- Components: `PipelineView`, `ItemCards`, `ExtractorCards` for introspection

### Claude Agent SDK Message Types (from sdk.d.ts)
The `query()` yields `SDKMessage` which can be:
- `SDKSystemMessage` (type: 'system', subtype: 'init') — model, tools, apiKeySource
- `SDKAssistantMessage` (type: 'assistant') — message.content contains text_block and tool_use blocks
- `SDKUserMessage` (type: 'user') — tool results flowing back
- `SDKResultSuccess` (type: 'result', subtype: 'success') — result string, structured_output, total_cost_usd
- `SDKResultError` (type: 'result', subtype: 'error_*') — errors array, total_cost_usd
- Various status/streaming messages

### Document Data Model
- `Document` table has `id`, no content
- `DocumentVersion` table has `id`, `title`, `content`, `documentId`, `version`, etc.
- Corpus docs fetched via `metaEvaluationRepository.getValidationCorpusDocuments(agentId, ...)`
- For the agentic lab, we may want a simpler query that doesn't require agentId

### Color Coding Convention (from existing lab)
- Blue: extraction/analysis
- Green: results/kept items
- Orange: filters/tool calls
- Teal: cost/generation
- Red: errors/removed
- Gray: metadata/status

---

## Implementation Order

1. **Part 1** — Fix quote matching (immediate value, quick win)
2. **Part 2** — Add onMessage streaming to plugin (needed before UI)
3. **Part 3** — SSE API route (backend for UI)
4. **Part 4** — UI page and components (the visible result)

After each part, run `pnpm turbo run typecheck` to verify.
After Part 1, re-run the test script (`pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts`) on the Bay Area article (`/tmp/test-article.txt` — re-export from DB if needed: `dev/scripts/dev-env.sh psql -t -A -c "SELECT content FROM \"DocumentVersion\" WHERE id = 'c00b8299-6945-4998-b471-9222ca208b90';" > /tmp/test-article.txt`).
