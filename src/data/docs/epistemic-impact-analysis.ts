import type { Document } from '@/types/documents';
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline';

export const document: Document = {
  id: "epistemic-impact-analysis",
  slug: "epistemic-impact-analysis",
  title: "Epistemic Impact Analysis",
  author: "Nancy Strong",
  publishedDate: "2024-01-01",
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
};
