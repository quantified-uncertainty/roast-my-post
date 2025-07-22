# 2025-06-22 Agent README Design

## Purpose
Create human-readable READMEs for each agent that serve both users and future LLMs modifying the agents.

## Proposed Structure

### 1. Agent Overview (Human-facing)
```markdown
# [Agent Name]

**Type**: ASSESSOR/ADVISOR/ENRICHER/EXPLAINER  
**Version**: Current version number  
**Maintainer**: Who created/maintains this agent

## What This Agent Does
Brief, human-friendly explanation of the agent's purpose and capabilities.

## When to Use This Agent
- Specific use cases where this agent excels
- Types of documents it works best with
- What questions it helps answer

## What to Expect
- Type of analysis provided
- Whether it provides grades (and what they mean)
- Number and style of comments typically generated
- Approximate cost per evaluation
```

### 2. Capabilities & Limitations
```markdown
## Capabilities
- ✅ Specific things this agent does well
- ✅ Unique features or perspectives
- ✅ Domain expertise areas

## Limitations
- ❌ What this agent doesn't do
- ❌ Types of content it struggles with
- ❌ Known biases or blind spots
- ⚠️ Special technical limitations (e.g., Link Verifier's non-LLM workflow)
```

### 3. Output Examples
```markdown
## Sample Output

### Analysis Example
[Brief excerpt showing the agent's analysis style]

### Comment Example
[Sample comment showing typical feedback style]

### Grade Distribution (if applicable)
- 90-100: What this means for this agent
- 70-89: ...
- etc.
```

### 4. Technical Details (For LLMs modifying the agent)
```markdown
## For LLMs Modifying This Agent

### Architecture Notes
- Which workflow this agent uses (standard vs special)
- Which instruction fields are actually used
- Any extendedCapabilityId considerations

### Key Design Decisions
- Why certain choices were made
- What makes this agent unique
- Core principles that should be preserved

### Modification Guidelines
- **When updating instructions**: Key things to preserve
- **Common pitfalls**: What changes tend to break this agent
- **Testing recommendations**: How to verify changes work

### Instruction Field Usage
| Field | Used? | Purpose | Notes |
|-------|-------|---------|-------|
| genericInstructions | ✅ | Main behavior | Core identity |
| analysisInstructions | ✅/❌ | ... | ... |
| gradeInstructions | ✅/❌ | ... | Only if agent grades |
| etc. | | | |

### Performance Considerations
- Typical token usage
- Cost optimization tips
- Known performance issues
```

### 5. Version History
```markdown
## Version History
- **v3** (2024-06-22): Added analysis instructions, fixed...
- **v2** (2024-06-15): Improved grading consistency
- **v1** (2024-06-01): Initial version
```

## Implementation Considerations

### Storage Options

1. **In Database**
   - Add `readme` field to AgentVersion table
   - Pros: Versioned with agent, single source of truth
   - Cons: Not easily browsable on GitHub

2. **Separate Files** (Recommended)
   - `/agents/readmes/[agent-id].md`
   - Pros: GitHub browsable, easy to edit
   - Cons: Need to keep in sync with versions

3. **Hybrid**
   - README in files, technical specs in DB
   - Best of both worlds

### Auto-Generation vs Manual

Some sections could be auto-generated:
- Version history (from DB)
- Instruction field usage (from actual agent data)
- Performance stats (from recent evaluations)
- Cost estimates (from historical data)

### Special Cases

**Link Verifier** needs extra clarity:
```markdown
## ⚠️ Special Implementation Note
This agent uses a custom non-LLM workflow. It does NOT use:
- analysisInstructions
- selfCritiqueInstructions  
- Standard comprehensiveAnalysis flow

Instead, it directly validates URLs and generates reports programmatically.
```

### Examples by Agent Type

**ASSESSOR Example (Eliezer Simulator)**
- Emphasize evaluation criteria
- Explain grading philosophy  
- Note characteristic style elements

**ENRICHER Example (Quantitative Forecaster)**
- Explain enrichment approach
- Show example forecasts
- Clarify confidence intervals

**ADVISOR Example (Clarity Coach)**
- Show before/after examples
- Explain advice philosophy
- Note tone and approach

**EXPLAINER Example**
- Show simplification examples
- Clarify target audience
- Note what gets preserved vs simplified

## Benefits

1. **For Users**
   - Understand what each agent offers
   - Choose the right agent for their needs
   - Set appropriate expectations

2. **For LLM Modifiers**
   - Understand design intent
   - Avoid breaking changes
   - Know what to test

3. **For Maintainers**
   - Document institutional knowledge
   - Track evolution over time
   - Onboard new contributors

## Next Steps

1. Create template README
2. Write README for one agent as example
3. Decide on storage approach
4. Consider auto-generation for some sections
5. Add README display to UI