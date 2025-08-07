import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { prisma } from "@/infrastructure/database/prisma";
import { evaluationWithAllVersions } from "@/infrastructure/database/prisma/evaluation-includes";
import { checkDocumentOwnership } from "@/application/services/document-auth";
import { serializePrismaResult } from "@/infrastructure/database/prisma-serializers";
import { EvaluationNavigation } from "@/components/EvaluationNavigation";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { EvaluationVersionSidebar } from "@/components/EvaluationVersionSidebar";
import { GradeBadge } from "@/components/GradeBadge";
import { VersionPageHeader } from "@/components/VersionPageHeader";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { VersionTabs } from "@/components/VersionTabs";

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
    code: ({ children }: any) => (
      <code className="bg-gray-100 rounded px-1 py-0.5 text-sm">
        {children}
      </code>
    ),
    // Style links
    a: ({ href, children }: any) => (
      <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    // Style horizontal rules
    hr: () => (
      <hr className="my-8 border-gray-200" />
    ),
  };
}

interface PageProps {
  params: Promise<{ 
    docId: string; 
    agentId: string;
    versionNumber: string;
  }>;
}

export default async function EvaluationVersionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { docId, agentId, versionNumber } = resolvedParams;
  const versionNum = parseInt(versionNumber);

  if (!docId || !agentId || isNaN(versionNum)) {
    notFound();
  }

  // Fetch the evaluation with all versions
  const evaluationRaw = await prisma.evaluation.findFirst({
    where: {
      documentId: docId,
      agentId: agentId,
    },
    include: evaluationWithAllVersions,
  });

  if (!evaluationRaw) {
    notFound();
  }

  // Serialize the evaluation to handle Decimal fields
  const evaluation = serializePrismaResult(evaluationRaw);

  // Find the specific version
  const selectedVersion = evaluation.versions.find(v => v.version === versionNum);
  
  if (!selectedVersion) {
    notFound();
  }

  // Extract content from the selected version
  const analysis = selectedVersion.analysis || "No analysis available";
  const summary = selectedVersion.summary || "";
  const thinking = selectedVersion.job?.llmThinking || "";
  const selfCritique = selectedVersion.selfCritique || "";
  const grade = selectedVersion.grade;

  // Agent information
  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const agentDescription = evaluation.agent.versions[0]?.description || "";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";
  const priceString = selectedVersion.job?.priceInDollars as string | null;
  const costInCents = priceString ? Math.round(parseFloat(priceString) * 100) : null;
  const priceInDollars = selectedVersion.job?.priceInDollars;
  const durationInSeconds = selectedVersion.job?.durationInSeconds;
  
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
        items={[
          { label: documentTitle, href: `/docs/${docId}` },
          { label: agentName, href: `/docs/${docId}/evals/${agentId}` },
          { label: `V${versionNum}` }
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
        
        {/* Version Sidebar */}
        <EvaluationVersionSidebar
          docId={docId}
          agentId={agentId}
          versions={evaluation.versions}
          currentVersion={versionNum}
          isOwner={isOwner}
        />
        
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <VersionPageHeader 
            title={`${agentName} Evaluation (v${versionNum})`}
            layout="with-sidebar"
            docId={docId}
            agentId={agentId}
          />

          {/* Tab Navigation */}
          <VersionTabs docId={docId} agentId={agentId} versionNumber={versionNum} />

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
            </div>
            {grade && (
              <div className="ml-4">
                <GradeBadge grade={grade} variant="dark" size="md" />
              </div>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        <div id="analysis" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Analysis</h2>
          </div>
          <div className="prose prose-gray max-w-none">
            {analysis ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={createMarkdownComponents('analysis')}
              >
                {analysis}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">No analysis available</p>
            )}
          </div>
        </div>

        {/* Thinking Process Section */}
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
          <div id="run-stats" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 scroll-mt-8">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Run Statistics</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {costInCents && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cost</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    ${(costInCents / 100).toFixed(3)}
                  </dd>
                </div>
              )}
              {durationInSeconds && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {durationInSeconds < 60 
                      ? `${durationInSeconds}s`
                      : `${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`
                    }
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

            {/* Right Navigation Sidebar */}
            <div className="hidden xl:block">
              <EvaluationNavigation items={navItems} />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}