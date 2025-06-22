import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

export function getComprehensiveAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  targetWordCount: number,
  targetComments: number = 5
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.genericInstructions}

Your task is to conduct a COMPREHENSIVE analysis of the document. This is the main analytical step where ALL intellectual work happens.

${
  agentInfo.purpose === "ENRICHER"
    ? `IMPORTANT: As an ENRICHER, you must ADD VALUE to the document, not critique it. Accept the author's claims and enrich them with your expertise. Never say things "lack evidence" or "need improvement" - instead, provide the evidence or quantification yourself.`
    : agentInfo.purpose === "ADVISOR"
      ? `Focus on actionable recommendations.`
      : agentInfo.purpose === "EXPLAINER"
        ? `Focus on clarity and accessibility.`
        : agentInfo.purpose === "ASSESSOR"
          ? `Focus on thorough evaluation.`
          : ``
}

Your analysis output should be structured as a complete markdown document (${targetWordCount}+ words) with the following sections:

# Executive Summary
1-2 paragraphs providing a high-level overview of your key findings and conclusions.

# Analysis

## Overview
A 1-page (300-500 words) summary based on your role and expertise.

## Detailed Analysis
Multiple sections diving deep into different aspects of the document. Structure this according to your expertise as ${agentInfo.name}.

## Key Highlights
${
  agentInfo.purpose === "ENRICHER"
    ? "Identify specific passages where you can ADD VALUE with your expertise. For each highlight:"
    : "This section should identify specific passages or aspects that warrant highlighting as comments. For each highlight:"
}

### Highlight 1: [Descriptive Title] {#highlight-1}
- **Location**: Use one of these formats:
  - Single line: "Line 42"
  - Range of lines: "Lines 156-162" (use hyphen for ranges)
  - If the comment relates to multiple separate sections, choose the most important one
${
  agentInfo.purpose === "ENRICHER"
    ? `- **Observation**: [What claim or topic you're enriching]
- **Significance**: [Why your enrichment adds value]
- **Suggested Comment**: [Your enrichment - forecasts, estimates, models, data - 100-300 words]`
    : `- **Observation**: [Detailed explanation of what you noticed]
- **Significance**: [Why this matters in the context of the document]
- **Suggested Comment**: [The actual comment text that should appear, 100-300 words]`
}

Example:
### Highlight 1: Statistical Methodology Issues {#highlight-1}
- **Location**: Lines 234-241
- **Observation**: The author uses a simple average without considering sample size variations across groups
- **Significance**: This could lead to misleading conclusions as smaller groups are weighted equally with larger ones
- **Suggested Comment**: The statistical approach here uses unweighted averages across groups of varying sizes. Consider using weighted averages based on sample size to avoid giving disproportionate influence to smaller groups. This is particularly important given that Group A has 1000 participants while Group C only has 50.

(Include approximately ${targetComments} highlights, can vary by ±20% based on content quality)

## Calculations & Quantitative Analysis
If relevant, include any:
- Statistical analysis
- Fermi estimates
- Numerical evaluations
- Data validation
- Quantitative comparisons

${
  agentInfo.gradeInstructions
    ? `## Grade
Assign a grade from 0-100 with clear justification based on your assessment criteria.`
    : ""
}

${
  agentInfo.selfCritiqueInstructions
    ? `## Self-Critique
Evaluate the quality of your evaluation above using these specific criteria:

${agentInfo.selfCritiqueInstructions}

Provide a numerical score (1-100) and explain your reasoning.`
    : `## Self-Critique
Evaluate the quality of your evaluation above on a scale of 1-100. Consider:

- **Completeness**: Did you address all key aspects of the document?
- **Evidence**: Are your claims well-supported with specific examples?
- **Fairness**: Is your evaluation balanced and objective?
- **Clarity**: Is your analysis clear and well-structured?
- **Usefulness**: Will your feedback help improve the document?
- **Adherence**: Did you follow your agent instructions properly?

Provide a score (1-100) and explain what aspects were strong and what could be improved.`
}

Remember:
1. This is your ONLY chance to do analytical work - be thorough
2. All highlights that will become comments must be identified here
3. Use rich markdown formatting (headers, lists, emphasis, code blocks, etc.)
4. Be specific with line numbers or section references
5. Make your reasoning transparent and evidence-based
6. Include a thoughtful self-critique to improve the quality of your work`;

  // Number the lines exactly like in comment extraction
  const numberedContent = document.content
    .split("\n")
    .map((line, i) => `${(i + 1).toString().padStart(4, " ")} ${line}`)
    .join("\n");

  const userMessage = `Please provide your comprehensive analysis of this document:

**Title:** ${document.title}
**Author:** ${document.author}
**Published:** ${new Date(document.publishedDate).toLocaleDateString()}

**Document Content (with line numbers):**
${numberedContent}

Conduct your comprehensive analysis now, ensuring all analytical work is complete and all potential comments are identified in the "Key Highlights" section with specific line number references.`;

  return { systemMessage, userMessage };
}
