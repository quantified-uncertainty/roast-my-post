"use client";

import { useState } from "react";
import {
  AlertTriangle,
  HelpCircle,
  Scale,
  ShieldAlert,
  Zap,
} from "lucide-react";

export type RefusalReason =
  | "Safety"
  | "Policy"
  | "MissingData"
  | "Unclear"
  | "Error";

export interface Opinion2DPoint {
  id: string;
  name: string;
  avatar: string;
  agreement: number; // 0-100: strongly disagree to strongly agree
  confidence: number; // 0-100: low to high confidence
  info?: string;
  refusalReason?: RefusalReason;
}

// Icon mapping for refusal reasons
const REFUSAL_ICONS: Record<RefusalReason, React.ComponentType<{ size?: number }>> = {
  Safety: ShieldAlert,
  Policy: Scale,
  MissingData: HelpCircle,
  Unclear: AlertTriangle,
  Error: Zap,
};

// Calculate 2D offset for points that are close together
function getRadialOffset(
  person: Opinion2DPoint,
  allPeople: Opinion2DPoint[],
  proximityThreshold: number = 8,
  clusterRadius: number = 30
): { x: number; y: number } {
  // Find all people within proximity threshold
  const nearby = allPeople
    .filter((p) => {
      const dx = p.agreement - person.agreement;
      const dy = p.confidence - person.confidence;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < proximityThreshold;
    })
    .sort((a, b) => a.id.localeCompare(b.id)); // Consistent ordering

  if (nearby.length === 1) return { x: 0, y: 0 }; // No collision

  // Find this person's index in the nearby group
  const index = nearby.findIndex((p) => p.id === person.id);

  // Check if all points are at EXACT same position (distance = 0)
  const allExactSamePosition = nearby.every((p) => {
    const dx = p.agreement - person.agreement;
    const dy = p.confidence - person.confidence;
    return Math.sqrt(dx * dx + dy * dy) < 0.01; // Essentially 0
  });

  // Use tighter clustering for exact same position
  const effectiveRadius = allExactSamePosition
    ? clusterRadius * 0.4
    : clusterRadius;

  // Arrange in a circle around the centroid
  const angle = (index / nearby.length) * Math.PI * 2;
  return {
    x: Math.cos(angle) * effectiveRadius,
    y: Math.sin(angle) * effectiveRadius,
  };
}

// Shared tooltip component
interface TooltipProps {
  person: Opinion2DPoint;
  borderColor?: string;
  darkTextColor?: string;
  positioning: React.CSSProperties;
  showMetrics?: boolean;
  refusalReason?: RefusalReason;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function Tooltip({
  person,
  borderColor = "#9ca3af",
  darkTextColor,
  positioning,
  showMetrics = false,
  refusalReason,
  onMouseEnter,
  onMouseLeave,
}: TooltipProps) {
  return (
    <div
      className="absolute z-20 w-64 rounded-lg border-2 bg-white px-3 py-2 shadow-xl"
      style={{
        ...positioning,
        borderColor: borderColor,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="text-sm font-semibold">{person.name}</div>
      {person.info && (
        <div className="mt-1 text-xs text-gray-600">{person.info}</div>
      )}
      {showMetrics ? (
        <div className="mt-1 text-xs text-gray-500">
          Agreement:{" "}
          <span className="font-semibold" style={{ color: darkTextColor }}>
            {person.agreement}%
          </span>{" "}
          | Confidence:{" "}
          <span
            className="font-semibold"
            style={{
              color: `rgb(${150 - Math.round(person.confidence * 1.5)}, ${150 - Math.round(person.confidence * 1.5)}, ${150 - Math.round(person.confidence * 1.5)})`,
            }}
          >
            {person.confidence}%
          </span>
        </div>
      ) : refusalReason ? (
        <div className="mt-1 text-xs text-gray-500">
          Refusal:{" "}
          <span className="font-semibold text-gray-700">{refusalReason}</span>
        </div>
      ) : null}
    </div>
  );
}

interface AvatarProps {
  person: Opinion2DPoint;
  allPeople: Opinion2DPoint[];
  onHover: () => void;
  isHovered: boolean;
  proximityThreshold?: number;
  clusterRadius?: number;
}

function Avatar({
  person,
  allPeople,
  onHover,
  isHovered,
  proximityThreshold = 8,
  clusterRadius = 30,
}: AvatarProps) {
  const offset = getRadialOffset(
    person,
    allPeople,
    proximityThreshold,
    clusterRadius
  );

  // Calculate color based on position
  // agreement: 0-100, confidence: 0-100
  // agreement 0 = strongly disagree (left side), 100 = strongly agree (right side)
  // Normalize to 0-1
  const normalizedAgreement = (100 - person.agreement) / 100; // 0 = agree (right/green), 1 = disagree (left/red)
  const normalizedConfidence = person.confidence / 100; // 0 = bottom (low), 1 = top (high)

  // Red → Orange → Yellow → Green gradient
  // normalizedAgreement 0 (agree/right) = Green
  // normalizedAgreement 0.33 = Yellow
  // normalizedAgreement 0.67 = Orange
  // normalizedAgreement 1 (disagree/left) = Red
  let red, green, blue;

  if (normalizedAgreement < 0.33) {
    // Green to Yellow (0 to 0.33)
    const t = normalizedAgreement / 0.33;
    red = Math.round(255 * t);
    green = 255;
    blue = 0;
  } else if (normalizedAgreement < 0.67) {
    // Yellow to Orange (0.33 to 0.67)
    const t = (normalizedAgreement - 0.33) / 0.34;
    red = 255;
    green = Math.round(255 * (1 - t * 0.35)); // 255 to ~165
    blue = 0;
  } else {
    // Orange to Red (0.67 to 1)
    const t = (normalizedAgreement - 0.67) / 0.33;
    red = 255;
    green = Math.round(165 * (1 - t)); // 165 to 0
    blue = 0;
  }

  // Desaturate based on confidence (low confidence = more gray)
  const saturation = normalizedConfidence;
  const grayValue = 220; // Lighter gray for low-confidence items

  const finalRed = Math.round(red * saturation + grayValue * (1 - saturation));
  const finalGreen = Math.round(
    green * saturation + grayValue * (1 - saturation)
  );
  const finalBlue = Math.round(
    blue * saturation + grayValue * (1 - saturation)
  );

  const bgColor = `rgb(${finalRed}, ${finalGreen}, ${finalBlue})`;

  // Calculate border color (darker version)
  const borderRed = Math.max(0, finalRed - 60);
  const borderGreen = Math.max(0, finalGreen - 60);
  const borderBlue = Math.max(0, finalBlue - 60);
  const borderColor = `rgb(${borderRed}, ${borderGreen}, ${borderBlue})`;

  // Calculate dark text color for tooltip (based on base color, not desaturated)
  const darkRed = Math.round(red * 0.6);
  const darkGreen = Math.round(green * 0.6);
  const darkBlue = Math.round(blue * 0.6);
  const darkTextColor = `rgb(${darkRed}, ${darkGreen}, ${darkBlue})`;

  // Text color (dark for light backgrounds, light for dark backgrounds)
  const brightness =
    (finalRed * 299 + finalGreen * 587 + finalBlue * 114) / 1000;
  const textColor = brightness > 155 ? "text-gray-800" : "text-white";

  return (
    <>
      <div
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200 ${textColor} ${isHovered ? "z-10 scale-125 shadow-lg" : "hover:scale-110"} `}
        onMouseEnter={onHover}
        style={{
          position: "absolute",
          left: `${person.agreement}%`,
          top: `${100 - person.confidence}%`,
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% - ${offset.y}px))`,
          backgroundColor: bgColor,
          borderColor: borderColor,
          opacity: 0.8,
        }}
      >
        {person.avatar}
      </div>

      {isHovered && (
        <Tooltip
          person={person}
          borderColor={borderColor}
          darkTextColor={darkTextColor}
          positioning={{
            left: person.agreement < 50 ? `${person.agreement}%` : "auto",
            right:
              person.agreement >= 50 ? `${100 - person.agreement}%` : "auto",
            top: `${100 - person.confidence}%`,
            transform: `translate(${person.agreement < 50 ? offset.x : -offset.x}px, calc(-50% - ${offset.y}px - 70px))`,
          }}
          showMetrics={true}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
        />
      )}
    </>
  );
}

export interface OpinionSpectrum2DProps {
  data: Opinion2DPoint[];
  height?: string; // Tailwind height class, e.g., "h-96"
  showGridLines?: boolean;
  showAxisLabels?: boolean;
  proximityThreshold?: number; // Distance threshold for collision detection (default: 8)
  clusterRadius?: number; // Radius for radial clustering (default: 30px)
  className?: string;
}

export function OpinionSpectrum2D({
  data,
  height = "h-64",
  showGridLines = true,
  showAxisLabels = true,
  proximityThreshold = 8,
  clusterRadius = 30,
  className = "",
}: OpinionSpectrum2DProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Split data into regular opinions and refusals
  const regularData = data.filter((p) => !p.refusalReason);
  const refusals = data.filter((p) => p.refusalReason);

  // Group refusals by reason
  const refusalsByReason = refusals.reduce(
    (acc, person) => {
      const reason = person.refusalReason!;
      if (!acc[reason]) acc[reason] = [];
      acc[reason].push(person);
      return acc;
    },
    {} as Record<RefusalReason, Opinion2DPoint[]>
  );

  return (
    <div className={className}>
      <div className="flex gap-4">
        {/* Main visualization area */}
        <div className="flex-1">
          {/* Top label */}
          {showAxisLabels && (
            <div className="mb-6 text-center text-sm font-semibold text-gray-400">
              ↑ High Confidence
            </div>
          )}

          {/* 2D Grid container */}
          <div className={`relative w-full ${height} rounded`}>
            {/* Grid lines */}
            {showGridLines && (
              <div className="absolute inset-0">
                {/* Vertical lines */}
                {[0, 100].map((pos) => (
                  <div
                    key={`v-${pos}`}
                    className="absolute h-full"
                    style={{
                      left: `${pos}%`,
                      borderLeft: "1px solid #ddd",
                    }}
                  />
                ))}
                {/* Horizontal lines */}
                {[0, 100].map((pos) => (
                  <div
                    key={`h-${pos}`}
                    className="absolute w-full"
                    style={{
                      bottom: `${pos}%`,
                      borderTop: "1px solid #ddd",
                    }}
                  />
                ))}
                {/* Center cross-hair (darker than outer border) */}
                <div
                  className="absolute w-full"
                  style={{
                    bottom: "50%",
                    borderTop: "2px solid #aaa",
                  }}
                />
                <div
                  className="absolute h-full"
                  style={{
                    left: "50%",
                    borderLeft: "1px solid #ddd",
                  }}
                />
              </div>
            )}

            {/* Avatars - only show non-refused */}
            <div
              className="absolute inset-0"
              onMouseLeave={() => setHoveredId(null)}
            >
              {regularData.map((person) => (
                <Avatar
                  key={person.id}
                  person={person}
                  allPeople={regularData}
                  onHover={() => setHoveredId(person.id)}
                  isHovered={hoveredId === person.id}
                  proximityThreshold={proximityThreshold}
                  clusterRadius={clusterRadius}
                />
              ))}
            </div>
          </div>

          {/* X-axis labels */}
          {showAxisLabels && (
            <div className="relative mt-4 h-6 text-sm font-semibold">
              <span className="absolute left-0 text-red-600">
                ← Strongly Disagree
              </span>
              <span className="absolute right-0 text-green-600">
                Strongly Agree →
              </span>
            </div>
          )}
          {/* Bottom label */}
          {showAxisLabels && (
            <div className="mt-2 text-center text-sm font-semibold text-gray-400">
              ↓ Low Confidence
            </div>
          )}
        </div>
      </div>

      {/* Refusals Section */}
      {refusals.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-2">
          <div className="flex items-center justify-center gap-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Errors
            </h3>
            <div className="flex flex-wrap items-center gap-6">
              {(["Safety", "Policy", "MissingData", "Unclear", "Error"] as RefusalReason[]).map((reason) => {
                const reasonModels = refusalsByReason[reason];
                if (!reasonModels || reasonModels.length === 0) return null;

                const IconComponent = REFUSAL_ICONS[reason];

                return (
                  <div key={reason} className="flex items-center gap-2 p-2">
                    <div className="flex items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-gray-300`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-400">
                        {reason}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {reasonModels.map((person) => (
                        <div key={person.id} className="relative">
                          <div
                            className={`flex h-8 w-auto cursor-pointer items-center justify-center rounded-full border-2 border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-all ${hoveredId === person.id ? "z-10 scale-110 shadow-md" : "hover:scale-105"}`}
                            onMouseEnter={() => setHoveredId(person.id)}
                          >
                            {person.avatar}
                          </div>
                          {hoveredId === person.id && (
                            <Tooltip
                              person={person}
                              positioning={{
                                top: "-90px",
                                left: "50%",
                                transform: "translateX(-50%)",
                              }}
                              refusalReason={reason}
                              onMouseEnter={() => setHoveredId(person.id)}
                              onMouseLeave={() => setHoveredId(null)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
