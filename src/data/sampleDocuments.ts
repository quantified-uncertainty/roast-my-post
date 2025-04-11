// Sample document data 
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PresentationChartBarIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

import type { DocumentsCollection } from "@/types/documents";

export const documentsCollection: DocumentsCollection = {
  documents: [
    {
      id: "epistemic-impact-analysis",
      slug: "epistemic-impact-analysis",
      title: "Epistemic Impact Analysis",
      description:
        "A framework for evaluating the impact of new information on belief systems",
      icon: DocumentTextIcon,
      content: `
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
- Implementing mathematical frameworks to enforce consistency

### Utility Theory Axiom Satisfaction

To ensure evaluations are principled, they should satisfy the axioms of utility theory:

- Completeness: For any two options A and B, the system should consistently express A>B, B>A, or A=B
- Transitivity: If A>B and B>C, then A>C
- Independence: Irrelevant alternatives should not affect pairwise rankings
- Continuity: Preferences should be continuous across probability mixtures

Specific testing methodologies have been proposed to verify adherence to these axioms and detect violations.
      `,
      reviews: [
        {
          agentId: "factual-validator",
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
        {
          agentId: "clarity-coach",
          markdown: `
# Developing Value Estimation Systems for AI Safety and EA Projects

This document provides a framework for creating evaluation systems for AI safety and EA projects. It covers key concepts in value estimation, knowledge management architecture, and evaluation methodologies.

## Core Concepts and Requirements

The document introduces several important concepts:

1. **Value Estimation Systems** - Systems that can consistently evaluate different projects and contributions
2. **Knowledge Management Architecture** - Structures for storing and organizing evaluations
3. **Meta-Evaluation Loop** - Process for continuously improving the evaluation system itself

## Clarity Assessment

Overall, the document presents a clear conceptual framework, but could benefit from:

- More concrete examples illustrating abstract concepts {{examples needed:1}}
- Clearer distinction between theoretical foundations and implementation details
- Simplified language in some technical sections to improve accessibility {{technical jargon:2}}

The structure is logical, with a progression from core concepts to specific challenges and solutions, but some sections could be more tightly connected.
`,
          comments: {
            "1": {
              title: "Examples Needed",
              description: 
                "This document would benefit from specific examples showing how these evaluation systems would work in practice. Consider adding a case study or worked example showing the full workflow.",
              icon: DocumentTextIcon,
              color: { base: "bg-amber-100 text-amber-800" },
            },
            "2": {
              title: "Technical Jargon",
              description:
                "Some sections use specialized terminology that might be unfamiliar to readers outside the field. Consider adding brief explanations or a glossary for terms like 'utility theory axioms' and 'meta-evaluation'.",
              icon: ChatBubbleLeftRightIcon,
              color: { base: "bg-purple-100 text-purple-800" },
            },
          },
        },
      ],
    },
    {
      id: "value-learning",
      slug: "value-learning",
      title: "Value Learning Systems",
      description:
        "Techniques for AI systems to learn and reflect human values",
      icon: ChatBubbleLeftRightIcon,
      content: `
# Value Learning for AI Systems

This document explores approaches to value learning in AI systems, with a focus on methods that can accurately capture, represent, and reflect human values.

## Key Challenges in Value Learning

Value learning in AI systems faces several fundamental challenges:

- **Value Complexity**: Human values are complex, context-dependent, and occasionally contradictory
- **Distribution Shift**: Values may change across cultures, demographics, and time periods
- **Specification Problems**: Difficulty in precisely specifying what we mean by "values"
- **Feedback Limitations**: Limited feedback from human evaluators on complex value questions

## Approaches to Value Learning

### Inverse Reinforcement Learning

Inverse Reinforcement Learning (IRL) attempts to infer the reward function that a human demonstrator is optimizing:

- Observes human behavior and infers underlying values
- Assumes humans are approximately rational agents
- Can struggle with sub-optimal human behavior
- May require extensive demonstration data

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
    },
    {
      id: "information-hazards",
      slug: "information-hazards",
      title: "Information Hazards Framework",
      description:
        "A framework for analyzing potential risks of information sharing",
      icon: ClipboardDocumentCheckIcon,
      content: `
# Information Hazards: A Risk Framework

This document presents a framework for identifying, evaluating, and mitigating information hazards - cases where sharing or publishing information could create risks or harms.

## Information Hazard Categories

### Capability Acceleration Hazards

Information that could accelerate the development of potentially harmful technologies:

- Algorithm details that reduce development barriers
- Engineering solutions to known technical bottlenecks
- Novel approaches that open unexplored capability paths

### Security Vulnerabilities

Information about vulnerabilities in existing systems:

- Zero-day exploits in widely used software
- Design flaws in critical infrastructure
- Weaknesses in security protocols before patches are available

### Dual-Use Information

Knowledge that has legitimate beneficial uses but could be repurposed for harm:

- Biological research with both medical and weaponization applications
- Privacy tools that enable both legitimate privacy and illegal activities
- Automation techniques applicable to both beneficial and harmful systems

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
      reviews: [
        {
          agentId: "factual-validator",
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
        {
          agentId: "bias-detector",
          markdown: `
# Information Hazards: A Risk Framework

This document presents a framework for analyzing information hazards. From a bias perspective, the framework is generally balanced but has several areas where additional perspectives would strengthen the analysis.

## Bias Assessment

The document demonstrates awareness of multiple stakeholder perspectives but could be enhanced by:

- Incorporating more diverse global and cultural perspectives on information risk {{cultural perspectives:1}}
- Acknowledging potential power dynamics in who decides what information is "hazardous"
- Considering how different communities may be differently impacted by both information sharing and information restrictions

## Representation Analysis

The examples provided generally represent mainstream security considerations but could be expanded to include:

- Perspectives from marginalized communities on information access
- Consideration of how mitigation strategies may disproportionately affect certain groups
- Examples from a broader range of domains beyond traditional security concerns {{representational diversity:2}}

Overall, the framework provides a useful starting point but would benefit from more diverse perspectives on both hazards and their mitigations.
`,
          comments: {
            "1": {
              title: "Cultural Perspectives",
              description:
                "The document would benefit from explicitly addressing how conceptions of information hazards may vary across different cultural, geographic, and socioeconomic contexts. What one society considers a hazard might be viewed differently in another.",
              icon: MagnifyingGlassIcon,
              color: { base: "bg-teal-100 text-teal-800" },
            },
            "2": {
              title: "Representational Diversity",
              description:
                "Consider expanding the examples to include information hazards in domains like public health communication, economic data, or social science research. This would provide a more comprehensive view of how information hazards manifest across different fields.",
              icon: ChatBubbleLeftRightIcon,
              color: { base: "bg-purple-100 text-purple-800" },
            },
          },
        },
      ],
    },
  ],
};