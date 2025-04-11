import type { ForwardRefExoticComponent, SVGProps } from "react";

import {
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  FlagIcon,
  LightBulbIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";

type IconType = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & {
    title?: string;
    titleId?: string;
  }
>;

export interface Comment {
  title: string;
  description: string;
  icon: IconType;
  color: {
    base: string;
  };
}

export interface DocumentReview {
  markdown: string;
  comments: Record<string, Comment>;
  agentId: string; // Reference to the evaluationAgent that created this review
}

export const documentReview: DocumentReview = {
  agentId: "logic-evaluator", // Default agent
  markdown: `
# AI for Epistemic Impact Estimation

This proposal presents an **AI tool** for **Epistemic Impact Estimation** that quantitatively evaluates how new information {{shifts AI beliefs:1}} to improve decision making and optimize research prioritization.

## Summary
The tool aims to measure the value of information by analyzing how it updates an AI agent’s predictive distribution and influences its utility. The methodology suggests starting with narrow domains and simple metrics before scaling into a comprehensive forecasting ecosystem {{start small, think big:2}}.

## Introduction
We introduce the framework termed *Epistemic Impact Analysis (EIA)*, which formalizes the process of quantifying how information alters an agent's belief system {{foundational framework:3}}. This system is designed to evaluate how updated beliefs affect decision outcomes.

## Value Types and Distinctions
The proposal distinguishes between:
- **Instrumental (epistemic) value:** Information that directly improves decisions (e.g., research informing climate action).
- **Terminal value:** Information appreciated for intrinsic qualities (e.g., aesthetic value of rare art).  
Clarifying these distinctions helps emphasize both the utilitarian and inherent aspects of information value {{dual value focus:4}}.

## Framework Components
The EIA system is built upon three inputs:
- **I (Information):** The data, evidence, or arguments provided.
- **A (AI Agent):** The entity that updates its beliefs.
- **U (Utility):** The utility function representing specific preferences.  
The output, **V(I, A, U)**, estimates the expected benefit derived from these updates {{core components defined:5}}.

## Applications
If successfully implemented, this system can:
- Quantitatively assess the value of research contributions.
- Enhance AI agents’ performance via iterative improvements.
- Guide human decision-makers on where to focus efforts.
- Inform effective resource allocation based on expected epistemic gains  
{{real-world impact:6}}.

## Formal Notation and Analysis Metrics
The proposal employs formal notations such as **P(Q|A)** for the agent’s initial prediction and **P(Q|A,I)** after information is incorporated. Key analysis metrics include:
1. **Belief Change Magnitude:** Quantified through divergence metrics (e.g., KL divergence).
2. **Change Profundity:** Assessing the breadth of impact on dependent beliefs.
3. **Impact Importance:** Calculating the expected shift in utility.
Providing further detail on these computations will ensure clarity and replicability {{metric clarity:7}}.

## Visual Aids
Integrating detailed diagrams to illustrate the workflow—from information input to belief updating and resulting utility impact—can significantly enhance comprehension {{diagram recommendation:8}}.
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
      icon: FlagIcon,
      color: { base: "bg-blue-100 text-blue-800" },
    },
    "3": {
      title: "Foundational Framework",
      description:
        "Expand on the theoretical foundations of Epistemic Impact Analysis by citing related work or underlying assumptions. This will position the work within the broader context of value-of-information research.",
      icon: LightBulbIcon,
      color: { base: "bg-green-100 text-green-800" },
    },
    "4": {
      title: "Dual Value Focus",
      description:
        "The discussion of instrumental versus terminal values is strong. Additional examples and insights on how these categories may overlap or interact could further enrich this section.",
      icon: LightBulbIcon,
      color: { base: "bg-green-100 text-green-800" },
    },
    "5": {
      title: "Core Components Defined",
      description:
        "Clarify each component (I, A, U) by outlining the necessary constraints, assumptions, and potential limitations. Addressing edge cases will improve the overall robustness of the framework.",
      icon: WrenchIcon,
      color: { base: "bg-purple-100 text-purple-800" },
    },
    "6": {
      title: "Real-world Impact",
      description:
        "The applications are promising; consider integrating real-world case studies or scenarios to illustrate how this system could be deployed and its potential benefits.",
      icon: ChatBubbleLeftIcon,
      color: { base: "bg-green-100 text-green-800" },
    },
    "7": {
      title: "Metric Clarity",
      description:
        "Further detail on the computation of metrics such as divergence and expected utility differences will strengthen the proposal. Consider discussing how uncertainty and noise are addressed.",
      icon: WrenchIcon,
      color: { base: "bg-purple-100 text-purple-800" },
    },
    "8": {
      title: "Diagram Recommendation",
      description:
        "A well-designed diagram or set of visual aids would clarify the workflow and interconnections between information input, belief updating, and utility impact.",
      icon: ChatBubbleLeftIcon,
      color: { base: "bg-green-100 text-green-800" },
    },
  },
};
