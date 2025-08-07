import React from "react";

export const WORD_COUNT_LEVELS = [
  { threshold: 1000, color: "text-gray-400" },
  { threshold: 5000, color: "text-gray-500" },
  { threshold: 20000, color: "text-gray-600" },
  { threshold: Infinity, color: "text-gray-700" },
] as const;

export function getWordCountInfo(content: string): {
  level: number;
  color: string;
  wordCount: number;
} {
  const wordCount = content.split(/\s+/).length;
  const level = WORD_COUNT_LEVELS.findIndex(
    ({ threshold }) => wordCount < threshold
  );
  return {
    level,
    color: WORD_COUNT_LEVELS[level].color,
    wordCount,
  };
}

export function formatWordCount(wordCount: number): string {
  return wordCount >= 1000
    ? `${(wordCount / 1000).toFixed(1)}k`
    : `${wordCount}`;
}

export function WordCountIndicator({ content }: { content: string }): React.ReactElement {
  const { level } = getWordCountInfo(content);
  const bars = Array.from({ length: level }, (_, i) => (
    <div
      key={i}
      className="w-0.5 bg-gray-500"
      style={{ height: `${(i + 1) * 3}px` }}
    />
  ));

  return <div className="flex items-end gap-0.5">{bars}</div>;
}

export function WordCountDisplay({ content }: { content: string }): React.ReactElement {
  const { wordCount, color } = getWordCountInfo(content);
  const formatted = formatWordCount(wordCount);
  return (
    <span className="inline-flex items-baseline gap-1">
      <WordCountIndicator content={content} />
      <span className={color}>{formatted}</span>
    </span>
  );
}
