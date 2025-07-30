// UI timing constants (in milliseconds)
export const UI_TIMING = {
  COPY_FEEDBACK_DURATION: 2000,
  COPY_ERROR_DURATION: 3000,
} as const;

// Layout constants (in pixels)
export const UI_LAYOUT = {
  SCROLL_MARGIN_TOP: 100,
  HEADER_MAX_HEIGHT: 1000,
  COMMENT_WIDTH: 400,
  COMMENT_SPACING: 60,
  COMMENT_COLUMN_WIDTH: 600,
  CONTENT_SIDE_PADDING: 80,
} as const;

// Text processing constants
export const TEXT_PROCESSING = {
  MIN_HIGHLIGHT_LENGTH: 10,
  CONTEXT_CHARS: 50,
} as const;

// Animation durations (in milliseconds)
export const ANIMATION = {
  TRANSITION_DURATION: 300,
  HIGHLIGHT_TRANSITION: 150,
} as const;