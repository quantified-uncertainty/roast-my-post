"use client";

import SVG, { Props as SVGComponentProps } from "react-inlinesvg";

type IconProps = Omit<SVGComponentProps, "src"> & {
  size?: number;
};

// Helper to create icon components from SVG files in public/agent-icons/
const createIcon = (filename: string) => {
  const IconComponent = ({ size, width, height, ...props }: IconProps) => (
    <SVG
      src={`/agent-icons/${filename}.svg`}
      width={size ?? width}
      height={size ?? height}
      {...props}
    />
  );
  IconComponent.displayName = filename;
  return IconComponent;
};

export const EaFallacyAuditorIcon = createIcon("ea-fallacy-auditor");
export const FallacyVerificationIcon = createIcon("fallacy-verification");
export const FallacyCheckIcon = createIcon("fallacy-check");
export const FactCheckerIcon = createIcon("fact-checker");
export const ForecastCheckerIcon = createIcon("forecast-checker");
export const LinkVerifierIcon = createIcon("link-verifier");
export const MathCheckerIcon = createIcon("math-checker");
export const SpellingGrammarIcon = createIcon("spelling-grammar");
