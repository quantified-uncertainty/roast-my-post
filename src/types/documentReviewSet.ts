// Hero icons for document types
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";

import type { DocumentReview } from "./documentReview";

export interface DocumentReviewSetItem {
  id: string;
  title: string;
  icon: any; // Using any for simplicity, should match the IconType
  review: DocumentReview;
}

export interface DocumentReviewSetData {
  title: string;
  description: string;
  items: DocumentReviewSetItem[];
}

// Sample document reviews for the set
export const documentReviewSet: DocumentReviewSetData = {
  title: "AI Research Project",
  description: "Key documents for the epistemic impact estimation project",
  items: [
    {
      id: "proposal",
      title: "Research Proposal",
      icon: DocumentTextIcon,
      review: {
        agentId: "logic-evaluator",
        markdown: `
# AI for Epistemic Impact Estimation

This proposal presents an **AI tool** for **Epistemic Impact Estimation** that quantitatively evaluates how new information {{shifts AI beliefs:1}} to improve decision making and optimize research prioritization.

## Summary
The tool aims to measure the value of information by analyzing how it updates an AI agent's predictive distribution and influences its utility. The methodology suggests starting with narrow domains and simple metrics before scaling into a comprehensive forecasting ecosystem {{start small, think big:2}}.

## Introduction
We introduce the framework termed *Epistemic Impact Analysis (EIA)*, which formalizes the process of quantifying how information alters an agent's belief system {{foundational framework:3}}. This system is designed to evaluate how updated beliefs affect decision outcomes.

## Value Types and Distinctions
The proposal distinguishes between:
- **Instrumental (epistemic) value:** Information that directly improves decisions (e.g., research informing climate action).
- **Terminal value:** Information appreciated for intrinsic qualities (e.g., aesthetic value of rare art).  
Clarifying these distinctions helps emphasize both the utilitarian and inherent aspects of information value {{dual value focus:4}}.
        `,
        comments: {
          "1": {
            title: "Impact on Beliefs",
            description:
              "Emphasize how the tool measures changes in belief distributions and consider detailing which divergence metrics (such as KL divergence) will be used for quantitative analysis.",
            icon: DocumentTextIcon,
            color: { base: "bg-red-100 text-red-800" },
          },
          "2": {
            title: "Start Small, Think Big",
            description:
              "Clarify the initial domains and metrics targeted in the tool's early development. Providing concrete examples will ground the proposal and set clear milestones for scaling up.",
            icon: ClipboardDocumentCheckIcon,
            color: { base: "bg-blue-100 text-blue-800" },
          },
          "3": {
            title: "Foundational Framework",
            description:
              "Expand on the theoretical foundations of Epistemic Impact Analysis by citing related work or underlying assumptions. This will position the work within the broader context of value-of-information research.",
            icon: PresentationChartBarIcon,
            color: { base: "bg-green-100 text-green-800" },
          },
          "4": {
            title: "Dual Value Focus",
            description:
              "The discussion of instrumental versus terminal values is strong. Additional examples and insights on how these categories may overlap or interact could further enrich this section.",
            icon: ChatBubbleLeftRightIcon,
            color: { base: "bg-green-100 text-green-800" },
          },
        },
      },
    },
    {
      id: "technical-spec",
      title: "Technical Specification",
      icon: CodeBracketIcon,
      review: {
        agentId: "technical-accuracy-checker",
        markdown: `
# Technical Specification for Epistemic Impact Analysis System

## System Architecture

The proposed system will be built with a {{modular architecture:1}} that separates the following components:

1. **Input Processing Module:** Handles data ingestion and preprocessing.
2. **Belief Representation Module:** Maintains the AI agent's current belief state.
3. **Update Engine:** Implements various Bayesian and non-Bayesian update mechanisms.
4. **Utility Calculator:** Computes expected utility changes based on belief shifts.
5. **Visualization Interface:** Presents results to users in an interpretable format.

## Data Requirements

The system requires the following data types:

- **Structured knowledge:** From established databases and knowledge graphs.
- **Natural language inputs:** From research papers, reports, and other textual sources.
- **Numeric data sets:** Statistical information, experimental results, etc.
- **User preferences:** Represented as utility functions or constraints {{preference specification:2}}.

## Algorithmic Approaches

The core algorithms will implement:

1. **Bayesian belief updating:** For probabilistic representations.
2. **Neural belief networks:** For handling complex, high-dimensional belief spaces.
3. **Causal inference methods:** For tracking belief propagation across causal models.
4. **Information-theoretic metrics:** For quantifying information value {{metric selection:3}}.

## Implementation Plan

Development will proceed in phases:

1. **Phase 1 (3 months):** Prototype with simplified models in narrow domains.
2. **Phase 2 (6 months):** Expand to more complex belief representations and multiple domains.
3. **Phase 3 (9 months):** Integrate causal modeling and reasoning capabilities.
4. **Phase 4 (12 months):** Full system with comprehensive evaluation {{development timeline:4}}.
        `,
        comments: {
          "1": {
            title: "Modular Architecture",
            description:
              "Consider elaborating on how these modules will communicate with each other. Will you use an event-driven architecture, API-based communication, or something else?",
            icon: CodeBracketIcon,
            color: { base: "bg-purple-100 text-purple-800" },
          },
          "2": {
            title: "Preference Specification",
            description:
              "This is a challenging aspect. How will you handle conflicting preferences or uncertainty in utility functions? Consider discussing approaches from multi-objective optimization.",
            icon: ClipboardDocumentCheckIcon,
            color: { base: "bg-yellow-100 text-yellow-800" },
          },
          "3": {
            title: "Metric Selection",
            description:
              "Good selection of metrics. Consider adding specific implementations you plan to use, such as KL divergence, Jensen-Shannon divergence, or mutual information.",
            icon: PresentationChartBarIcon,
            color: { base: "bg-blue-100 text-blue-800" },
          },
          "4": {
            title: "Development Timeline",
            description:
              "The timeline seems ambitious. Consider adding decision points or evaluative milestones at the end of each phase to determine whether adjustments are needed.",
            icon: DocumentTextIcon,
            color: { base: "bg-red-100 text-red-800" },
          },
        },
      },
    },
    {
      id: "evaluation-methods",
      title: "Evaluation Methods",
      icon: ClipboardDocumentCheckIcon,
      review: {
        agentId: "statistical-reviewer",
        markdown: `
# Evaluation Methods for Epistemic Impact Analysis

## Success Criteria

The effectiveness of the Epistemic Impact Analysis system will be measured against the following criteria:

1. **Accuracy:** How well does the system predict the actual utility changes resulting from new information?
2. **Consistency:** Does the system produce similar evaluations for similar information inputs?
3. **Scalability:** Can the system handle increasingly complex and diverse information sources?
4. **Usability:** How intuitive and accessible is the system to various stakeholders {{user experience:1}}?

## Benchmark Datasets

We will evaluate the system using:

1. **Historical research impact datasets:** Tracing how key research findings influenced subsequent work.
2. **Expert-annotated information value datasets:** Created specifically for this project.
3. **Forecasting accuracy records:** From prediction markets and expert forecasts {{comparative analysis:2}}.

## Evaluation Protocols

Evaluation will be conducted through:

1. **Controlled experiments:** With predefined ground truth for information value.
2. **User studies:** To assess how the system influences human decision-making.
3. **Longitudinal tracking:** Of how information valuations correspond to real-world outcomes {{long-term validation:3}}.

## Baseline Comparisons

We will compare our system against:

1. **Citation count and impact factor metrics:** Traditional academic impact measures.
2. **Expert evaluations:** Blind assessments by domain specialists.
3. **Economic value indicators:** Such as market movements following information release.
4. **Alternative information value frameworks:** From the literature {{baseline selection:4}}.
        `,
        comments: {
          "1": {
            title: "User Experience",
            description:
              "Consider adding specific usability metrics and testing methodologies. How will you capture user satisfaction, ease of use, and learnability?",
            icon: ChatBubbleLeftRightIcon,
            color: { base: "bg-green-100 text-green-800" },
          },
          "2": {
            title: "Comparative Analysis",
            description:
              "Good approach using existing datasets. Consider adding how you'll normalize across different domains to ensure fair comparison.",
            icon: PresentationChartBarIcon,
            color: { base: "bg-blue-100 text-blue-800" },
          },
          "3": {
            title: "Long-term Validation",
            description:
              "This is crucial but challenging. Consider specifying a timeframe and methodology for tracking outcomes. How will you attribute outcomes to specific information?",
            icon: DocumentTextIcon,
            color: { base: "bg-yellow-100 text-yellow-800" },
          },
          "4": {
            title: "Baseline Selection",
            description:
              "Strong set of baselines. Consider adding a discussion of the limitations of each baseline to highlight where your system provides unique value.",
            icon: ClipboardDocumentCheckIcon,
            color: { base: "bg-purple-100 text-purple-800" },
          },
        },
      },
    },
  ],
};