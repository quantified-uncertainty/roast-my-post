"use client";

import { useEffect, useState } from "react";

/**
 * AppIcon component
 * Displays an icon from the /app-icons/ directory
 *
 * SVG icons are inlined to support fill="currentColor", allowing icons to inherit
 * text color from parent elements via Tailwind color classes.
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

// Cache raw SVG content (without size modifications)
const svgCache = new Map<string, string>();

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
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    const fetchSvg = async () => {
      let rawSvg: string;

      // Check cache first
      if (svgCache.has(name)) {
        rawSvg = svgCache.get(name)!;
      } else {
        try {
          const response = await fetch(`/app-icons/${name}.svg`);
          if (response.ok) {
            rawSvg = await response.text();
            svgCache.set(name, rawSvg);
          } else {
            return;
          }
        } catch (error) {
          console.error(`Failed to load icon: ${name}`, error);
          return;
        }
      }

      // Apply size to the SVG content (not cached with size)
      const modifiedSvg = rawSvg.replace(
        /<svg([^>]*)>/,
        `<svg$1 width="${size}" height="${size}">`
      );
      setSvgContent(modifiedSvg);
    };

    fetchSvg();
  }, [name, size]);

  if (!svgContent) {
    return null;
  }

  return (
    <span
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
