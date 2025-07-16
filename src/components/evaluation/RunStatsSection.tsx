import { EvaluationSection } from "./EvaluationSection";
import { formatDuration, formatCost, formatDate } from "@/lib/evaluation/evaluationFormatters";

interface RunStatsSectionProps {
  durationInSeconds?: number | null;
  costInCents?: number | null;
  createdAt: Date | string;
}

export function RunStatsSection({
  durationInSeconds,
  costInCents,
  createdAt
}: RunStatsSectionProps) {
  // Only show if we have cost or duration data
  if (!durationInSeconds && !costInCents) {
    return null;
  }

  return (
    <EvaluationSection id="run-stats" title="Run Stats">
      <div className="-m-8 p-8 bg-slate-50 rounded-b-lg">
        <div className="grid grid-cols-2 gap-4">
          {durationInSeconds !== undefined && durationInSeconds !== null && (
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-lg font-medium text-gray-900">
                {formatDuration(durationInSeconds)}
              </p>
            </div>
          )}
          {costInCents !== undefined && costInCents !== null && (
            <div>
              <p className="text-sm text-gray-500">Cost</p>
              <p className="text-lg font-medium text-gray-900">
                {formatCost(costInCents)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-lg font-medium text-gray-900">
              {formatDate(createdAt)}
            </p>
          </div>
        </div>
      </div>
    </EvaluationSection>
  );
}