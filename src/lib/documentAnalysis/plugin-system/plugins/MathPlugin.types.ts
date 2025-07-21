/**
 * Math Plugin Type Definitions
 * 
 * These types extend the base finding types with math-specific data.
 * The data flows through stages: Potential → Investigated → Located
 */

import type { 
  PotentialFinding as BasePotentialFinding, 
  InvestigatedFinding as BaseInvestigatedFinding, 
  LocatedFinding as BaseLocatedFinding, 
  PluginError 
} from '../types';

// ============================================
// DATA STRUCTURES
// ============================================
export interface ErrorData {
  equation: string;
  error: string;
  context: string;
  surroundingText?: string;
}

export interface CorrectData {
  equation: string;
  context: string;
  surroundingText?: string;
}

// ============================================
// STAGE-SPECIFIC FINDING TYPES
// ============================================

// Stage 1: Potential findings (raw extractions)
export type PotentialFinding = 
  | (BasePotentialFinding & { type: 'math_error'; data: ErrorData })
  | (BasePotentialFinding & { type: 'math_correct'; data: CorrectData });

// Stage 2: Investigated findings (validated)
export type InvestigatedFinding = BaseInvestigatedFinding & {
  type: 'math_error';
  data: ErrorData;
};

// Stage 3: Located findings (with positions)
export type LocatedFinding = BaseLocatedFinding & {
  type: 'math_error';
  metadata: ErrorData;
  highlight?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  };
};

// ============================================
// PLUGIN STATE
// ============================================
export interface FindingStorage {
  potential: PotentialFinding[];
  investigated: InvestigatedFinding[];
  located: LocatedFinding[];
  errors: PluginError[];
  summary?: string;
  analysisSummary?: string;
}