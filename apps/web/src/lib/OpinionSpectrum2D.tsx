"use client";

import { useState } from "react";

export interface Opinion2DPoint {
  id: string;
  name: string;
  avatar: string;
  agreement: number; // 0 (strongly disagree) to 100 (strongly agree)
  confidence: number; // 0 (low confidence) to 100 (high confidence)
  info?: string;
}

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
        <div
          className="absolute z-20 max-w-xs rounded-lg border-2 bg-white px-3 py-2 shadow-xl"
          style={{
            left: person.agreement < 50 ? `${person.agreement}%` : "auto",
            right:
              person.agreement >= 50 ? `${100 - person.agreement}%` : "auto",
            top: `${100 - person.confidence}%`,
            transform: `translate(${person.agreement < 50 ? offset.x : -offset.x}px, calc(-50% - ${offset.y}px - 70px))`,
            borderColor: borderColor,
          }}
        >
          <div className="text-sm font-semibold">{person.name}</div>
          {person.info && (
            <div className="text-xs text-gray-600">{person.info}</div>
          )}
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
        </div>
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

            {/* Avatars */}
            <div
              className="absolute inset-0"
              onMouseLeave={() => setHoveredId(null)}
            >
              {data.map((person) => (
                <Avatar
                  key={person.id}
                  person={person}
                  allPeople={data}
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
    </div>
  );
}
