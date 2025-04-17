import chroma from "chroma-js";

import type { Comment } from "@/types/documentReview";

// Available colors for comments (keeping this for non-evaluation cases)
export const COMMENT_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-indigo-100 text-indigo-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-lime-100 text-lime-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-purple-100 text-purple-800",
  "bg-yellow-100 text-yellow-800",
  "bg-sky-100 text-sky-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
  "bg-green-100 text-green-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-blue-100 text-blue-800",
  "bg-red-100 text-red-800",
];

/**
 * Get the color class for a comment based on its index
 */
export function getCommentColorByIndex(index: number): string {
  const colors = [
    "bg-blue-200 text-blue-800",
    "bg-green-200 text-green-800",
    "bg-purple-200 text-purple-800",
    "bg-pink-200 text-pink-800",
    "bg-yellow-200 text-yellow-800",
  ];
  return colors[index % colors.length];
}

/**
 * Filter comments to only include valid ones
 */
export function filterValidComments(comments: Comment[]): Comment[] {
  return comments.filter(
    (comment) =>
      comment.highlight &&
      comment.title &&
      comment.description &&
      (comment.isValid === undefined || comment.isValid === true)
  );
}

/**
 * Sort comments by their highlight start offset
 */
export function sortCommentsByOffset(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => {
    const aOffset = a.highlight?.startOffset || 0;
    const bOffset = b.highlight?.startOffset || 0;
    return aOffset - bOffset;
  });
}

/**
 * Get valid and sorted comments
 */
export function getValidAndSortedComments(comments: Comment[]): Comment[] {
  return filterValidComments(comments).sort((a, b) => {
    return (a.highlight.startOffset || 0) - (b.highlight.startOffset || 0);
  });
}

/**
 * Get the count of valid comments
 */
export function getValidCommentCount(comments: Comment[]): number {
  return filterValidComments(comments).length;
}

// Color generation helper functions
function getBaseColor(grade: number): string {
  // Create color scale with specific grade transitions
  const colorScale = chroma
    .scale([
      "#e74c3c", // Red (0)
      "#f39c12", // Orange (30)
      "#f1c40f", // Yellow (45)
      "#7f8c9d", // Blue-gray (55)
      "#16a085", // Blue-green (70)
      "#2ecc71", // Bright green (90+)
    ])
    .domain([0, 30, 45, 55, 70, 90])
    .mode("lch"); // Use LCH color space for perceptually uniform interpolation

  return colorScale(grade).hex();
}

function calculatePercentileRank(value: number, values: number[]): number {
  // Sort values in descending order (highest first)
  const sortedValues = [...values].sort((a, b) => b - a);

  // Find position in descending order (higher values = higher percentile)
  const index = sortedValues.findIndex((v) => v <= value);

  // Calculate percentile (higher index = lower percentile)
  return ((values.length - 1 - index) / (values.length - 1)) * 100;
}

function getColorStyle(
  bgColor: string,
  importance: number | undefined,
  allImportances: number[] = []
): { background: string; color: string } {
  let color = chroma(bgColor);

  if (importance !== undefined) {
    const percentileRank =
      allImportances.length > 1
        ? calculatePercentileRank(importance, allImportances)
        : 50;

    // Normalize to 0-1 range
    const normalizedImportance = percentileRank / 100;

    // Lower percentile = much less saturated, much brighter (closer to white)
    // Higher percentile = more saturated, darker (more visible)
    const saturationMult = 0.1 + normalizedImportance * 0.9; // Range from 0.1 to 1.0
    const brightnessMult = 2 - normalizedImportance; // Range from 2.0 to 1.0 (low importance = brighter)

    color = color
      .saturate((saturationMult - 1) * 2)
      .brighten((brightnessMult - 1) * 2)
      .alpha(0.75);
  }

  const textColor = color.luminance() < 0.5 ? "#ffffff" : "#000000";
  return {
    background: color.hex(),
    color: textColor,
  };
}

export function getCommentColorByGrade(
  grade: number | undefined,
  importance: number | undefined,
  hasGrade: boolean,
  allImportances: number[] = []
): { background: string; color: string } {
  if (!hasGrade || grade === undefined) {
    return {
      background: "#f1f5f9", // Light gray background
      color: "#334155", // Dark gray text
    };
  }

  const baseColor = getBaseColor(grade);
  return getColorStyle(baseColor, importance, allImportances);
}

export function getGradeColorWeak(grade: number) {
  if (grade >= 80) {
    return {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      color: "rgb(21, 128, 61)",
    };
  } else if (grade >= 60) {
    return {
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      color: "rgb(22, 163, 74)",
    };
  } else if (grade >= 40) {
    return {
      backgroundColor: "rgba(234, 179, 8, 0.1)",
      color: "rgb(113, 113, 122)",
    };
  } else if (grade >= 20) {
    return {
      backgroundColor: "rgba(249, 115, 22, 0.05)",
      color: "rgb(194, 65, 12)",
    };
  } else {
    return {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      color: "rgb(185, 28, 28)",
    };
  }
}

export function getGradeColorStrong(grade: number): string {
  if (grade >= 80) {
    return "bg-green-600 text-white";
  } else if (grade >= 60) {
    return "bg-green-500 text-white";
  } else if (grade >= 40) {
    return "bg-gray-500 text-white";
  } else if (grade >= 20) {
    return "bg-orange-600 text-white";
  } else {
    return "bg-red-600 text-white";
  }
}

const GRADE_SCALE = [
  { threshold: 95, letter: "A+" },
  { threshold: 87, letter: "A" },
  { threshold: 80, letter: "A-" },
  { threshold: 77, letter: "B+" },
  { threshold: 73, letter: "B" },
  { threshold: 70, letter: "B-" },
  { threshold: 67, letter: "C+" },
  { threshold: 63, letter: "C" },
  { threshold: 60, letter: "C-" },
  { threshold: 50, letter: "E" },
  { threshold: 40, letter: "E-" },
  { threshold: 30, letter: "F" },
  { threshold: 20, letter: "F-" },
  { threshold: 10, letter: "F-" },
  { threshold: 0, letter: "F--" },
] as const;

export function getLetterGrade(grade: number): string {
  return (
    GRADE_SCALE.find(({ threshold }) => grade >= threshold)?.letter || "F--"
  );
}
