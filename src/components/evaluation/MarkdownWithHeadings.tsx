import MarkdownRenderer from "@/components/MarkdownRenderer";
import { MARKDOWN_COMPONENTS } from "@/components/DocumentWithEvaluations/config/markdown";

interface MarkdownWithHeadingsProps {
  children: string;
  sectionPrefix: string;
  className?: string;
}

// Custom MarkdownRenderer with heading IDs for navigation
export function MarkdownWithHeadings({ 
  children, 
  sectionPrefix,
  className = "prose prose-gray max-w-none"
}: MarkdownWithHeadingsProps) {
  const headingComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => {
      const text = String(children);
      const id = `${sectionPrefix}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
      return (
        <h1 id={id} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0 scroll-mt-8">
          {children}
        </h1>
      );
    },
    h2: ({ children }: { children?: React.ReactNode }) => {
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
      className={className}
      components={combinedComponents}
    >
      {children}
    </MarkdownRenderer>
  );
}