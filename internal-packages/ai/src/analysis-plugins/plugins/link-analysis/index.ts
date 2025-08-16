import {
  generateLinkAnalysisAndSummary,
  generateLinkHighlights,
  validateUrls,
  extractUrls,
} from "../../../tools/link-validator";
import type { TextChunk } from "../../TextChunk";
import type { AnalysisResult, SimpleAnalysisPlugin } from "../../types";

/**
 * Link Analysis Plugin
 * A minimal wrapper that validates URLs and generates comments for broken links
 */
export class LinkAnalysisPlugin implements SimpleAnalysisPlugin {
  static readonly runOnAllChunks = true;
  readonly runOnAllChunks = true;

  name = () => "LINK_ANALYSIS";
  promptForWhenToUse = () => "Link analysis automatically runs on all documents";
  routingExamples = () => [];
  getCost = () => 0;
  getDebugInfo = () => ({ plugin: "LinkAnalysisPlugin", version: "1.0.0" });

  async analyze(_chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    const urls = extractUrls(documentText, 50);
    
    if (!urls.length) {
      return {
        summary: "No external links found in the document",
        analysis: "# Link Analysis Report\n\nNo external links were found in this document.",
        comments: [],
        cost: 0,
        grade: 100,
      };
    }
    
    const results = await validateUrls(urls.map(url => ({ url })));
    const { analysis, summary, grade } = generateLinkAnalysisAndSummary(results, "Document");
    
    return {
      summary,
      analysis,
      comments: generateLinkHighlights(results, urls, documentText, 50),
      cost: 0,
      grade,
    };
  }
}

export { LinkAnalysisPlugin as LinkPlugin };