import { SVGProps } from "react";

// Import inline React SVG components (Turbopack compatible)
import {
  CustomIcon,
  DetailsIcon,
  EaForumIcon,
  EvaluationIcon,
  EvaluatorIcon,
  LessWrongIcon,
  OverviewIcon,
  VersionsIcon,
} from "./icons/AppIcons";

/**
 * AppIcon component
 * Displays an icon from the /app-icons/ directory
 *
 * SVG icons are inlined at build time via SVGR to support fill="currentColor",
 * allowing icons to inherit text color from parent elements via Tailwind color classes.
 *
 * Available icons:
 * - custom
 * - details
 * - ea-forum
 * - evaluation
 * - evaluator
 * - lesswrong
 * - overview
 * - versions
 */

interface AppIconProps {
  name: string;
  size?: number;
  className?: string;
}

// Map icon names to their imported SVG components
const iconMap: Record<string, React.FC<SVGProps<SVGSVGElement>>> = {
  custom: CustomIcon,
  details: DetailsIcon,
  "ea-forum": EaForumIcon,
  evaluation: EvaluationIcon,
  evaluator: EvaluatorIcon,
  lesswrong: LessWrongIcon,
  overview: OverviewIcon,
  versions: VersionsIcon,
};

/**
 * Generic component for rendering app-level icons from /app-icons/
 *
 * Supports fill="currentColor" in SVGs, so you can control color via text color classes.
 *
 * @example
 * <AppIcon name="evaluation" size={16} className="text-gray-500" />
 * <AppIcon name="overview" size={24} className="text-blue-600" />
 * <AppIcon name="ea-forum" size={20} className="text-blue-500 hover:text-blue-700" />
 */
export function AppIcon({ name, size = 20, className = '' }: AppIconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <IconComponent
      width={size}
      height={size}
      className={`inline-block ${className}`}
      aria-hidden="true"
    />
  );
}
