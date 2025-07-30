import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { CopyButton } from "@/components/CopyButton";
import { EvaluationComments } from "@/components/EvaluationComments";
import { LogsViewer } from "@/components/job";
import { extractHeadings } from "@/lib/evaluation/headingExtractor";
import { EvaluationSection } from "./EvaluationSection";
import { MarkdownWithHeadings } from "./MarkdownWithHeadings";
import { EvaluationDetailsSection } from "./EvaluationDetailsSection";
import { EvaluationNavigation } from "./EvaluationNavigation";
import type { EvaluationContentProps } from "@/lib/evaluation/types";


export function EvaluationContent({
  summary,
  analysis,
  thinking,
  selfCritique,
  logs,
  comments = [],
  agentName,
  agentDescription,
  grade,
  ephemeralBatch,
  costInCents,
  priceInDollars,
  durationInSeconds,
  createdAt,
  isStale = false,
  showNavigation = true,
  compact = false,
  maxWidth = '4xl',
  evaluationData,
  isOnEvalPage = false,
  isOwner = false
}: EvaluationContentProps) {
  // Extract headings from each section
  const analysisHeadings = analysis ? extractHeadings(analysis, 2) : []; // Only H2 for analysis
  const thinkingHeadings = thinking ? extractHeadings(thinking) : []; // H1 and H2 for thinking
  const selfCritiqueHeadings = selfCritique ? extractHeadings(selfCritique) : []; // H1 and H2 for self-critique

  // Create navigation items with sub-items
  const navItems = [
    { 
      id: 'summary', 
      label: 'Summary', 
      show: !!summary,
      subItems: []
    },
    { 
      id: 'evaluation-details', 
      label: 'Evaluation Details', 
      show: true,
      subItems: []
    },
    { 
      id: 'analysis', 
      label: 'Analysis', 
      show: true,
      subItems: analysisHeadings.map(h => ({ ...h, id: `analysis-${h.id}`, level: h.level || 2 }))
    },
    {
      id: 'comments',
      label: 'Comments',
      show: comments && comments.length > 0,
      subItems: comments.map((_, index) => ({
        id: `comment-${index + 1}`,
        label: `Comment ${index + 1}`,
        level: 3
      }))
    },
    { 
      id: 'thinking', 
      label: 'Thinking Process', 
      show: !!thinking,
      subItems: thinkingHeadings.map(h => ({ ...h, id: `thinking-${h.id}`, level: h.level || 1 }))
    },
    { 
      id: 'self-critique', 
      label: 'Self-Critique', 
      show: !!selfCritique,
      subItems: selfCritiqueHeadings.map(h => ({ ...h, id: `self-critique-${h.id}`, level: h.level || 1 }))
    },
    { 
      id: 'logs', 
      label: 'Logs', 
      show: !!logs,
      subItems: []
    },
  ].filter(item => item.show);

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div id="evaluation-content" className={`flex-1 ${
        maxWidth === 'none' ? '' : 
        maxWidth === 'full' ? 'max-w-full' :
        maxWidth === '6xl' ? 'max-w-6xl' :
        'max-w-4xl'
      }`}>
        {/* Stale Evaluation Warning */}
        {isStale && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Warning: Outdated Evaluation</h3>
              <p className="mt-1 text-sm text-yellow-700">
                The document was modified after this evaluation was created. It might be out of date.
              </p>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <EvaluationSection 
            id="summary" 
            title="Summary"
            action={<CopyButton text={summary} />}
          >
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </EvaluationSection>
        )}

        {/* Evaluation Details Section */}
        <EvaluationDetailsSection
          agentName={agentName}
          agentId={evaluationData?.agentId}
          agentDescription={agentDescription}
          grade={grade}
          ephemeralBatch={ephemeralBatch}
          costInCents={costInCents}
          priceInDollars={priceInDollars}
          durationInSeconds={durationInSeconds}
          createdAt={createdAt}
          evaluationData={isOwner ? evaluationData : undefined}
          documentId={evaluationData?.documentId}
          evaluationId={evaluationData?.evaluationId}
          isOnEvalPage={isOnEvalPage}
        />

        {/* Analysis Section */}
        <EvaluationSection 
          id="analysis" 
          title="Analysis"
          action={analysis ? <CopyButton text={analysis} /> : undefined}
        >
          {analysis ? (
            <MarkdownWithHeadings sectionPrefix="analysis">
              {analysis}
            </MarkdownWithHeadings>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No analysis available for this evaluation.
              </p>
            </div>
          )}
        </EvaluationSection>

        {/* Comments Section */}
        {comments && comments.length > 0 && (
          <EvaluationSection 
            id="comments" 
            title={`Comments (${comments.length})`}
            defaultOpen={false}
          >
            <EvaluationComments comments={comments} />
          </EvaluationSection>
        )}

        {/* Thinking Section */}
        {thinking && (
          <EvaluationSection id="thinking" title="Thinking Process">
            <MarkdownWithHeadings sectionPrefix="thinking">
              {thinking}
            </MarkdownWithHeadings>
          </EvaluationSection>
        )}

        {/* Self-Critique Section */}
        {selfCritique && (
          <EvaluationSection 
            id="self-critique" 
            title="Self-Critique"
            action={<CopyButton text={selfCritique} />}
          >
            <MarkdownWithHeadings sectionPrefix="self-critique">
              {selfCritique}
            </MarkdownWithHeadings>
          </EvaluationSection>
        )}

        {/* Logs Section */}
        {logs && (
          <EvaluationSection 
            id="logs" 
            title="Job Logs"
            defaultOpen={false}
          >
            <LogsViewer 
              logs={logs} 
              defaultExpanded={true}
              title=""
              className="mt-0"
            />
          </EvaluationSection>
        )}

      </div>

      {/* Sticky Navigation Sidebar */}
      {showNavigation && (
        <EvaluationNavigation items={navItems} />
      )}
    </div>
  );
}