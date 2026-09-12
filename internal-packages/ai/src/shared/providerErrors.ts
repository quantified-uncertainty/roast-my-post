const CREDIT_ERROR_PATTERNS = [
  /credit balance (?:is )?too low/i,
  /insufficient[_ ]+(?:credits?|quota|funds?|balance)/i,
  /not enough (?:credits?|funds?)/i,
  /payment required/i,
  /(?:billing|spending|usage) limit (?:has been )?(?:reached|exceeded)/i,
  /quota (?:has been )?(?:exceeded|exhausted)/i,
  /(?:exceeded|reached).*quota/i,
];

const AUTH_ERROR_PATTERNS = [
  /invalid (?:api )?key/i,
  /authentication (?:failed|required|error)/i,
  /unauthorized/i,
  /permission denied/i,
];

export class ProviderAccessError extends Error {
  readonly originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "ProviderAccessError";
    this.originalError = originalError;
  }
}

function getStatus(error: unknown, depth = 0): number | undefined {
  if (depth > 3 || !error || typeof error !== "object") return undefined;

  const value = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
    cause?: unknown;
  };
  const status = value.status ?? value.statusCode ?? value.response?.status;
  if (typeof status === "number") return status;
  return getStatus(value.cause, depth + 1);
}

function getMessages(error: unknown, depth = 0): string[] {
  if (depth > 3 || error === null || error === undefined) return [];
  if (typeof error === "string") return [error];
  if (error instanceof Error) {
    return [error.message, ...getMessages(error.cause, depth + 1)];
  }
  if (typeof error !== "object") return [String(error)];

  const value = error as Record<string, unknown>;
  return [
    ...getMessages(value.message, depth + 1),
    ...getMessages(value.error, depth + 1),
    ...getMessages(value.cause, depth + 1),
    ...getMessages(value.response, depth + 1),
    ...getMessages(value.data, depth + 1),
  ];
}

/**
 * Converts terminal provider access failures into an error that must reach the
 * job worker. Other analysis errors can still use the existing partial-result
 * recovery behavior.
 */
export function asProviderAccessError(
  error: unknown
): ProviderAccessError | undefined {
  if (error instanceof ProviderAccessError) return error;

  const status = getStatus(error);
  const message = getMessages(error).join(" ");

  if (CREDIT_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return new ProviderAccessError(
      "AI provider credit balance is too low. Please try again later.",
      error
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return new ProviderAccessError(
      "AI provider authentication failed. Please try again later.",
      error
    );
  }

  if (status === 402) {
    return new ProviderAccessError(
      "AI provider billing rejected the request. Please try again later.",
      error
    );
  }

  return undefined;
}

export function throwIfProviderAccessError(error: unknown): void {
  const providerError = asProviderAccessError(error);
  if (providerError) throw providerError;
}
