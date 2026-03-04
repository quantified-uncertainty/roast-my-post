/**
 * Article import — thin re-export wrapper.
 *
 * The core fetch/processing logic now lives in @roast/ai so it can be
 * shared between the web app and the agentic MCP tools.
 */
export {
  transformEAForumUrl,
  fetchArticle,
  createCleanDOM,
  extractMetadataSimple,
  extractContent,
  convertToMarkdown,
  cleanMarkdownContent,
  reorganizeFootnotes,
  detectPlatforms,
  processArticle,
} from "@roast/ai/utils/articleFetch";

export type {
  ArticleData,
  ProcessedArticle,
} from "@roast/ai/utils/articleFetch";
