import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";
import { LineBasedHighlighter } from "../commentGeneration/lineBasedHighlighter";

const documentInformationSection = (document: Document) => {
  const highlighter = new LineBasedHighlighter(document.content);
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
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

Your task is to extract and format comments from a comprehensive analysis that has already been completed. The analysis contains a "Key Insights for Commentary" section with pre-identified insights that should become comments.

You should:
1. Extract the insights from the analysis
2. Format them as proper comments with correct line numbers
3. Ensure each comment is well-written and self-contained
4. Reference specific lines in the document

${agentInfo.commentInstructions || ''}`;

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