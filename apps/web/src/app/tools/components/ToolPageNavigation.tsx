import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface ToolPageNavigationProps {
  toolId: string;
  toolName: string;
  currentPage: 'docs' | 'try';
}

export function ToolPageNavigation({ toolId, toolName, currentPage }: ToolPageNavigationProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link 
        href="/" 
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home size={16} />
      </Link>
      
      <ChevronRight size={16} />
      
      <Link 
        href="/tools" 
        className="hover:text-foreground transition-colors"
      >
        Tools
      </Link>
      
      <ChevronRight size={16} />
      
      <Link 
        href={`/tools/${toolId}/docs`}
        className="hover:text-foreground transition-colors"
      >
        {toolName}
      </Link>
      
      {currentPage === 'try' && (
        <>
          <ChevronRight size={16} />
          <span className="text-foreground font-medium">Try It</span>
        </>
      )}
      
      {currentPage === 'docs' && (
        <>
          <ChevronRight size={16} />
          <span className="text-foreground font-medium">Documentation</span>
        </>
      )}
    </nav>
  );
}