import chroma from "chroma-js";

import type { FrontendComment as Comment } from "@/shared/types/frontendTypes";

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

// Base colors for non-grade comments
const NON_GRADE_BASE_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
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
      comment.description &&
      (comment.highlight.isValid === undefined || comment.highlight.isValid === true)
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
    return (a.highlight?.startOffset || 0) - (b.highlight?.startOffset || 0);
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
    const saturationMult = 0.5 + normalizedImportance * 0.5; // Range from 0.5 to 1.0
    const brightnessMult = 1.5 - normalizedImportance * 0.5; // Range from 1.5 to 1.0 (low importance = brighter)

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
  allImportances: number[] = [],
  index: number = 0
): { background: string; color: string } {
  if (!hasGrade || grade === undefined) {
    // For non-grade cases, use a sequence of distinct colors
    const baseColor =
      NON_GRADE_BASE_COLORS[index % NON_GRADE_BASE_COLORS.length];
    return getColorStyle(baseColor, importance, allImportances);
  }

  const baseColor = getBaseColor(grade);
  return getColorStyle(baseColor, importance, allImportances);
}

export const WORD_COUNT_LEVELS = [
  { threshold: 1000, color: "text-gray-400" },
  { threshold: 5000, color: "text-gray-500" },
  { threshold: 20000, color: "text-gray-600" },
  { threshold: Infinity, color: "text-gray-700" },
] as const;
