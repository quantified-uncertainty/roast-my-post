import { SVGProps } from "react";

// Import all agent icons via SVGR (converted to React components at build time)
import EaEpistemicAuditorIcon from "../../public/agent-icons/ea-epistemic-auditor.svg";
import EpistemicVerificationIcon from "../../public/agent-icons/epistemic-verification.svg";
import FactCheckerIcon from "../../public/agent-icons/fact-checker.svg";
import ForecastCheckerIcon from "../../public/agent-icons/forecast-checker.svg";
import LinkVerifierIcon from "../../public/agent-icons/link-verifier.svg";
import MathCheckerIcon from "../../public/agent-icons/math-checker.svg";
import SpellingGrammarIcon from "../../public/agent-icons/spelling-grammar.svg";

/**
 * AgentIcon component
 * Displays an icon for a system agent based on its ID
 *
 * Uses SVGR to inline SVG icons at build time for fill="currentColor" support.
 */

interface AgentIconProps {
  agentId?: string;
  size?: number;
  className?: string;
}

// Map agent icon names to their SVGR components
const iconMap: Record<string, React.FC<SVGProps<SVGSVGElement>>> = {
  "ea-epistemic-auditor": EaEpistemicAuditorIcon,
  "epistemic-verification": EpistemicVerificationIcon,
  "fact-checker": FactCheckerIcon,
  "forecast-checker": ForecastCheckerIcon,
  "link-verifier": LinkVerifierIcon,
  "math-checker": MathCheckerIcon,
  "spelling-grammar": SpellingGrammarIcon,
};

/**
 * Maps agent ID to icon name
 * Strips "system-" prefix from agent ID to get the icon name
 */
function getIconName(agentId: string): string {
  // Strip "system-" prefix if present
  return agentId.startsWith('system-')
    ? agentId.replace('system-', '')
    : agentId;
}

export function AgentIcon({ agentId, size = 20, className = '' }: AgentIconProps) {
  if (!agentId) {
    return null;
  }

  const iconName = getIconName(agentId);
  const IconComponent = iconMap[iconName];

  if (!IconComponent) {
    console.warn(`AgentIcon: No icon found for agent ID "${agentId}" (icon name: "${iconName}")`);
    return null;
  }

  return (
    <IconComponent
      width={size}
      height={size}
      className={`inline-block text-gray-500 ${className}`}
      aria-hidden="true"
    />
  );
}
