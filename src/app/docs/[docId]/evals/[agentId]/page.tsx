import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { fullEvaluationInclude } from "@/lib/prisma/evaluation-includes";
import { checkDocumentOwnership } from "@/lib/document-auth";
import { EvaluationNavigation } from "@/components/EvaluationNavigation";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { GradeBadge } from "@/components/GradeBadge";
import { PageHeader } from "@/components/PageHeader";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";
import { EvaluationComments } from "@/components/EvaluationComments";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { MARKDOWN_COMPONENTS } from "@/components/DocumentWithEvaluations/config/markdown";
import { CopyButton } from "@/components/CopyButton";

// Function to extract headings from markdown
function extractHeadings(markdown: string, minLevel: number = 1): { id: string; label: string; level: number }[] {
  const headings: { id: string; label: string; level: number }[] = [];
  const lines = markdown.split('\n');
  
  lines.forEach((line) => {
    // Match markdown headings (# and ##)
    const match = line.match(/^(#{1,2})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // Create a slug from the heading text
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (level >= minLevel && level <= 2) { // Only include headings at minLevel or higher
        headings.push({
          id,
          label: text,
          level
        });
      }
    }
  });
  
  return headings;
}

// Custom MarkdownRenderer with heading IDs for navigation
function MarkdownRendererWithHeadingIds({ 
  children, 
  sectionPrefix 
}: { 
  children: string; 
  sectionPrefix: string; 
}) {
  const headingComponents = {
    h1: ({ children }: any) => {
      const text = String(children);
      const id = `${sectionPrefix}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
      return (
        <h1 id={id} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0 scroll-mt-8">
          {children}
        </h1>
      );
    },
    h2: ({ children }: any) => {
      const text = String(children);
      const id = `${sectionPrefix}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
      return (
        <h2 id={id} className="text-xl font-semibold text-gray-800 mt-6 mb-3 scroll-mt-8">
          {children}
        </h2>
      );
    },
  };

  // Merge shared components with custom heading components
  const combinedComponents = {
    ...MARKDOWN_COMPONENTS,
    ...headingComponents,
  };

  return (
    <MarkdownRenderer 
      className="prose prose-gray max-w-none"
      components={combinedComponents}
    >
      {children}
    </MarkdownRenderer>
  );
}

async function getEvaluation(docId: string, agentId: string) {
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      agentId: agentId,
      documentId: docId,
    },
    include: fullEvaluationInclude,
  });

  return evaluation;
}

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ docId: string; agentId: string }>;
}) {
  const resolvedParams = await params;
  const { docId, agentId } = resolvedParams;

  const evaluation = await getEvaluation(docId, agentId);

  if (!evaluation) {
    notFound();
  }

  const latestVersion = evaluation.versions[0];
  const analysis = latestVersion?.analysis || "";
  const thinking = latestVersion?.job?.llmThinking || "";
  const selfCritique = latestVersion?.selfCritique || "";
  const summary = latestVersion?.summary || "";
  const grade = latestVersion?.grade;
  const comments = latestVersion?.comments || [];
  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const agentDescription = evaluation.agent.versions[0]?.description || "";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";
  const costInCents = latestVersion?.job?.costInCents;
  const durationInSeconds = latestVersion?.job?.durationInSeconds;
  
  // Check if this evaluation is stale
  const isStale = latestVersion?.isStale || false;
  
  // Get all evaluations for the sidebar
  const allEvaluations = evaluation.document.evaluations || [];
  
  // Check if current user owns the document
  const isOwner = await checkDocumentOwnership(docId);

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
      id: 'agent-info', 
      label: 'Agent Information', 
      show: true,
      subItems: []
    },
    { 
      id: 'analysis', 
      label: 'Analysis', 
      show: true,
      subItems: analysisHeadings.map(h => ({ ...h, id: `analysis-${h.id}` }))
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
      subItems: thinkingHeadings.map(h => ({ ...h, id: `thinking-${h.id}` }))
    },
    { 
      id: 'self-critique', 
      label: 'Self-Critique', 
      show: !!selfCritique,
      subItems: selfCritiqueHeadings.map(h => ({ ...h, id: `self-critique-${h.id}` }))
    },
    { 
      id: 'run-stats', 
      label: 'Run Stats', 
      show: !!(costInCents || durationInSeconds),
      subItems: []
    },
  ].filter(item => item.show);

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Breadcrumb Navigation - Full Width */}
      <BreadcrumbHeader 
        items={[
          { label: documentTitle, href: `/docs/${docId}` },
          { label: agentName }
        ]}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar 
          docId={docId}
          currentAgentId={agentId}
          evaluations={allEvaluations}
          isOwner={isOwner}
        />
        
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <PageHeader 
            title={`${agentName} Evaluation`}
            layout="with-sidebar"
          />

          {/* Tab Navigation */}
          <EvaluationTabsWrapper 
            docId={docId} 
            agentId={agentId} 
            latestVersionNumber={latestVersion?.version || 1}
          />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Main Content */}
            <div id="evaluation-content" className="flex-1 max-w-4xl">

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
          <CollapsibleSection 
            id="summary" 
            title="Summary"
            action={<CopyButton text={summary} />}
          >
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </CollapsibleSection>
        )}

        {/* Agent Information Section */}
        <CollapsibleSection id="agent-info" title="Agent Information">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{agentName}</h3>
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
        </CollapsibleSection>

        {/* Analysis Section */}
        <CollapsibleSection 
          id="analysis" 
          title="Analysis"
          action={analysis ? <CopyButton text={analysis} /> : undefined}
        >
          {analysis ? (
            <MarkdownRendererWithHeadingIds sectionPrefix="analysis">
              {analysis}
            </MarkdownRendererWithHeadingIds>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No analysis available for this evaluation.
              </p>
            </div>
          )}
        </CollapsibleSection>

        {/* Comments Section */}
        {comments && comments.length > 0 && (
          <CollapsibleSection 
            id="comments" 
            title={`Comments (${comments.length})`}
            defaultOpen={false}
          >
            <EvaluationComments comments={comments} />
          </CollapsibleSection>
        )}

        {/* Thinking Section */}
        {thinking && (
          <CollapsibleSection id="thinking" title="Thinking Process">
            <MarkdownRendererWithHeadingIds sectionPrefix="thinking">
              {thinking}
            </MarkdownRendererWithHeadingIds>
          </CollapsibleSection>
        )}

        {/* Self-Critique Section */}
        {selfCritique && (
          <CollapsibleSection 
            id="self-critique" 
            title="Self-Critique"
            action={<CopyButton text={selfCritique} />}
          >
            <MarkdownRendererWithHeadingIds sectionPrefix="self-critique">
              {selfCritique}
            </MarkdownRendererWithHeadingIds>
          </CollapsibleSection>
        )}

        {/* Run Stats Section */}
        {(costInCents || durationInSeconds) && (
          <CollapsibleSection id="run-stats" title="Run Stats">
            <div className="-m-8 p-8 bg-slate-50 rounded-b-lg">
            <div className="grid grid-cols-2 gap-4">
              {durationInSeconds !== undefined && durationInSeconds !== null && (
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-lg font-medium text-gray-900">
                    {durationInSeconds < 60 
                      ? `${Math.round(durationInSeconds)}s`
                      : `${Math.floor(durationInSeconds / 60)}m ${Math.round(durationInSeconds % 60)}s`}
                  </p>
                </div>
              )}
              {costInCents !== undefined && costInCents !== null && (
                <div>
                  <p className="text-sm text-gray-500">Cost</p>
                  <p className="text-lg font-medium text-gray-900">
                    ${(costInCents / 100).toFixed(3)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(latestVersion.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            </div>
          </CollapsibleSection>
        )}
            </div>

            {/* Sticky Navigation Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-8">
                <EvaluationNavigation items={navItems} />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}