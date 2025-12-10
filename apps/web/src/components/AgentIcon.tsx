import { SVGProps } from "react";

// Import inline React SVG components (Turbopack compatible)
import {
  EaFallacyAuditorIcon,
  FallacyVerificationIcon,
  FallacyCheckIcon,
  FactCheckerIcon,
  ForecastCheckerIcon,
  LinkVerifierIcon,
  MathCheckerIcon,
  SpellingGrammarIcon,
} from "./icons/AgentIcons";

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
  // New agent IDs (current)
  "ea-fallacy-auditor": EaFallacyAuditorIcon,
  "fallacy-check": FallacyCheckIcon,
  "fallacy-verification": FallacyVerificationIcon,

  // Other agents
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
    // Only warn for system agents (which should have icons)
    // User-created agents with random IDs are expected to not have icons
    if (agentId.startsWith('system-')) {
      console.warn(`AgentIcon: No icon found for system agent ID "${agentId}" (icon name: "${iconName}")`);
    }
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
