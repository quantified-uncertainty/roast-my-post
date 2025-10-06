import { useState, useCallback } from 'react';
import { runToolWithAuth, ToolResponse } from '../utils/runToolWithAuth';

export interface UseToolExecutionOptions<TInput, TOutput> {
  /**
   * Validate input before execution
   */
  validateInput?: (input: TInput) => boolean | string;
  
  /**
   * Transform or process the response before setting result
   */
  processResponse?: (response: TOutput) => TOutput;
  
  /**
   * Custom error message formatter
   */
  formatError?: (error: unknown) => string;
  
  /**
   * Callback when execution starts
   */
  onExecuteStart?: () => void;
  
  /**
   * Callback when execution completes (success or failure)
   */
  onExecuteComplete?: (result?: TOutput, error?: string) => void;
}

export interface UseToolExecutionReturn<TInput, TOutput> {
  result: TOutput | null;
  isLoading: boolean;
  error: string | null;
  execute: (input: TInput) => Promise<void>;
  reset: () => void;
  setResult: (result: TOutput | null) => void;
  cost: ToolResponse<TOutput>['cost'];
  sessionId: string | undefined;
}

/**
 * Custom hook for managing tool execution state and logic
 * 
 * @example
 * ```tsx
 * const { result, isLoading, error, execute } = useToolExecution<
 *   { text: string },
 *   { errors: SpellingError[] }
 * >('/api/tools/check-spelling', {
 *   validateInput: (input) => input.text.trim().length > 0,
 *   formatError: (err) => `Spelling check failed: ${err}`
 * });
 * ```
 */
export function useToolExecution<TInput, TOutput>(
  apiPath: string,
  options?: UseToolExecutionOptions<TInput, TOutput>
): UseToolExecutionReturn<TInput, TOutput> {
  const [result, setResult] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState<ToolResponse<TOutput>['cost']>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const execute = useCallback(async (input: TInput) => {
    // Validate input if validator provided
    if (options?.validateInput) {
      const validation = options.validateInput(input);
      if (validation !== true) {
        const errorMsg = typeof validation === 'string' 
          ? validation 
          : 'Invalid input';
        setError(errorMsg);
        return;
      }
    }

    // Reset state and start execution
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    options?.onExecuteStart?.();

    try {
      // Execute the tool
      const response = await runToolWithAuth<TInput, TOutput>(apiPath, input);

      // Process response if processor provided
      const processedResult = options?.processResponse
        ? options.processResponse(response.result)
        : response.result;

      setResult(processedResult);
      setCost(response.cost);
      setSessionId(response.sessionId);
      options?.onExecuteComplete?.(processedResult, undefined);
    } catch (err) {
      // Format error message
      const errorMessage = options?.formatError 
        ? options.formatError(err)
        : err instanceof Error 
          ? err.message 
          : 'An error occurred';
      
      setError(errorMessage);
      options?.onExecuteComplete?.(undefined, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [apiPath, options]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
    setCost(undefined);
    setSessionId(undefined);
  }, []);

  return {
    result,
    isLoading,
    error,
    execute,
    reset,
    setResult,
    cost,
    sessionId
  };
}