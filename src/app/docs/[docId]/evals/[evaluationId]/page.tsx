import { notFound } from "next/navigation";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { prisma } from "@/lib/prisma";
import { EvaluationNavigation } from "@/components/EvaluationNavigation";

// Function to extract headings from markdown
function extractHeadings(markdown: string): { id: string; label: string; level: number }[] {
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
      
      if (level <= 2) { // Only h1 and h2
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

async function getEvaluation(docId: string, evaluationId: string) {
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      id: evaluationId,
      documentId: docId,
    },
    include: {
      agent: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          job: true,
        },
      },
      document: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return evaluation;
}

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ docId: string; evaluationId: string }>;
}) {
  const resolvedParams = await params;
  const { docId, evaluationId } = resolvedParams;

  const evaluation = await getEvaluation(docId, evaluationId);

  if (!evaluation) {
    notFound();
  }

  const latestVersion = evaluation.versions[0];
  const analysis = latestVersion?.analysis || "";
  const thinking = latestVersion?.job?.llmThinking || "";
  const selfCritique = latestVersion?.selfCritique || "";
  const grade = latestVersion?.grade;
  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const agentDescription = evaluation.agent.versions[0]?.description || "";
  const agentType = evaluation.agent.versions[0]?.agentType || "";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";

  // Extract headings from each section
  const analysisHeadings = analysis ? extractHeadings(analysis) : [];
  const thinkingHeadings = thinking ? extractHeadings(thinking) : [];
  const selfCritiqueHeadings = selfCritique ? extractHeadings(selfCritique) : [];

  // Create navigation items with sub-items
  const navItems = [
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
  ].filter(item => item.show);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sticky Navigation Sidebar */}
          <EvaluationNavigation items={navItems} />

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {agentName} Evaluation
          </h1>
          <p className="text-gray-600">
            Analysis of "{documentTitle}"
          </p>
        </div>

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
                <p className="text-3xl font-bold text-gray-900">{Math.round(grade)}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        <div id="analysis" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 scroll-mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thinking Process</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Self-Critique</h2>
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

        {/* Metadata */}
        {latestVersion && (
          <div className="mt-6 flex justify-between text-sm text-gray-600">
            <div>
              Created: {new Date(latestVersion.createdAt).toLocaleDateString()}
            </div>
            {latestVersion.job?.costInCents && (
              <div>
                Cost: ${(latestVersion.job.costInCents / 100).toFixed(2)}
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}