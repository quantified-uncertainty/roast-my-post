export interface ToolResponse<TResult = unknown> {
  result: TResult;
  cost?: {
    totalUSD: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    breakdown?: Array<{
      model: string;
      costUSD: number;
      tokens: number;
      requestCount: number;
    }>;
  } | null;
  sessionId?: string;
}

export async function runToolWithAuth<TData = unknown, TResult = unknown>(
  toolPath: string,
  data: TData
): Promise<ToolResponse<TResult>> {
  const response = await fetch(toolPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const responseText = await response.text();

    let error;
    try {
      error = JSON.parse(responseText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 200)}...`);
    }
    throw new Error(error.error || 'Tool execution failed');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Tool execution failed');
  }

  return {
    result: result.result,
    cost: result.cost,
    sessionId: result.sessionId,
  };
}