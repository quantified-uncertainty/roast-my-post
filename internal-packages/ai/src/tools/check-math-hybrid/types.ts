
export interface CheckMathHybridInput {
  statement: string;
  context?: string;
}

export interface CheckMathHybridOutput {
  statement: string;
  status: 'verified_true' | 'verified_false' | 'verified_warning' | 'cannot_verify';
  explanation: string;
  verifiedBy: 'mathjs' | 'llm' | 'both';
  mathJsResult?: {
    status: 'verified_true' | 'verified_false' | 'verified_warning' | 'cannot_verify';
    explanation: string;
    mathJsExpression?: string;
    computedValue?: string;
    steps?: Array<{
      expression: string;
      result: string;
    }>;
    error?: string;
  };
  llmResult?: {
    status: 'verified_true' | 'verified_false' | 'cannot_verify';
    explanation: string;
    errorType?: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
    severity?: 'critical' | 'major' | 'minor';
    reasoning: string;
  };
  conciseCorrection?: string;
  toolsUsed: Array<'mathjs' | 'llm'>;
}