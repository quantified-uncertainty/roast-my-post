/**
 * Shared UI components for meta-eval screens
 */

import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get color for score display (1-10 scale)
 */
export function scoreColor(score: number): "green" | "yellow" | "red" {
  return score >= 7 ? "green" : score >= 5 ? "yellow" : "red";
}

// ============================================================================
// Components
// ============================================================================

interface LoadingSpinnerProps {
  message: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <Box padding={1}>
      <Text>
        <Spinner type="dots" /> {message}
      </Text>
    </Box>
  );
}

interface FullReasoningViewProps {
  reasoning: string;
  title?: string;
  borderColor?: string;
  height: number;
  onBack: () => void;
}

export function FullReasoningView({
  reasoning,
  title = "Full Reasoning",
  borderColor = "blue",
  height,
  onBack,
}: FullReasoningViewProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      padding={1}
      height={height}
      overflow="hidden"
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={borderColor}>
          {title}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        marginBottom={1}
        paddingX={1}
        flexGrow={1}
      >
        <Text wrap="wrap">{reasoning}</Text>
      </Box>

      <SelectInput
        items={[{ label: "<- Back to Results", value: "back" }]}
        onSelect={onBack}
      />
    </Box>
  );
}

interface ScreenContainerProps {
  title: string;
  borderColor?: string;
  height: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ScreenContainer({
  title,
  borderColor = "blue",
  height,
  children,
  footer,
}: ScreenContainerProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      padding={1}
      height={height}
      overflow="hidden"
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={borderColor}>
          {title}
        </Text>
      </Box>

      {children}

      {footer && (
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>{footer}</Text>
        </Box>
      )}
    </Box>
  );
}

interface InfoBoxProps {
  children: React.ReactNode;
}

export function InfoBox({ children }: InfoBoxProps) {
  return (
    <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
      {children}
    </Box>
  );
}
