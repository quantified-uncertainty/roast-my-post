interface Evaluation {
  hasError: boolean;
  successfulResponse?: {
    agreement: number;
    confidence?: number;
  };
}

interface EvaluationDotsProps {
  evaluations: Evaluation[];
  className?: string;
}

// Helper to get color based on agreement score
const getAgreementColor = (agreement: number): string => {
  if (agreement >= 70) return "#22c55e"; // green-500
  if (agreement >= 50) return "#eab308"; // yellow-500
  if (agreement >= 30) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
};

export function EvaluationDots({ evaluations, className = "" }: EvaluationDotsProps) {
  // Sort evaluations: failed first, then by agreement (low to high)
  const sortedEvaluations = [...evaluations].sort((a, b) => {
    // Failed items first
    if (a.hasError && !b.hasError) return -1;
    if (!a.hasError && b.hasError) return 1;

    // Both successful or both failed - sort by agreement (low to high)
    const aAgreement = a.successfulResponse?.agreement ?? 50;
    const bAgreement = b.successfulResponse?.agreement ?? 50;
    return aAgreement - bAgreement;
  });

  if (sortedEvaluations.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      style={
        sortedEvaluations.length > 5
          ? {
              // Multi-row layout: dots flow right-to-left, bottom-to-top
              flexWrap: "wrap-reverse",
              flexDirection: "row-reverse",
              maxWidth: "60px", // Approximately 5 dots per row
            }
          : undefined
      }
    >
      {/* For multi-row layouts, reverse array so most recent is bottom-right */}
      {(sortedEvaluations.length > 5
        ? [...sortedEvaluations].reverse()
        : sortedEvaluations
      ).map((evaluation, idx) => (
        <div
          key={idx}
          className="h-2 w-2 rounded-sm"
          style={{
            backgroundColor: evaluation.hasError
              ? "#9ca3af" // gray-400 for errors
              : getAgreementColor(
                  evaluation.successfulResponse?.agreement ?? 50
                ),
          }}
          title={
            evaluation.hasError
              ? "Failed"
              : `${evaluation.successfulResponse?.agreement}% agreement`
          }
        />
      ))}
    </div>
  );
}
