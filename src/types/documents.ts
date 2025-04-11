// Document collection type definitions
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";

import type { DocumentReview } from "./documentReview";

export interface Document {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: any;
  review: DocumentReview;
}

export interface DocumentsCollection {
  documents: Document[];
}

// Sample documents data
export const documentsCollection: DocumentsCollection = {
  documents: [
    {
      id: "epistemic-impact-analysis",
      slug: "epistemic-impact-analysis",
      title: "Epistemic Impact Analysis",
      description: "A framework for evaluating the impact of new information on belief systems",
      icon: DocumentTextIcon,
      review: {
        markdown: `
# Developing Value Estimation Systems for AI Safety and EA Projects

This document outlines a comprehensive framework for creating systems that can evaluate AI safety and EA projects. It synthesizes ideas around value estimation, knowledge management, and evaluation methodologies, with a focus on creating consistent, principled assessments.

## Core Concepts and Requirements

### Value Estimation Systems

The central concept involves developing systems that can estimate the value of various entities (projects, initiatives, contributions) in a consistent and principled manner. Key requirements include:

- Ability to assign numerical values and/or qualitative assessments to different items
- Ensuring consistency across multiple evaluations
- Managing uncertainty in evaluations
- Creating persistent knowledge repositories (wikis) to store and refine evaluations
- Applying these evaluations to both controlled environments (like games) and real-world projects

### Knowledge Management Architecture

A critical component is the creation of knowledge repositories that can store and organize evaluations. The proposed architecture includes:

- Project-specific wiki pages with dedicated sections
- Scratchpad areas where evaluation systems (including LLMs) can work through their reasoning
- Structured data repositories for metrics and links
- Versioned evaluation histories to track changes over time

This would ideally be implemented as a lightweight, locally-stored wiki system with appropriate API access for automated systems to read and update.

### Meta-Evaluation Loop

An important feature is the ability to evaluate the evaluation system itself, creating a recursive improvement process:

- The system estimates the value of different projects
- It also estimates the value of contributions to its knowledge base
- Performance in application domains (games, real-world decisions) feeds back to improve valuations
- The system continually refines its evaluation methodologies based on results

## Evaluation Challenges and Solutions

### Consistency in LLM Evaluations

A significant concern is that LLM evaluations might be inconsistent or random. Proposed solutions include:

- Running multiple evaluations to generate distributions rather than point estimates
- Creating plots and visualizations to represent uncertainty
- Using ensemble methods across different models
- Implementing mathematical frameworks to enforce consistency {{consistency methods:1}}

### Utility Theory Axiom Satisfaction

To ensure evaluations are principled, they should satisfy the axioms of utility theory:

- Completeness: For any two options A and B, the system should consistently express A>B, B>A, or A=B
- Transitivity: If A>B and B>C, then A>C
- Independence: Irrelevant alternatives should not affect pairwise rankings
- Continuity: Preferences should be continuous across probability mixtures {{axiom verification:2}}

Specific testing methodologies have been proposed to verify adherence to these axioms and detect violations.
`,
        comments: {
          "1": {
            title: "Consistency Methods",
            description:
              "Consider exploring specific methods for ensuring consistency across multiple LLM evaluations. Perhaps techniques like majority voting, Bayesian model averaging, or calibration techniques could be relevant here.",
            icon: ClipboardDocumentCheckIcon,
            color: { base: "bg-blue-100 text-blue-800" },
          },
          "2": {
            title: "Axiom Verification",
            description:
              "It would be helpful to elaborate on how these axioms would be empirically tested in the context of AI systems. What specific test cases or experiments would verify that an LLM-based evaluation system satisfies these properties?",
            icon: PresentationChartBarIcon,
            color: { base: "bg-green-100 text-green-800" },
          },
        },
      },
    },
    {
      id: "value-learning",
      slug: "value-learning",
      title: "Value Learning Systems",
      description: "Techniques for AI systems to learn and reflect human values",
      icon: ChatBubbleLeftRightIcon,
      review: {
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
    },
    {
      id: "information-hazards",
      slug: "information-hazards",
      title: "Information Hazards Framework",
      description: "A framework for analyzing potential risks of information sharing",
      icon: ClipboardDocumentCheckIcon,
      review: {
        markdown: `
# Information Hazards: A Risk Framework

This document presents a framework for identifying, evaluating, and mitigating information hazards - cases where sharing or publishing information could create risks or harms.

## Information Hazard Categories

### Capability Acceleration Hazards

Information that could accelerate the development of potentially harmful technologies:

- Algorithm details that reduce development barriers
- Engineering solutions to known technical bottlenecks
- Novel approaches that open unexplored capability paths {{capability details:1}}

### Security Vulnerabilities

Information about vulnerabilities in existing systems:

- Zero-day exploits in widely used software
- Design flaws in critical infrastructure
- Weaknesses in security protocols before patches are available

### Dual-Use Information

Knowledge that has legitimate beneficial uses but could be repurposed for harm:

- Biological research with both medical and weaponization applications
- Privacy tools that enable both legitimate privacy and illegal activities
- Automation techniques applicable to both beneficial and harmful systems {{dual-use considerations:2}}

## Evaluation Methodology

When evaluating potential information hazards, consider:

1. **Counterfactual acceleration**: Would this information meaningfully accelerate harmful capabilities beyond baseline development?
2. **Diffusion characteristics**: How widely would this information spread, and to which actors?
3. **Defensive value**: Does revealing this information enable important defensive measures?
4. **Knowledge distribution**: Is this information likely to be discovered independently by multiple groups?

## Mitigation Strategies

When information presents potential hazards, consider these mitigation approaches:

1. **Staged disclosure**: Release to progressively wider audiences with monitoring at each stage
2. **Abstraction level adjustment**: Share higher-level insights without implementation details
3. **Access controls**: Limit distribution to verified, responsible actors
4. **Paired defenses**: Release alongside defensive measures or countermeasures
`,
        comments: {
          "1": {
            title: "Capability Details",
            description:
              "This section would benefit from distinguishing between different types of capability acceleration - some might advance general capabilities broadly while others might unlock specific concerning applications.",
            icon: DocumentTextIcon,
            color: { base: "bg-yellow-100 text-yellow-800" },
          },
          "2": {
            title: "Dual-Use Considerations",
            description:
              "Consider addressing how to weigh the positive applications against potential misuse, perhaps through a structured risk-benefit analysis framework specific to dual-use technologies.",
            icon: ClipboardDocumentCheckIcon,
            color: { base: "bg-blue-100 text-blue-800" },
          },
        },
      },
    }
  ]
};