/**
 * Plugin Manager - Coordinates document analysis with the new plugin API
 * 
 * This is a simplified version that only supports the new SimpleAnalysisPlugin interface.
 * For legacy plugin support, see the git history or deprecated-types.ts.
 */

import { SimpleAnalysisPlugin, AnalysisResult } from './types';
import { TextChunk, createChunks } from './TextChunk';
import type { Comment } from '@/types/documentSchema';
import type { HeliconeSessionConfig } from '../../helicone/sessions';
import { sessionContext } from '../../helicone/sessionContext';

export interface PluginManagerConfig {
  sessionConfig?: HeliconeSessionConfig;
}

export interface SimpleDocumentAnalysisResult {
  summary: string;
  analysis: string;
  pluginResults: Map<string, AnalysisResult>;
  allComments: Comment[];
  statistics: {
    totalChunks: number;
    totalComments: number;
    commentsByPlugin: Map<string, number>;
    totalCost: number;
    processingTime: number;
  };
}

export class PluginManager {
  private sessionConfig?: HeliconeSessionConfig;
  private startTime: number = 0;

  constructor(config: PluginManagerConfig = {}) {
    this.sessionConfig = config.sessionConfig;
  }

  /**
   * Analyze a document using the new SimpleAnalysisPlugin API
   * Each plugin gets all chunks and handles its own workflow
   */
  async analyzeDocumentSimple(
    text: string,
    plugins: SimpleAnalysisPlugin[]
  ): Promise<SimpleDocumentAnalysisResult> {
    this.startTime = Date.now();

    // Set session context if available
    if (this.sessionConfig) {
      sessionContext.setSession(this.sessionConfig);
    }

    try {
      // Create chunks
      console.log('📄 Creating document chunks...');
      const chunks = createChunks(text, {
        chunkSize: 1000,
        chunkByParagraphs: false
      });
      console.log(`   Created ${chunks.length} chunks`);

      // Process with each plugin
      const pluginResults = new Map<string, AnalysisResult>();
      const allComments: Comment[] = [];
      let totalCost = 0;

      for (const plugin of plugins) {
        try {
          console.log(`🔍 Running ${plugin.name()} analysis...`);
          const result = await plugin.analyze(chunks, text);
          
          pluginResults.set(plugin.name(), result);
          allComments.push(...result.comments);
          totalCost += result.cost;
          
          console.log(`   ${plugin.name()}: Found ${result.comments.length} issues`);
        } catch (error) {
          console.error(`   ${plugin.name()} failed:`, error);
          // Continue with other plugins
        }
      }

      // Generate summaries
      const pluginSummaries = Array.from(pluginResults.entries())
        .map(([name, result]) => `**${name}**: ${result.summary}`)
        .join('\n\n');

      const summary = `Analyzed ${chunks.length} sections with ${plugins.length} plugins. Found ${allComments.length} total issues.`;
      
      const analysis = `**Document Analysis Summary**\n\nThis document was analyzed by ${plugins.length} specialized plugins that examined ${chunks.length} sections.\n\n${pluginSummaries}`;

      // Calculate statistics
      const commentsByPlugin = new Map<string, number>();
      for (const [name, result] of pluginResults) {
        commentsByPlugin.set(name, result.comments.length);
      }

      const processingTime = Date.now() - this.startTime;

      return {
        summary,
        analysis,
        pluginResults,
        allComments,
        statistics: {
          totalChunks: chunks.length,
          totalComments: allComments.length,
          commentsByPlugin,
          totalCost,
          processingTime
        }
      };
    } finally {
      // Clear session context
      if (this.sessionConfig) {
        sessionContext.clear();
      }
    }
  }

  /**
   * Helper method to analyze a single chunk with specific plugins
   * Useful for testing or targeted analysis
   */
  async analyzeChunk(
    chunk: TextChunk,
    plugins: SimpleAnalysisPlugin[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const plugin of plugins) {
      try {
        // Run plugin on single chunk
        const result = await plugin.analyze([chunk], chunk.text);
        results.set(plugin.name(), result);
      } catch (error) {
        console.error(`Plugin ${plugin.name()} failed:`, error);
        results.set(plugin.name(), { error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return results;
  }
}