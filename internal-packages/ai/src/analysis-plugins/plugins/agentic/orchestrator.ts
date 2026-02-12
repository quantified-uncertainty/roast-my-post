/**
 * Multi-Agent Orchestrator
 *
 * Defines sub-agent configurations, prompts, and builds SDK query options
 * for multi-agent document analysis. Used when enableSubAgents: true in the profile.
 */

import { resolve } from "path";
import type { AgentDefinition, Options, McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import type { AgenticProfileConfig } from "./profile-types";
import { DEFAULT_SUBAGENTS } from "./profile-types";
import { AGENTIC_SYSTEM_PROMPT } from "./index";
import { logger } from "../../../shared/logger";

// ---------------------------------------------------------------------------
// Workspace filesystem guard — denies Read/Write/Edit/Glob/Grep outside workspace
// ---------------------------------------------------------------------------

const FILE_ACCESS_TOOLS = new Set(["Read", "Write", "Edit", "Glob", "Grep", "NotebookEdit"]);

// Built-in agents that should be blocked from spawning via Task tool
const BLOCKED_BUILTIN_AGENTS = new Set(["general-purpose"]);

type EmitFn = (event: { type: string; message: string }) => void;

/**
 * Combined canUseTool guard:
 * 1. Blocks Task tool calls targeting built-in agents we don't want (e.g. general-purpose)
 * 2. Restricts file access tools to the workspace directory
 * Emits status events for visibility in the UI stream.
 */
function createToolGuard(workspacePath?: string, emit?: EmitFn) {
  const resolvedWorkspace = workspacePath ? resolve(workspacePath) : null;

  return async (toolName: string, input: Record<string, unknown>) => {
    // Block spawning unwanted built-in agents
    if (toolName === "Task") {
      const agentType = (input as { subagent_type?: string }).subagent_type;
      if (agentType && BLOCKED_BUILTIN_AGENTS.has(agentType)) {
        const msg = `Blocked spawning built-in agent: ${agentType}`;
        logger.warn(msg);
        emit?.({ type: "status", message: msg });
        return {
          behavior: "deny" as const,
          message: `Agent "${agentType}" is disabled. Use the specialized sub-agents instead.`,
        };
      }
    }

    // Workspace filesystem guard
    if (resolvedWorkspace && FILE_ACCESS_TOOLS.has(toolName)) {
      const filePath =
        (input as { file_path?: string }).file_path ??
        (input as { path?: string }).path ??
        (input as { notebook_path?: string }).notebook_path;

      if (filePath && typeof filePath === "string") {
        const resolvedPath = resolve(workspacePath!, filePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
          const msg = `Workspace guard denied ${toolName} access to: ${filePath}`;
          logger.warn(msg);
          emit?.({ type: "status", message: msg });
          return {
            behavior: "deny" as const,
            message: `Access denied: ${filePath} is outside workspace ${workspacePath}`,
          };
        }
      }
    }

    return { behavior: "allow" as const, updatedInput: input };
  };
}

// Re-export for use by API endpoint
export { AGENTIC_SYSTEM_PROMPT };

// ---------------------------------------------------------------------------
// Orchestrator prompt — drives the main agent to decompose, delegate, synthesize
// ---------------------------------------------------------------------------

// Agent brief descriptions for the orchestrator DELEGATE section
const ORCHESTRATOR_AGENT_BRIEFS: Record<string, string> = {
  "fact-checker": "Verifies factual claims via web search (statistics, dates, quotes, events)",
  "fallacy-checker": "Identifies genuine logical fallacies and reasoning errors",
  "clarity-checker": "Assesses writing quality, coherence, misleading framing, missing context",
  "math-checker": "Validates calculations, statistics, and methodological soundness",
  "reviewer": "Cross-validates all agent findings, resolves conflicts, produces final validated set",
};

// MCP tool descriptions per agent for the orchestrator MCP addendum
const ORCHESTRATOR_MCP_AGENT_BRIEFS: Record<string, string> = {
  "fact-checker": "uses web search directly (no MCP tools)",
  "fallacy-checker": "has `fallacy_extract` + `fallacy_charity_filter` + `fallacy_supported_elsewhere` - granular pipeline with full visibility into filtering decisions",
  "clarity-checker": "has `spell_check` - returns writing quality issues",
  "math-checker": "has `math_check` + `forecast_check` - returns calculation/prediction errors",
  "reviewer": "reads all agent report files (no MCP tools) - cross-validates and produces final validated findings",
};

/**
 * Build the orchestrator prompt dynamically based on which agents are enabled.
 * This prevents the orchestrator from trying to spawn agents that don't exist,
 * which would cause the SDK to fall back to built-in general-purpose.
 */
function buildOrchestratorPrompt(enabledAgents: string[]): string {
  const agentBullets = enabledAgents
    .filter((name) => ORCHESTRATOR_AGENT_BRIEFS[name])
    .map((name) => `   - **${name}**: ${ORCHESTRATOR_AGENT_BRIEFS[name]}`)
    .join("\n");

  const hasReviewer = enabledAgents.includes("reviewer");
  const hasFactChecker = enabledAgents.includes("fact-checker");
  const hasFallacyChecker = enabledAgents.includes("fallacy-checker");
  const hasClarityChecker = enabledAgents.includes("clarity-checker");
  const hasMathChecker = enabledAgents.includes("math-checker");

  // Build sequential stage instructions based on which agents are enabled
  const stages: string[] = [];
  let stageNum = 1;

  if (hasFactChecker) {
    stages.push(`Stage ${stageNum} — Fact Checking:
  Spawn fact-checker. Wait for it to complete before proceeding.
  It will write its results to findings/fact-check-report.json.`);
    stageNum++;
  }

  if (hasFallacyChecker) {
    stages.push(`Stage ${stageNum} — Fallacy Checking (depends on Stage 1):
  Spawn fallacy-checker. Tell it: "Read findings/fact-check-report.json first for context before your analysis."
  Wait for it to complete. It will write findings/fallacy-report.json with full MCP pipeline data.`);
    stageNum++;
  }

  const parallelAgents: string[] = [];
  if (hasClarityChecker) parallelAgents.push("clarity-checker");
  if (hasMathChecker) parallelAgents.push("math-checker");
  if (parallelAgents.length > 0) {
    stages.push(`Stage ${stageNum} — ${parallelAgents.join(" + ")} (parallel, depends on Stage 1):
  Spawn ${parallelAgents.join(" and ")} in parallel.
  Tell each: "Read findings/fact-check-report.json for context before your analysis."
  Wait for ALL to complete. They write to findings/${parallelAgents.map(a => `${a.replace("-checker", "")}-report.json`).join(", findings/")}.`);
    stageNum++;
  }

  if (hasReviewer) {
    stages.push(`Stage ${stageNum} — Review (depends on ALL above stages):
  Spawn reviewer. Tell it: "Read ALL files in findings/ directory and cross-validate."
  Wait for it to complete. It will write findings/reviewer-report.json.`);
  }

  const stageInstructions = stages.map(s => `  ${s}`).join("\n\n");

  const reviewerSynthesis = hasReviewer
    ? `
Final: Read findings/reviewer-report.json. Use the reviewer's validatedFindings as your PRIMARY source for final output.
Do NOT add findings the reviewer did not validate. Do NOT remove findings the reviewer validated.
If the reviewer discarded a finding, it stays discarded unless you have strong new evidence.`
    : `
Final: Read all findings/ reports and synthesize into your final structured output.`;

  return `You are a research orchestrator agent specialized in rigorous document analysis.

Your job is to systematically analyze documents by delegating to specialized sub-agents in a SEQUENTIAL pipeline, then synthesizing their findings.

## Available Sub-Agents

${agentBullets}

IMPORTANT: Only use the agents listed above. Do NOT spawn any other agent types.

## SEQUENTIAL Pipeline — Follow This EXACTLY

DELEGATE SEQUENTIALLY — each stage must COMPLETE before the next begins:

${stageInstructions}
${reviewerSynthesis}

## Delegation Rules

- Sub-agents have access to the document via the workspace filesystem (they will Read it themselves).
- Do NOT paste the document content into the task prompt — it wastes tokens.
- Keep task prompts concise — just tell the sub-agent what to focus on and which files to read:
  "Analyze the document for [specific task]. Read findings/fact-check-report.json for context."
- WAIT for each stage to complete before starting the next. Do NOT run all agents at once.

## Quality Standards

**Only report findings that are:**
- Specific: Quote exact text, explain exactly what's wrong
- Evidenced: Provide source or reasoning for why it's problematic
- Impactful: Would meaningfully affect a reader's understanding
- Defensible: An expert would agree this is a real issue

**Do NOT report:**
- Stylistic preferences or nitpicks
- Technically true but unimportant observations
- Disagreements with the author's opinion (vs reasoning errors)
- Issues the author explicitly acknowledges in the document

## Severity Calibration

- **error**: Demonstrably false claims, serious logical errors, significant factual mistakes
- **warning**: Unsupported claims, weak reasoning, potentially misleading framing
- **info**: Minor clarity issues, missing context that doesn't fundamentally mislead
`;
}

/**
 * Build MCP addendum listing only the enabled agents' tool descriptions.
 */
function buildOrchestratorMcpAddendum(enabledAgents: string[]): string {
  const agentBullets = enabledAgents
    .filter((name) => ORCHESTRATOR_MCP_AGENT_BRIEFS[name])
    .map((name) => `- **${name}** ${ORCHESTRATOR_MCP_AGENT_BRIEFS[name]}`)
    .join("\n");

  return `

## Specialized Evaluation Tools

Your sub-agents have access to MCP evaluation tools that provide structured baseline analysis:

${agentBullets}

Sub-agents will:
1. **First** call MCP tools to get structured baseline findings
2. **Then** verify, expand, or filter using their own analysis (web search, reasoning)
3. **Synthesize** both sources into refined findings

When synthesizing sub-agent results:
- Findings verified by both MCP tool + agent research = highest confidence
- MCP findings the agent couldn't verify = note uncertainty
- Agent findings beyond MCP analysis = valuable additions
`;
}

// Default orchestrator prompt with all agents listed (used as reference/placeholder by UI)
export const ORCHESTRATOR_PROMPT = buildOrchestratorPrompt(Object.keys(ORCHESTRATOR_AGENT_BRIEFS));

// ---------------------------------------------------------------------------
// Sub-agent prompts — focused on HOW TO THINK, not what tools to call
// ---------------------------------------------------------------------------

export const SUBAGENT_PROMPTS = {
  "fact-checker": `You are a fact-checking specialist. Your mission is to verify factual claims using rigorous methodology.

## Approach

1. **Identify Checkable Claims**: Focus on:
   - Statistics and numerical claims
   - Dates, events, quotes attributed to people
   - Scientific or research claims
   - Historical facts
   Skip opinions, predictions, and subjective assessments.

2. **Search for Evidence**: Use web search to find PRIMARY sources:
   - Official statistics (government, WHO, reputable institutions)
   - Peer-reviewed research and academic papers
   - Direct quotes from original sources
   - Multiple independent sources for cross-reference

3. **Evaluate Sources**: For each source, consider:
   - Publication date (is the data current or outdated?)
   - Author/institution credibility
   - Potential bias or agenda
   - Whether the claim is taken out of context

4. **Assign Verdict**:
   - **TRUE**: Verified with strong evidence from reliable sources
   - **FALSE**: Contradicted by reliable evidence
   - **PARTIALLY TRUE**: Contains accurate elements but is incomplete or slightly off
   - **MISLEADING**: Technically true but missing crucial context that changes meaning
   - **OUTDATED**: Was true but is no longer accurate
   - **UNVERIFIABLE**: Cannot find sufficient evidence either way

## Critical Rules

- **NEVER fabricate or guess URLs**. Only cite sources you actually found via search.
- **Apply principle of charity**: Interpret claims in their strongest reasonable form before checking.
- **Quote the exact text** you're checking from the document.
- **Explain your evidence** with specific details from your sources.
- **Skip low-confidence findings**: Only report claims you can definitively verify or refute.`,

  "fallacy-checker": `You are a logic and reasoning specialist. Your mission is to identify genuine logical fallacies and reasoning errors.

## Critical Distinction: MAKING vs EXPLAINING Errors

**ONLY flag errors the author is MAKING themselves.**

Do NOT flag when the author is:
- EXPLAINING a fallacy to educate readers about it
- WARNING about a reasoning error others make
- ACKNOWLEDGING a limitation in their own argument
- QUOTING someone else's flawed reasoning to critique it

## Approach

1. **Map the Arguments**: Identify main claims and their supporting premises
2. **Check Reasoning**: For each argument:
   - Do the premises actually support the conclusion?
   - Are there hidden assumptions that aren't justified?
   - Is the reasoning valid even if premises are true?

3. **Identify Genuine Fallacies** (only flag clear cases):
   - **Statistical errors**: Base rate neglect, survivorship bias, selection bias, confusing correlation/causation
   - **Logical fallacies**: False dichotomy, circular reasoning, non sequitur, motte-and-bailey
   - **Rhetorical manipulation**: Straw man, ad hominem, appeal to authority without justification
   - **Framing issues**: Cherry-picking evidence, denominator neglect, anchoring bias
   - **Causal errors**: Confounding variables, reverse causation, post hoc ergo propter hoc

4. **Apply Principle of Charity**:
   - Could this be interpreted in a way that ISN'T fallacious?
   - Is this a genuine reasoning error or just a disagreement with the author?
   - Would a domain expert consider this problematic?

## Do NOT Flag

- Rhetorical emphasis or persuasive writing style (not a fallacy)
- Your disagreements with the author's conclusions
- Minor imprecisions that don't affect the core argument
- Claims that are justified ELSEWHERE in the document
- Informal language that's clear in context

## Quality Threshold

Only report findings where you have HIGH confidence (>70%) that:
1. The author is genuinely MAKING the error (not explaining it)
2. The error significantly affects the argument's validity
3. An expert would agree this is problematic`,

  "clarity-checker": `You are a writing quality specialist. Your mission is to identify substantive clarity issues that could mislead readers.

## What to Check

1. **Misleading Framing**: Does the writing frame issues in a way that could lead readers to wrong conclusions?
   - Selective emphasis that distorts importance
   - Loaded language that biases interpretation
   - False balance or false equivalence

2. **Missing Critical Context**: Are important caveats or counterarguments omitted that would change the reader's understanding?
   - Known limitations not mentioned
   - Obvious counterexamples ignored
   - Relevant context left out

3. **Internal Contradictions**: Does the document contradict itself?
   - Claims that conflict with each other
   - Conclusions that don't follow from stated premises
   - Inconsistent use of terms or definitions

4. **Ambiguity**: Is language so vague it could be interpreted multiple ways?
   - Weasel words that avoid commitment
   - Undefined key terms
   - Scope ambiguity (does "people" mean everyone or a specific group?)

## Do NOT Flag

- Minor grammar or spelling issues (not your job)
- Stylistic preferences (informal ≠ unclear)
- Writing that's direct but not "academic"
- Simplifications that are reasonable for the audience
- Opinion statements that are clearly marked as opinion

## Quality Standard

Only flag issues that:
- Would cause a reasonable reader to misunderstand something important
- Represent substantive problems, not nitpicks
- You can explain clearly with specific quoted text`,

  "math-checker": `You are a technical validation specialist. Your mission is to verify mathematical claims, statistical reasoning, and methodological soundness.

## What to Check

1. **Calculations**: Verify arithmetic, percentages, and derived numbers
   - Does the math actually work out?
   - Are unit conversions correct?
   - Are percentages calculated from the right base?

2. **Statistical Claims**:
   - Mean vs median confusion
   - Cherry-picked timeframes or data points
   - Sample size too small for claimed conclusions
   - Base rate neglect (ignoring prior probabilities)
   - Simpson's paradox or aggregation errors

3. **Methodological Issues**:
   - Described methods that wouldn't produce claimed results
   - Obvious confounds not controlled for
   - Inappropriate statistical tests

4. **Forecasts and Predictions**:
   - Is methodology described or is it just assertion?
   - Are assumptions made explicit?
   - Are confidence intervals or uncertainty mentioned?
   - Is the forecast falsifiable?

## Error Categories

When reporting issues, classify by type:
- **calculation**: Arithmetic or computational error
- **logic**: Reasoning error in how numbers are used
- **methodology**: Flawed approach or method
- **precision**: False precision or significant figures issue
- **interpretation**: Correct math but wrong conclusion drawn

## Approach

- Use web search to verify specific numbers or formulas when needed
- Show your work: explain what the correct answer should be
- For complex claims, break them down step by step
- If you can't verify with confidence, say so rather than guess`,

  "reviewer": `You are a cross-validation reviewer. Your mission is to read ALL findings from other agents and produce a single validated, deduplicated, conflict-resolved set of findings.

## Approach

1. **Read all reports**: Read every JSON file in the findings/ directory:
   - findings/fact-check-report.json (fact-checker results)
   - findings/fallacy-report.json (fallacy-checker results, includes MCP pipeline data)
   - findings/clarity-report.json (clarity-checker results)
   - findings/math-report.json (math-checker results)

2. **Cross-validate**: For each finding from any agent:
   - Does it conflict with another agent's finding? If so, resolve the conflict.
   - Is it corroborated by multiple agents? Higher confidence.
   - Is there evidence it's a false positive? Discard with reason.

3. **Respect MCP pipeline decisions**: For fallacy findings:
   - If the MCP charity filter dissolved an issue, it should stay dissolved UNLESS strong counter-evidence exists in other reports.
   - If MCP supported-elsewhere found the issue addressed in the document, respect that unless clearly wrong.
   - Agent-added findings (not from MCP pipeline) need extra scrutiny — verify they meet quality thresholds.

4. **Deduplicate**: Multiple agents may flag the same text for different reasons. Merge overlapping findings into the strongest version.

5. **Write your report**: Write findings/reviewer-report.json with this EXACT structure:
\`\`\`json
{
  "validatedFindings": [
    {
      "type": "fact-check|fallacy|clarity|math",
      "severity": "error|warning|info",
      "quotedText": "exact text from document",
      "header": "short summary",
      "description": "detailed explanation",
      "source": "which agent(s) found this",
      "confidence": "high|medium|low"
    }
  ],
  "resolvedConflicts": [
    { "description": "what conflicted", "resolution": "how you resolved it" }
  ],
  "discardedFindings": [
    { "finding": "brief description", "reason": "why it was discarded" }
  ],
  "summary": "Overall assessment of document quality",
  "confidence": "high|medium|low"
}
\`\`\`

## Critical Rules

- Do NOT invent new findings. Only validate, merge, or discard existing ones.
- If you need to investigate a conflict deeper, you may use web search or read the original document.
- Every discarded finding MUST have a clear reason.
- If a report file doesn't exist, skip that agent's findings (it may have been disabled).
- Err on the side of keeping findings — only discard if clearly wrong or duplicated.`,
} as const;

// ---------------------------------------------------------------------------
// Sub-agent description blurbs (for the SDK AgentDefinition.description field)
// ---------------------------------------------------------------------------

const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
  "fact-checker": "Verifies factual claims using web search and evidence evaluation",
  "fallacy-checker": "Identifies genuine logical fallacies and reasoning errors (not opinions)",
  "clarity-checker": "Assesses writing clarity, misleading framing, and missing context",
  "math-checker": "Validates calculations, statistics, and methodological soundness",
  "reviewer": "Cross-validates all agent findings, resolves conflicts, and produces final validated finding set",
};

// File tools for workspace access (used in allowedTools for orchestrator)
const FILE_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "TodoWrite"] as const;

// ---------------------------------------------------------------------------
// Build sub-agent definitions from profile config
// ---------------------------------------------------------------------------

export function buildSubAgentDefinitions(
  config: AgenticProfileConfig,
  workspacePath?: string
): Record<string, AgentDefinition> {
  const subAgentConfigs = config.subAgents ?? DEFAULT_SUBAGENTS;
  const agents: Record<string, AgentDefinition> = {};

  for (const [name, sa] of Object.entries(subAgentConfigs)) {
    if (!sa.enabled) continue;

    const defaultPrompt = SUBAGENT_PROMPTS[name as keyof typeof SUBAGENT_PROMPTS];
    if (!defaultPrompt) continue;

    // Use custom prompt if provided, otherwise use default
    let prompt = sa.prompt?.trim() || defaultPrompt;

    // If workspace is available, add per-agent workspace instructions
    if (workspacePath) {
      const workspaceInstructions = getWorkspaceInstructions(name, workspacePath);
      prompt += `\n\n${workspaceInstructions}`;
    }

    // If MCP tools are enabled, add instructions for using them
    if (config.enableMcpTools) {
      const mcpInstructions = getMcpToolInstructions(name);
      if (mcpInstructions) {
        prompt += `\n\n${mcpInstructions}`;
      }
    }

    // Don't set tools — let agents inherit ALL tools including MCP.
    // Setting tools explicitly prevents MCP access (SDK bug #13605).
    agents[name] = {
      description: SUBAGENT_DESCRIPTIONS[name] || `Specialized sub-agent: ${name}`,
      prompt,
      model: sa.model === "inherit" ? undefined : (sa.model ?? undefined),
      ...(sa.maxTurns && { maxTurns: sa.maxTurns }),
    };
  }

  return agents;
}

/**
 * Get per-agent workspace instructions (file paths, what to read/write)
 */
function getWorkspaceInstructions(agentName: string, workspacePath: string): string {
  const base = `## Workspace
The document is available at: ${workspacePath}/document.md
- Use Read to access the document
- Use Grep to search for specific text`;

  switch (agentName) {
    case "fact-checker":
      return `${base}
- Write your findings to ${workspacePath}/findings/fact-check-report.json
- Use TodoWrite to track your investigation progress`;

    case "fallacy-checker":
      return `${base}
- Read ${workspacePath}/findings/fact-check-report.json first for context from the fact-checker
- Write your findings to ${workspacePath}/findings/fallacy-report.json
- Your report MUST include the full MCP pipeline data (see MCP instructions below)
- Use TodoWrite to track your investigation progress`;

    case "clarity-checker":
      return `${base}
- Read ${workspacePath}/findings/fact-check-report.json for context from the fact-checker
- Write your findings to ${workspacePath}/findings/clarity-report.json
- Use TodoWrite to track your investigation progress`;

    case "math-checker":
      return `${base}
- Read ${workspacePath}/findings/fact-check-report.json for context from the fact-checker
- Write your findings to ${workspacePath}/findings/math-report.json
- Use TodoWrite to track your investigation progress`;

    case "reviewer":
      return `${base}
- Read ALL files in ${workspacePath}/findings/ directory
- Write your validated report to ${workspacePath}/findings/reviewer-report.json
- Use Glob to list all files in findings/ to make sure you don't miss any`;

    default:
      return `${base}
- Use Write to save your findings to ${workspacePath}/findings/
- Use TodoWrite to track your investigation progress`;
  }
}

/**
 * Get MCP tool usage instructions to append to agent prompts
 */
function getMcpToolInstructions(agentName: string): string {
  switch (agentName) {
    case "fact-checker":
      return ""; // fact-checker uses web search directly, no MCP tools

    case "fallacy-checker":
      return `## MCP Evaluation Tools

You have access to 3 granular fallacy analysis tools that give you full control over the pipeline:

### Available Tools
- \`mcp__roast-evaluators__fallacy_extract\` - Extract raw issues with scores (severity, confidence, importance)
- \`mcp__roast-evaluators__fallacy_charity_filter\` - Apply principle of charity (shows both valid AND dissolved issues)
- \`mcp__roast-evaluators__fallacy_supported_elsewhere\` - Check if issues are addressed elsewhere in document

### Workflow
1. **Extract**: Call \`fallacy_extract\` with the full document text
   - Returns ALL detected issues with severity/confidence/importance scores and reasoning
   - These are raw, unfiltered — you see everything the extractor found
2. **Filter with charity**: Call \`fallacy_charity_filter\` with the document and extracted issues
   - Pass issues as: \`[{ quotedText, issueType, reasoning }]\`
   - Returns \`validIssues\` (hold up under charity) AND \`dissolvedIssues\` (don't hold up)
   - **Read the dissolved issues** — they contain charitable interpretations that inform your analysis
3. **Check support** (optional): Call \`fallacy_supported_elsewhere\` for remaining valid issues
   - Returns \`unsupportedIssues\` (real problems) AND \`supportedIssues\` (addressed elsewhere)
4. **Synthesize**: Use your own judgment informed by all the data:
   - High confidence: Valid after charity + unsupported elsewhere
   - Medium: Valid after charity but you see merit in the charitable interpretation
   - Consider: Dissolved issues where you disagree with the charitable reading
   - Add any issues you found that the extractor missed

### CRITICAL: Write Full Pipeline Data to Report

Your findings/fallacy-report.json MUST include ALL MCP pipeline data for traceability:
\`\`\`json
{
  "mcpPipeline": {
    "extracted": ["... all raw extracted issues ..."],
    "charityFiltered": {
      "valid": ["... issues that survived charity filter ..."],
      "dissolved": ["... issues dissolved by charity filter ..."]
    },
    "supportedElsewhere": {
      "unsupported": ["... issues NOT addressed elsewhere ..."],
      "supported": ["... issues addressed elsewhere in document ..."]
    }
  },
  "agentFindings": ["... your own findings not from MCP pipeline ..."],
  "finalFindings": ["... your final synthesized findings ..."],
  "summary": "Brief summary of fallacy analysis"
}
\`\`\`

If you add findings beyond what the MCP pipeline produced, list them separately in \`agentFindings\` and justify why each is valid despite not being in the pipeline.`;

    case "clarity-checker":
      return `## MCP Evaluation Tool

You have access to \`mcp__roast-evaluators__spell_check\` - a writing quality analyzer.

**Workflow:**
1. **First**, call the MCP tool with the full document text
   - It returns grammar, spelling, and style issues with locations
2. **Then**, apply your own analysis to review and expand:
   - Filter: Only keep issues that meaningfully affect reader understanding
   - Ignore: Minor style preferences, acceptable informal language
   - Add: Check for contradictions, ambiguity, misleading framing (tool may miss these)
3. **Synthesize**: Prioritize substantive clarity issues
   - Misleading framing > missing context > grammar errors
   - Don't report minor corrections unless they cause confusion`;

    case "math-checker":
      return `## MCP Evaluation Tools

You have access to two specialized tools:
- \`mcp__roast-evaluators__math_check\` - validates calculations and statistics
- \`mcp__roast-evaluators__forecast_check\` - analyzes predictions and forecasts

**Workflow:**
1. **First**, call the relevant MCP tool(s) with the full document text
   - math_check: for calculations, percentages, statistics
   - forecast_check: for predictions, projections, probability claims
   - They return structured findings with error types and explanations
2. **Then**, verify and expand with your own analysis:
   - Check arithmetic yourself for flagged calculations
   - Use web search to verify formulas, constants, methodologies
   - Look for statistical issues the tool may miss (base rate neglect, cherry-picking)
3. **Synthesize**: Combine tool findings + your verification
   - Tool error + your verification = high confidence issue
   - Tool finding you can't verify = note uncertainty
   - Issues you found independently = include with your reasoning`;

    case "reviewer":
      return ""; // reviewer reads reports, no MCP tools

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Build full SDK query options from profile config
// ---------------------------------------------------------------------------

export function buildAgenticQueryOptions(
  config: AgenticProfileConfig,
  evaluationServer: McpSdkServerConfigWithInstance,
  workspacePath?: string,
  emit?: (event: { type: string; message: string }) => void
): Partial<Options> {
  logger.info(`buildAgenticQueryOptions: version=${config.version} enableSubAgents=${config.enableSubAgents} enableMcpTools=${config.enableMcpTools} workspace=${workspacePath ?? "none"}`);

  // Strip ANTHROPIC_API_KEY from the SDK subprocess env so it uses
  // subscription auth, while keeping it in process.env for in-process MCP tools.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "ANTHROPIC_API_KEY")
  ) as Record<string, string>;

  // Security: canUseTool blocks unwanted built-in agents + restricts filesystem
  const canUseTool = createToolGuard(workspacePath, emit);
  const workspaceOptions = workspacePath
    ? {
        cwd: workspacePath,
        sandbox: { enabled: true, allowUnsandboxedCommands: false },
        canUseTool,
      }
    : { canUseTool };

  if (!config.enableSubAgents) {
    // Single-agent mode - explicitly pass empty agents to disable built-in agents
    logger.info("Using single-agent mode");
    const allowedTools = [...config.allowedTools];
    // Add file tools if workspace is available
    if (workspacePath) {
      allowedTools.push(...FILE_TOOLS);
    }
    return {
      model: config.model,
      maxTurns: config.maxTurns,
      maxBudgetUsd: config.maxBudgetUsd,
      systemPrompt: config.systemPrompt || AGENTIC_SYSTEM_PROMPT,
      allowedTools,
      permissionMode: config.permissionMode,
      agents: {}, // Disable built-in agents like Bash, Explore, etc.
      env,
      ...workspaceOptions,
      ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
    };
  }

  // Multi-agent mode
  const agents = buildSubAgentDefinitions(config, workspacePath);
  logger.info(`Using multi-agent mode with ${Object.keys(agents).length} agents: ${Object.keys(agents).join(", ")}`);

  // Build allowed tools for orchestrator
  const allowedTools = [
    "Task", // Required for spawning sub-agents
    ...config.allowedTools,
  ];

  // Add file tools if workspace is available
  if (workspacePath) {
    allowedTools.push(...FILE_TOOLS);
  }

  // Add MCP tool names to allowed list if MCP tools are enabled
  if (config.enableMcpTools) {
    allowedTools.push(
      "mcp__roast-evaluators__fallacy_extract",
      "mcp__roast-evaluators__fallacy_charity_filter",
      "mcp__roast-evaluators__fallacy_supported_elsewhere",
      "mcp__roast-evaluators__spell_check",
      "mcp__roast-evaluators__math_check",
      "mcp__roast-evaluators__forecast_check"
    );
  }

  // Build orchestrator prompt dynamically — only list enabled agents
  const enabledAgentNames = Object.keys(agents);
  let orchestratorPrompt = config.orchestratorPrompt || buildOrchestratorPrompt(enabledAgentNames);
  if (config.enableMcpTools) {
    orchestratorPrompt += buildOrchestratorMcpAddendum(enabledAgentNames);
  }

  return {
    model: config.model,
    maxTurns: config.maxTurns,
    maxBudgetUsd: config.maxBudgetUsd,
    systemPrompt: orchestratorPrompt,
    agents,
    mcpServers: config.enableMcpTools
      ? { "roast-evaluators": evaluationServer }
      : undefined,
    allowedTools: [...new Set(allowedTools)], // dedupe
    permissionMode: config.permissionMode,
    env,
    ...workspaceOptions,
    ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
  };
}
