import openRouterPricingData from '@/data/openrouter-pricing.json';

interface ModelPricing {
  prompt: string;
  completion: string;
}

interface OpenRouterModel {
  id: string;
  pricing?: ModelPricing;
}

interface EvaluationResult {
  model: string;
  provider: string;
  responseTimeMs?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Build pricing lookup map from static data
const modelPricingMap: Record<string, ModelPricing> = {};
openRouterPricingData.data.forEach((model: OpenRouterModel) => {
  if (model.pricing) {
    modelPricingMap[model.id] = model.pricing;
  }
});

function calculateCost(
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  pricing: ModelPricing | undefined
): number | null {
  if (!promptTokens || !completionTokens || !pricing) return null;

  const promptCost = promptTokens * parseFloat(pricing.prompt);
  const completionCost = completionTokens * parseFloat(pricing.completion);

  return promptCost + completionCost;
}

interface ModelResponseStatsTableProps {
  evaluations: EvaluationResult[];
}

export function ModelResponseStatsTable({ evaluations }: ModelResponseStatsTableProps) {
  // Sort evaluations by model name
  const sortedEvaluations = [...evaluations].sort((a, b) => a.model.localeCompare(b.model));

  // Calculate medians for highlighting
  const responseTimes = sortedEvaluations
    .map(e => e.responseTimeMs)
    .filter((t): t is number => t !== undefined)
    .sort((a, b) => a - b);

  const costs = sortedEvaluations
    .map(e => {
      const cost = calculateCost(
        e.tokenUsage?.promptTokens,
        e.tokenUsage?.completionTokens,
        modelPricingMap[e.model]
      );
      return cost;
    })
    .filter((c): c is number => c !== null)
    .sort((a, b) => a - b);

  const medianResponseTime = responseTimes.length > 0
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : null;

  const medianCost = costs.length > 0
    ? costs[Math.floor(costs.length / 2)]
    : null;

  // Helper to get cell background class
  const getHighlightClass = (value: number | null, median: number | null): string => {
    if (value === null || median === null) return '';
    const ratio = value / median;
    if (ratio > 3) return 'bg-red-50';
    if (ratio > 2) return 'bg-amber-50';
    return '';
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-600">Model Response Stats</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-2 text-left font-medium text-gray-600">Model</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Response Time (s)</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Input Tokens</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Completion Tokens</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Estimated Cost</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvaluations?.map((evalItem, idx) => {
              const cost = calculateCost(
                evalItem.tokenUsage?.promptTokens,
                evalItem.tokenUsage?.completionTokens,
                modelPricingMap[evalItem.model]
              );

              return (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <a
                      href={`https://openrouter.ai/${evalItem.model}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {evalItem.model}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">({evalItem.provider})</span>
                  </td>
                  <td className={`px-4 py-3 text-right text-gray-700 ${getHighlightClass(evalItem.responseTimeMs || null, medianResponseTime)}`}>
                    {evalItem.responseTimeMs ? (evalItem.responseTimeMs / 1000).toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {evalItem.tokenUsage?.promptTokens?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {evalItem.tokenUsage?.completionTokens?.toLocaleString() || '-'}
                  </td>
                  <td className={`px-4 py-3 text-right text-gray-700 ${getHighlightClass(cost, medianCost)}`}>
                    {cost !== null ? `$${cost.toFixed(6)}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="px-4 py-3 text-gray-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                {(() => {
                  const maxTime = Math.max(
                    ...sortedEvaluations
                      .map(e => e.responseTimeMs)
                      .filter((t): t is number => t !== undefined)
                  );
                  return maxTime > 0 ? (maxTime / 1000).toFixed(2) : '-';
                })()}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                -
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                -
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                {(() => {
                  const totalCost = sortedEvaluations.reduce((sum, e) => {
                    const cost = calculateCost(
                      e.tokenUsage?.promptTokens,
                      e.tokenUsage?.completionTokens,
                      modelPricingMap[e.model]
                    );
                    return sum + (cost || 0);
                  }, 0);
                  return totalCost > 0 ? `$${totalCost.toFixed(6)}` : '-';
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
