import type { Document } from "@/types/documents";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export const document: Document = {
  id: "information-hazards",
  slug: "information-hazards",
  title: "Information Hazards Framework",
  description:
    "A framework for analyzing potential risks of information sharing",
  author: "Bill Strong",
  publishedDate: "2011-03-01",
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
};
