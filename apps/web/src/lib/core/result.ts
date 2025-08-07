/**
 * Result type for consistent error handling
 * Inspired by Rust's Result type - forces explicit error handling
 */

import { AppError } from './errors';

/**
 * Result type that can be either Success or Failure
 * Forces callers to handle both cases explicitly
 */
export class Result<T, E = AppError> {
  private constructor(
    private readonly value?: T,
    private readonly _error?: E
  ) {}

  /**
   * Create a successful result
   */
  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(value, undefined);
  }

  /**
   * Create a failed result
   */
  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(undefined, error);
  }

  /**
   * Create a result from a promise, catching errors
   */
  static async fromPromise<T>(
    promise: Promise<T>,
    errorTransform?: (error: unknown) => AppError
  ): Promise<Result<T, AppError>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      const appError = errorTransform ? errorTransform(error) : 
                       error instanceof AppError ? error : 
                       new AppError(String(error), 'PROMISE_ERROR');
      return Result.fail(appError);
    }
  }

  /**
   * Create a result from a function that might throw
   */
  static fromThrowable<T>(
    fn: () => T,
    errorTransform?: (error: unknown) => AppError
  ): Result<T, AppError> {
    try {
      return Result.ok(fn());
    } catch (error) {
      const appError = errorTransform ? errorTransform(error) :
                       error instanceof AppError ? error :
                       new AppError(String(error), 'FUNCTION_ERROR');
      return Result.fail(appError);
    }
  }

  /**
   * Check if the result is successful
   */
  isOk(): boolean {
    return this._error === undefined;
  }

  /**
   * Check if the result is a failure
   */
  isError(): boolean {
    return this._error !== undefined;
  }

  /**
   * Get the value if successful, throw if error
   */
  unwrap(): T {
    if (this._error !== undefined) {
      throw this._error;
    }
    return this.value as T;
  }

  /**
   * Get the value if successful, or a default value if error
   */
  unwrapOr(defaultValue: T): T {
    return this.isOk() ? (this.value as T) : defaultValue;
  }

  /**
   * Get the value if successful, or compute a default if error
   */
  unwrapOrElse(fn: (error: E) => T): T {
    return this.isOk() ? (this.value as T) : fn(this._error as E);
  }

  /**
   * Get the error if failed, undefined if successful
   */
  error(): E | undefined {
    return this._error;
  }

  /**
   * Map the success value to a new value
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isOk()) {
      return Result.ok(fn(this.value as T));
    }
    return Result.fail(this._error as E);
  }

  /**
   * Map the error to a new error
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.isError()) {
      return Result.fail(fn(this._error as E));
    }
    return Result.ok(this.value as T);
  }

  /**
   * Chain another result-returning operation
   */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isOk()) {
      return fn(this.value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * Chain another async result-returning operation
   */
  async andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> {
    if (this.isOk()) {
      return fn(this.value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * Match on the result (pattern matching)
   */
  match<U>(handlers: {
    ok: (value: T) => U;
    error: (error: E) => U;
  }): U {
    return this.isOk() 
      ? handlers.ok(this.value as T)
      : handlers.error(this._error as E);
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): { success: boolean; value?: T; error?: E } {
    return this.isOk()
      ? { success: true, value: this.value }
      : { success: false, error: this._error };
  }
}

/**
 * Combine multiple results into a single result
 * If all are successful, returns array of values
 * If any fail, returns the first error
 */
export function combineResults<T>(
  results: Result<T, AppError>[]
): Result<T[], AppError> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isError()) {
      return Result.fail(result.error()!);
    }
    values.push(result.unwrap());
  }
  
  return Result.ok(values);
}

/**
 * Combine multiple results, collecting all errors
 * Returns either all values or all errors
 */
export function combineResultsWithAllErrors<T>(
  results: Result<T, AppError>[]
): Result<T[], AppError[]> {
  const values: T[] = [];
  const errors: AppError[] = [];
  
  for (const result of results) {
    if (result.isError()) {
      errors.push(result.error()!);
    } else {
      values.push(result.unwrap());
    }
  }
  
  return errors.length > 0 
    ? Result.fail(errors)
    : Result.ok(values);
}

/**
 * Execute multiple async operations in parallel and combine results
 */
export async function parallelResults<T>(
  operations: (() => Promise<Result<T, AppError>>)[]
): Promise<Result<T[], AppError>> {
  const results = await Promise.all(operations.map(op => op()));
  return combineResults(results);
}

/**
 * Type guard to check if a value is a Result
 */
export function isResult<T, E>(value: unknown): value is Result<T, E> {
  return value instanceof Result;
}