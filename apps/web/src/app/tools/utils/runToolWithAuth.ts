export async function runToolWithAuth<TData = unknown, TResult = unknown>(
  toolPath: string, 
  data: TData
): Promise<TResult> {
  const response = await fetch(toolPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Tool execution failed');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Tool execution failed');
  }

  return result.result;
}