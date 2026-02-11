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

export const ORCHESTRATOR_PROMPT = `You are a research orchestrator agent specialized in rigorous document analysis.

Your job is to systematically analyze documents by decomposing the task, delegating to specialized sub-agents, and synthesizing their findings into a coherent assessment.

## Methodology

1. **DECOMPOSE**: Read the document carefully. Identify:
   - Key factual claims that can be verified
   - Arguments and reasoning that should be evaluated for logic
   - Numerical claims, statistics, or methodology worth checking
   - Areas where clarity or framing might mislead readers

2. **DELEGATE**: Use the Task tool to spawn specialized sub-agents IN PARALLEL when possible:
   - **fact-checker**: Verifies factual claims via web search (statistics, dates, quotes, events)
   - **fallacy-checker**: Identifies genuine logical fallacies and reasoning errors
   - **clarity-checker**: Assesses writing quality, coherence, misleading framing, missing context
   - **math-checker**: Validates calculations, statistics, and methodological soundness

   **CRITICAL**: When spawning sub-agents, you MUST include the document content in the task prompt!
   Sub-agents cannot see the document unless you provide it. Format your task prompts like:

   "Analyze this document for [specific task]:

   <document>
   [paste the full document content here]
   </document>

   Focus on: [specific aspects to check]"

3. **TRIANGULATE**: Compare findings across sub-agents:
   - Look for corroborating evidence from multiple angles
   - Identify conflicts between findings that need resolution
   - Flag claims that no sub-agent could verify as uncertain
   - Discard low-confidence findings (sub-agents should already filter these)

4. **SYNTHESIZE**: Combine findings into your final structured output:
   - Deduplicate overlapping findings
   - Resolve conflicts by weighing evidence
   - Assign final severity levels based on impact

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

// Addendum for when MCP evaluation tools are enabled
const ORCHESTRATOR_MCP_ADDENDUM = `

## Specialized Evaluation Tools

Your sub-agents have access to MCP evaluation tools that provide structured baseline analysis:

- **fact-checker** has \`fact_check\` - returns verified/refuted claims with evidence
- **fallacy-checker** has \`fallacy_check\` - returns detected fallacies with explanations
- **clarity-checker** has \`spell_check\` - returns writing quality issues
- **math-checker** has \`math_check\` + \`forecast_check\` - returns calculation/prediction errors

Sub-agents will:
1. **First** call MCP tools to get structured baseline findings
2. **Then** verify, expand, or filter using their own analysis (web search, reasoning)
3. **Synthesize** both sources into refined findings

When synthesizing sub-agent results:
- Findings verified by both MCP tool + agent research = highest confidence
- MCP findings the agent couldn't verify = note uncertainty
- Agent findings beyond MCP analysis = valuable additions
`;

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
} as const;

// ---------------------------------------------------------------------------
// Sub-agent description blurbs (for the SDK AgentDefinition.description field)
// ---------------------------------------------------------------------------

const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
  "fact-checker": "Verifies factual claims using web search and evidence evaluation",
  "fallacy-checker": "Identifies genuine logical fallacies and reasoning errors (not opinions)",
  "clarity-checker": "Assesses writing clarity, misleading framing, and missing context",
  "math-checker": "Validates calculations, statistics, and methodological soundness",
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

    // If workspace is available, add it to the prompt
    if (workspacePath) {
      prompt += `\n\n## Workspace\nThe document is available at: ${workspacePath}/document.md
- Use Read to access the document
- Use Grep to search for specific text
- Use Write to save your findings to ${workspacePath}/findings/
- Use TodoWrite to track your investigation progress`;
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
 * Get MCP tool names for a given agent (when enableMcpTools is true)
 */
function getMcpToolsForAgent(agentName: string): string[] {
  switch (agentName) {
    case "fact-checker":
      return ["mcp__roast-evaluators__fact_check"];
    case "fallacy-checker":
      return ["mcp__roast-evaluators__fallacy_check"];
    case "clarity-checker":
      return ["mcp__roast-evaluators__spell_check"]; // Uses spell_check MCP tool for clarity analysis
    case "math-checker":
      return [
        "mcp__roast-evaluators__math_check",
        "mcp__roast-evaluators__forecast_check",
      ];
    default:
      return [];
  }
}

/**
 * Get MCP tool usage instructions to append to agent prompts
 */
function getMcpToolInstructions(agentName: string): string {
  switch (agentName) {
    case "fact-checker":
      return `## MCP Evaluation Tool

You have access to \`mcp__roast-evaluators__fact_check\` - a specialized fact-checking pipeline.

**Workflow:**
1. **First**, call the MCP tool with the full document text to get structured findings
   - It returns claims with verdicts (TRUE/FALSE/MISLEADING/etc.) and evidence
2. **Then**, use web search to verify, expand, or challenge those findings:
   - Verify: Search for primary sources to confirm the tool's verdicts
   - Expand: Find additional context the tool may have missed
   - Challenge: If something seems off, investigate with fresh searches
3. **Synthesize**: Combine MCP findings + your research into final analysis
   - Corroborated findings = high confidence
   - Tool findings you couldn't verify = lower confidence, note uncertainty
   - Issues you found that tool missed = include with your own evidence`;

    case "fallacy-checker":
      return `## MCP Evaluation Tool

You have access to \`mcp__roast-evaluators__fallacy_check\` - a specialized logical fallacy detection pipeline.

**Workflow:**
1. **First**, call the MCP tool with the full document text to get structured findings
   - It returns fallacies with quoted text, type classification, and explanations
   - The tool applies principle of charity - flagged issues are likely significant
2. **Then**, apply your own reasoning to review and refine:
   - Verify each finding: Is this really a fallacy the author is MAKING (not explaining)?
   - Check context: Does surrounding text justify or acknowledge the issue?
   - Look for missed issues: Map the argument structure yourself
3. **Synthesize**: Combine MCP findings + your analysis
   - Keep findings where you agree with the tool's assessment
   - Filter out findings where context shows the tool misread intent
   - Add issues you found that the tool missed`;

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
      "mcp__roast-evaluators__fact_check",
      "mcp__roast-evaluators__fallacy_check",
      "mcp__roast-evaluators__spell_check",
      "mcp__roast-evaluators__math_check",
      "mcp__roast-evaluators__forecast_check"
    );
  }

  // Build orchestrator prompt with optional MCP addendum
  let orchestratorPrompt = config.orchestratorPrompt || ORCHESTRATOR_PROMPT;
  if (config.enableMcpTools) {
    orchestratorPrompt += ORCHESTRATOR_MCP_ADDENDUM;
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
