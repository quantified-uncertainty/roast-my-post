import type { EvaluationAgentReview } from "@/types/evaluationAgentReview";
import { StarIcon } from "@heroicons/react/24/solid";

interface AgentRatingsProps {
  reviews: EvaluationAgentReview[];
}

export default function AgentRatings({ reviews }: AgentRatingsProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Agent Ratings</h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.evaluatedAgentId}
            className="flex items-center justify-between border-b border-gray-100 pb-4"
          >
            <div>
              <h3 className="font-medium text-gray-900">
                {review.evaluatedAgentId}
              </h3>
              <p className="text-sm text-gray-500">{review.summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(review.grade / 20)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {review.grade}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
