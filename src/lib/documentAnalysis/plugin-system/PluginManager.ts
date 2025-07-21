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

      // Process with each plugin in parallel
      const pluginResults = new Map<string, AnalysisResult>();
      const allComments: Comment[] = [];
      let totalCost = 0;

      console.log(`🔍 Running ${plugins.length} plugins in parallel...`);
      
      // Create promises for all plugin analyses
      const pluginPromises = plugins.map(async (plugin) => {
        try {
          console.log(`   Starting ${plugin.name()} analysis...`);
          const startTime = Date.now();
          const result = await plugin.analyze(chunks, text);
          const duration = Date.now() - startTime;
          
          console.log(`   ${plugin.name()}: Found ${result.comments.length} issues (${duration}ms)`);
          return { plugin: plugin.name(), result, success: true };
        } catch (error) {
          console.error(`   ${plugin.name()} failed:`, error);
          return { 
            plugin: plugin.name(), 
            error: error instanceof Error ? error.message : String(error),
            success: false 
          };
        }
      });

      // Wait for all plugins to complete
      const results = await Promise.all(pluginPromises);

      // Process results
      for (const { plugin, result, success, error } of results) {
        if (success && result) {
          pluginResults.set(plugin, result);
          allComments.push(...result.comments);
          totalCost += result.cost;
        } else {
          console.warn(`Plugin ${plugin} failed: ${error}`);
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
    
    // Run all plugins in parallel
    const pluginPromises = plugins.map(async (plugin) => {
      try {
        const result = await plugin.analyze([chunk], chunk.text);
        return { plugin: plugin.name(), result, success: true };
      } catch (error) {
        console.error(`Plugin ${plugin.name()} failed:`, error);
        return { 
          plugin: plugin.name(), 
          error: error instanceof Error ? error.message : String(error),
          success: false 
        };
      }
    });
    
    // Wait for all to complete
    const pluginResults = await Promise.all(pluginPromises);
    
    // Process results
    for (const { plugin, result, success, error } of pluginResults) {
      if (success) {
        results.set(plugin, result);
      } else {
        results.set(plugin, { error });
      }
    }
    
    return results;
  }
}