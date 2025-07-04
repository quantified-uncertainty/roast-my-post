import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";
import { LineBasedHighlighter } from "../commentGeneration/lineBasedHighlighter";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";

const documentInformationSection = (document: Document) => {
  // Get the full content with prepend using the centralized helper
  const { content: fullContent } = getDocumentFullContent(document);
  
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
- Well-written descriptions (100-300 words) that begin with a clear, concise statement of the main point
- Correct line number references (startLine and endLine)
- The description should be self-contained and include all necessary context

If the analysis doesn't have a clear "Key Highlights" section, identify the most important observations from the analysis and create comments for those.

IMPORTANT: Start each description with a strong, clear statement that summarizes the key point (like a title would), then expand with details.`;

  return { systemMessage, userMessage };
}