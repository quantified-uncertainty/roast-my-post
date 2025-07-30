import { Anthropic } from '@anthropic-ai/sdk';

// Shared status enum that all math tools use
export const MATH_VERIFICATION_STATUS = {
  TRUE: 'verified_true',
  FALSE: 'verified_false', 
  CANNOT_VERIFY: 'cannot_verify'
} as const;

export type MathVerificationStatus = typeof MATH_VERIFICATION_STATUS[keyof typeof MATH_VERIFICATION_STATUS];

// Base schema properties - always present
export const mathStatusSchema = {
  type: "string" as const,
  enum: ["verified_true", "verified_false", "cannot_verify"],
  description: "Whether the mathematical statement is verified as true, false, or cannot be verified"
};

export const mathExplanationSchema = {
  type: "string" as const,
  description: "Clear explanation of why the statement is true, false, or cannot be verified"
};

export const mathReasoningSchema = {
  type: "string" as const, 
  description: "Detailed step-by-step reasoning behind the analysis"
};

// Error details schema - only present when status is verified_false
export const mathErrorDetailsSchema = {
  type: "object" as const,
  description: "Details about the error (only present when status is verified_false)",
  properties: {
    errorType: {
      type: "string",
      enum: ["calculation", "logic", "unit", "notation", "conceptual"],
      description: "Type of mathematical error"
    },
    severity: {
      type: "string",
      enum: ["critical", "major", "minor"],
      description: "Severity of the error"
    },
    conciseCorrection: {
      type: "string",
      description: "Concise correction showing the key change (e.g., '5 → 4', '×0.15 → ×1.15')"
    },
    expectedValue: {
      type: "string",
      description: "The expected/correct value"
    },
    actualValue: {
      type: "string",
      description: "The actual/incorrect value found in the statement"
    },
    steps: {
      type: "array",
      description: "Step-by-step calculation showing how the error occurred",
      items: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression"
          },
          result: {
            type: "string",
            description: "Result of the expression"
          }
        },
        required: ["expression", "result"]
      }
    }
  },
  required: ["errorType", "severity", "conciseCorrection"]
};

// Verification details schema - details about how verification was performed
export const mathVerificationDetailsSchema = {
  type: "object" as const,
  description: "Details about how the verification was performed",
  properties: {
    mathJsExpression: {
      type: "string",
      description: "The MathJS expression used for verification"
    },
    computedValue: {
      type: "string",
      description: "The computed value from mathematical evaluation"
    },
    steps: {
      type: "array",
      description: "Step-by-step calculation",
      items: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression"
          },
          result: {
            type: "string",
            description: "Result of the expression"
          }
        },
        required: ["expression", "result"]
      }
    }
  }
};

// Common types
export type MathErrorType = 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
export type MathSeverity = 'critical' | 'major' | 'minor';

export interface MathErrorDetails {
  errorType: MathErrorType;
  severity: MathSeverity;
  conciseCorrection: string;
  expectedValue?: string;
  actualValue?: string;
  steps?: Array<{
    expression: string;
    result: string;
  }>;
}

export interface MathVerificationDetails {
  mathJsExpression?: string;
  computedValue?: string;
  steps?: Array<{
    expression: string;
    result: string;
  }>;
}