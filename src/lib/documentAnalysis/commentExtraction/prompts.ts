import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";
import { LineBasedHighlighter } from "../commentGeneration/lineBasedHighlighter";
import { generateMarkdownPrepend } from "../../../utils/documentMetadata";

const documentInformationSection = (document: Document) => {
  // Check if document has markdownPrepend (for backward compatibility)
  const markdownPrepend = (document as any).versions?.[0]?.markdownPrepend || generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: (document as any).platforms,
    publishedDate: document.publishedDate
  });

  // Combine prepend with content
  const fullContent = markdownPrepend + document.content;
  
  const highlighter = new LineBasedHighlighter(fullContent);
  return `<document>
  <metadata>
    <title>${document.title}</title>
    <author>${document.author}</author>
    <published>${new Date(document.publishedDate).toLocaleDateString()}</published>
  </metadata>
  <content>
${highlighter.getNumberedLines()}
  </content>
</document>`;
};

export function getCommentExtractionPrompts(
  document: Document,
  agentInfo: Agent,
  analysisData: ComprehensiveAnalysisOutputs,
  targetComments: number
): { systemMessage: string; userMessage: string } {
  const systemMessage = `Context: ${agentInfo.name} - ${agentInfo.description}

This process extracts and formats comments from the completed analysis. The analysis contains highlighted sections that need to be converted into structured comments.

The extraction process:
1. Identifies insights from the analysis
2. Formats them with proper line number references
3. Ensures each comment stands alone as a complete observation
4. Maps comments to specific document passages

`;

  const userMessage = `${documentInformationSection(document)}

<comprehensive_analysis>
${analysisData.analysis}
</comprehensive_analysis>

Based on the comprehensive analysis above, please extract and format ${targetComments} comments. 

Look for the "Key Insights for Commentary" section in the analysis, which contains pre-identified insights with:
- Location (line numbers)
- Observation
- Significance  
- Suggested comment text

Convert these insights into properly formatted comments with:
- Clear, descriptive titles (max 80 characters)
- Well-written body text (100-300 words)
- Correct line number references (startLine and endLine)

If the analysis doesn't have a clear "Key Insights" section, identify the most important observations from the analysis and create comments for those.`;

  return { systemMessage, userMessage };
}