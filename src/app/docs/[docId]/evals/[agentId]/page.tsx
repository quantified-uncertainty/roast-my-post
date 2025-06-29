import { notFound } from "next/navigation";
import Link from "next/link";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { prisma } from "@/lib/prisma";
import { fullEvaluationInclude } from "@/lib/prisma/evaluation-includes";
import { checkDocumentOwnership } from "@/lib/document-auth";
import { EvaluationNavigation } from "@/components/EvaluationNavigation";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { GradeBadge } from "@/components/GradeBadge";
import { PageHeader } from "@/components/PageHeader";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";

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

// Function to create markdown components with heading IDs
function createMarkdownComponents(sectionPrefix: string) {
  return {
    // Style headings with IDs
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
    h3: ({ children }: any) => (
      <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">
        {children}
      </h3>
    ),
    // Style paragraphs
    p: ({ children }: any) => (
      <p className="text-gray-700 leading-relaxed mb-4">
        {children}
      </p>
    ),
    // Style lists
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
        {children}
      </ol>
    ),
    // Style blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 text-gray-600 italic">
        {children}
      </blockquote>
    ),
    // Style code blocks
    pre: ({ children }: any) => (
      <pre className="bg-gray-100 rounded-md p-4 overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    code: ({ children, ...props }: any) => {
      const isInline = !props.className;
      return isInline ? (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">
          {children}
        </code>
      ) : (
        <code className="text-sm">{children}</code>
      );
    },
    // Style links
    a: ({ children, href }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };
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
  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const agentDescription = evaluation.agent.versions[0]?.description || "";
  const agentType = evaluation.agent.versions[0]?.agentType || "";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";
  const costInCents = latestVersion?.job?.costInCents;
  const durationInSeconds = latestVersion?.job?.durationInSeconds;
  
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
        documentTitle={documentTitle}
        agentName={agentName}
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

        {/* Summary Section */}
        {summary && (
          <div id="summary" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Summary</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Agent Info Card */}
        <div id="agent-info" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 scroll-mt-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{agentName}</h3>
              {agentDescription && (
                <p className="text-sm text-gray-600 mb-2">{agentDescription}</p>
              )}
              {agentType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {agentType}
                </span>
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
        </div>

        {/* Analysis Section */}
        <div id="analysis" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Analysis</h2>
          </div>
          {analysis ? (
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={createMarkdownComponents('analysis')}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No analysis available for this evaluation.
              </p>
            </div>
          )}
        </div>

        {/* Thinking Section */}
        {thinking && (
          <div id="thinking" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Thinking Process</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={createMarkdownComponents('thinking')}
              >
                {thinking}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Self-Critique Section */}
        {selfCritique && (
          <div id="self-critique" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Self-Critique</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={createMarkdownComponents('self-critique')}
              >
                {selfCritique}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Run Stats Section */}
        {(costInCents || durationInSeconds) && (
          <div id="run-stats" className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-8 scroll-mt-8">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Run Stats</h2>
            </div>
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