import type { Document } from '@/types/documents';
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

export const document: Document = {
  id: "value-learning",
  slug: "value-learning",
  title: "Value Learning Systems",
  author: "Bill Stronger",
  publishedDate: "2024-01-01",
  reviews: [
    {
      agentId: "clarity-coach",
      markdown: `
# Value Learning for AI Systems

This document explores approaches to value learning in AI systems, with a focus on methods that can accurately capture, represent, and reflect human values.

## Key Challenges in Value Learning

Value learning in AI systems faces several fundamental challenges:

- **Value Complexity**: Human values are complex, context-dependent, and occasionally contradictory
- **Distribution Shift**: Values may change across cultures, demographics, and time periods
- **Specification Problems**: Difficulty in precisely specifying what we mean by "values"
- **Feedback Limitations**: Limited feedback from human evaluators on complex value questions {{value feedback:1}}

## Approaches to Value Learning

### Inverse Reinforcement Learning

Inverse Reinforcement Learning (IRL) attempts to infer the reward function that a human demonstrator is optimizing:

- Observes human behavior and infers underlying values
- Assumes humans are approximately rational agents
- Can struggle with sub-optimal human behavior
- May require extensive demonstration data {{IRL limitations:2}}

### Stated Preference Methods

These approaches directly elicit value judgments from humans:

- Structured surveys and questionnaires
- Pairwise comparisons between scenarios
- Hypothetical choices and trade-offs
- Multi-stakeholder deliberation processes

### Hybrid Approaches

Modern systems increasingly use hybrid approaches:

- Bootstrapping from multiple value learning methods
- Constitutional AI with explicit principles and iterative refinement
- Debate-based approaches where AI systems argue different value perspectives
- Recursive evaluation frameworks that meta-evaluate the evaluation process itself

## Implementation Considerations

Practical implementation of value learning systems requires:

- Diverse representation in human feedback sources
- Robust aggregation of potentially conflicting values
- Monitoring for value drift over time
- Transparent documentation of value learning limitations
`,
      comments: {
        "1": {
          title: "Value Feedback",
          description:
            "Consider discussing methods for increasing the bandwidth of human feedback, such as structured evaluation protocols, visualization tools, or comparative feedback approaches.",
          icon: ChatBubbleLeftRightIcon,
          color: { base: "bg-purple-100 text-purple-800" },
        },
        "2": {
          title: "IRL Limitations",
          description:
            "This section could benefit from discussing modern advances in IRL that attempt to address some of these limitations, such as Bayesian IRL, Maximum Entropy IRL, or Adversarial IRL approaches.",
          icon: CodeBracketIcon,
          color: { base: "bg-red-100 text-red-800" },
        },
      },
    },
    {
      agentId: "logic-evaluator",
      markdown: `
# Value Learning for AI Systems

This document presents various approaches to value learning in AI systems. The logical structure and argumentation are generally sound, but there are a few areas where the logical flow could be strengthened.

## Logical Analysis

- The document correctly identifies the key challenges in value learning, establishing a clear problem statement
- There is a logical progression from challenges to approaches to implementation considerations
- The relationship between the stated challenges and the proposed approaches is generally well-established

## Areas for Logical Improvement

- The section on hybrid approaches could more explicitly explain how these methods address the specific challenges outlined earlier {{logical connection:1}}
- The document sometimes presents claims without sufficient supporting evidence or reasoning {{evidential basis:2}}
- Some concepts appear to have implicit assumptions that should be made explicit for a complete logical analysis

Overall, the document provides a logically coherent overview of value learning approaches, but would benefit from more explicit reasoning chains and evidential support for key claims.
`,
      comments: {
        "1": {
          title: "Logical Connection",
          description:
            "The hybrid approaches section would be strengthened by explicitly mapping each hybrid method to the specific challenges it addresses. This would create a clearer logical thread throughout the document.",
          icon: ScaleIcon,
          color: { base: "bg-blue-100 text-blue-800" },
        },
        "2": {
          title: "Evidential Basis",
          description:
            "Several claims about the effectiveness of various approaches lack supporting evidence. Consider citing empirical studies, theoretical guarantees, or at minimum clarifying the reasoning behind these assessments.",
          icon: ClipboardDocumentCheckIcon,
          color: { base: "bg-amber-100 text-amber-800" },
        },
      },
    },
  ],
};
