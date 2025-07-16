import { GradeBadge } from "@/components/GradeBadge";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { EvaluationSection } from "./EvaluationSection";

interface AgentInfoSectionProps {
  agentName: string;
  agentDescription?: string;
  grade?: number | null;
  ephemeralBatch?: {
    trackingId: string | null;
    isEphemeral: boolean;
  } | null;
}

export function AgentInfoSection({
  agentName,
  agentDescription,
  grade,
  ephemeralBatch
}: AgentInfoSectionProps) {
  return (
    <EvaluationSection id="agent-info" title="Agent Information">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{agentName}</h3>
            {ephemeralBatch && ephemeralBatch.trackingId && (
              <ExperimentalBadge 
                trackingId={ephemeralBatch.trackingId}
                className="ml-2"
              />
            )}
          </div>
          {agentDescription && (
            <p className="text-sm text-gray-600 mb-2">{agentDescription}</p>
          )}
        </div>
        {grade !== undefined && grade !== null && (
          <div className="ml-6 text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade</p>
            <div className="mt-1">
              <GradeBadge grade={grade} variant="dark" size="md" className="text-2xl px-4 py-1" />
            </div>
          </div>
        )}
      </div>
    </EvaluationSection>
  );
}