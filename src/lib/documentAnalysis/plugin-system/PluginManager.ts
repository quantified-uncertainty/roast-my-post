/**
 * Plugin Manager - Coordinates the entire document analysis process
 */

import { PromptBasedRouter, RouterConfig } from './PromptBasedRouter';
import { AnalysisPlugin, DocumentProfile, SynthesisResult, SimpleAnalysisPlugin, AnalysisResult } from './types';
import { TextChunk, createChunks } from './TextChunk';
import type { Comment } from '@/types/documentSchema';
import type { HeliconeSessionConfig } from '../../helicone/sessions';
import { sessionContext } from '../../helicone/sessionContext';

export interface DocumentAnalysisResult {
  summary: string;
  pluginResults: Map<string, SynthesisResult>;
  pluginComments: Map<string, Comment[]>;
  statistics: {
    totalChunks: number;
    totalComments: number;
    commentsByPlugin: Map<string, number>;
    tokensUsed: number;
    processingTime: number;
  };
  recommendations: string[];
}

export interface PluginManagerConfig {
  routerConfig?: RouterConfig;
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
  private router: PromptBasedRouter;
  private startTime: number = 0;
  private sessionConfig?: HeliconeSessionConfig;

  constructor(config: PluginManagerConfig = {}) {
    this.router = new PromptBasedRouter(config.routerConfig);
    this.sessionConfig = config.sessionConfig;
  }

  registerPlugin(plugin: AnalysisPlugin): void {
    this.router.registerPlugin(plugin);
  }

  registerPlugins(plugins: AnalysisPlugin[]): void {
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  async analyzeDocument(
    text: string,
    options: {
      chunkSize?: number;
      chunkByParagraphs?: boolean;
      documentProfile?: DocumentProfile;
    } = {}
  ): Promise<DocumentAnalysisResult> {
    this.startTime = Date.now();
    
    // Set global session context for plugins
    if (this.sessionConfig) {
      sessionContext.setSession(this.sessionConfig);
    }
    
    try {
      // Phase 1: Create chunks
    console.log('📄 Creating document chunks...');
    const chunks = createChunks(text, {
      chunkSize: options.chunkSize || 1000,
      chunkByParagraphs: options.chunkByParagraphs || false
    });
    console.log(`   Created ${chunks.length} chunks`);

    // Phase 2: Route chunks to plugins
    console.log('\n🔀 Routing chunks to appropriate plugins...');
    const routingPlan = await this.router.routeChunks(chunks);
    const routingStats = routingPlan.getStats();
    console.log(`   Routing complete:`, routingStats);

    // Phase 3: Process chunks
    console.log('\n⚙️  Processing chunks with plugins...');
    await this.processChunks(chunks, routingPlan);

    // Phase 4: Synthesize results
    console.log('\n📊 Synthesizing results...');
    const { results: pluginResults, comments: pluginComments } = await this.synthesizeResults(text);

    // Phase 5: Create final analysis
    const analysis = this.createFinalAnalysis(pluginResults, pluginComments, chunks.length);

    console.log('\n✅ Analysis complete!');
    return analysis;
    } finally {
      // Clear session context
      if (this.sessionConfig) {
        sessionContext.clear();
      }
    }
  }

  async analyzeText(
    text: string,
    options?: {
      chunkSize?: number;
      chunkByParagraphs?: boolean;
    }
  ): Promise<DocumentAnalysisResult> {
    return this.analyzeDocument(text, options);
  }

  private async processChunks(
    chunks: TextChunk[],
    routingPlan: any
  ): Promise<void> {
    const maxConcurrency = 20; // Increased from 5 - parallel processing working well, can handle more load
    
    // Create processing tasks for all chunks
    const chunkTasks = chunks.map((chunk, i) => ({
      chunk,
      index: i,
      plugins: routingPlan.getPluginsForChunk(chunk.id)
    })).filter(task => task.plugins.length > 0);

    console.log(`   Processing ${chunkTasks.length} chunks with up to ${maxConcurrency} concurrent tasks...`);

    // Process chunks in batches with controlled concurrency
    for (let i = 0; i < chunkTasks.length; i += maxConcurrency) {
      const batch = chunkTasks.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (task) => {
        try {
          console.log(`   Processing chunk ${task.index + 1}/${chunks.length} with ${task.plugins.length} plugins...`);
          
          // Process chunk with each assigned plugin in parallel
          const pluginPromises = task.plugins.map(async (pluginName: string) => {
            const plugin = this.router.getPlugin(pluginName);
            if (plugin) {
              try {
                await plugin.processChunk(task.chunk);
              } catch (error) {
                console.error(`     Error in ${pluginName} for chunk ${task.index + 1}:`, error);
              }
            }
          });
          
          await Promise.all(pluginPromises);
        } catch (error) {
          console.error(`     Error processing chunk ${task.index + 1}:`, error);
        }
      });

      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);
    }
  }

  private async synthesizeResults(documentText: string): Promise<{ 
    results: Map<string, SynthesisResult>;
    comments: Map<string, Comment[]>;
  }> {
    const results = new Map<string, SynthesisResult>();
    const comments = new Map<string, Comment[]>();
    const plugins = this.router.getAllPlugins();

    for (const plugin of plugins) {
      try {
        console.log(`   Synthesizing ${plugin.name()} results...`);
        
        // Generate comments if the plugin supports it
        if (plugin.generateComments) {
          console.log(`     Generating comments for ${plugin.name()}...`);
          const pluginComments = plugin.generateComments({
            documentText,
            maxComments: 50  // Could be configurable
          });
          console.log(`     Generated ${pluginComments.length} comments`);
          comments.set(plugin.name(), pluginComments);
        } else {
          comments.set(plugin.name(), []);
        }
        
        const result = await plugin.synthesize();
        results.set(plugin.name(), result);
      } catch (error) {
        console.error(`   Error synthesizing ${plugin.name()}:`, error);
      }
    }

    return { results, comments };
  }

  private createFinalAnalysis(
    pluginResults: Map<string, SynthesisResult>,
    pluginComments: Map<string, Comment[]>,
    totalChunks: number
  ): DocumentAnalysisResult {
    // Aggregate statistics
    let totalComments = 0;
    let totalTokens = 0;
    const commentsByPlugin = new Map<string, number>();
    const allRecommendations: string[] = [];

    // Collect comment counts
    for (const [pluginName, comments] of Array.from(pluginComments.entries())) {
      const count = comments.length;
      totalComments += count;
      commentsByPlugin.set(pluginName, count);
    }

    // Collect recommendations and tokens
    for (const [pluginName, result] of Array.from(pluginResults.entries())) {
      if (result.recommendations) {
        allRecommendations.push(...result.recommendations);
      }

      // Sum up tokens from LLM calls
      result.llmCalls.forEach(call => {
        totalTokens += call.tokensUsed.total;
      });
    }

    // Include router LLM interactions in token count
    const routerInteractions = this.router.getLLMInteractions();
    routerInteractions.forEach(interaction => {
      totalTokens += interaction.tokensUsed.total;
    });

    // Create summary
    const summaryParts: string[] = [];
    
    for (const [pluginName, result] of Array.from(pluginResults.entries())) {
      if (result.summary) {
        summaryParts.push(`${pluginName}: ${result.summary}`);
      }
    }

    const summary = summaryParts.join('\n\n');

    // Deduplicate recommendations
    const uniqueRecommendations = Array.from(new Set(allRecommendations));

    const processingTime = Date.now() - this.startTime;

    return {
      summary,
      pluginResults,
      pluginComments,
      statistics: {
        totalChunks,
        totalComments,
        commentsByPlugin,
        tokensUsed: totalTokens,
        processingTime
      },
      recommendations: uniqueRecommendations
    };
  }

  // Helper method to analyze a single chunk with specific plugins
  async analyzeChunk(
    chunk: TextChunk,
    pluginNames?: string[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    const plugins = pluginNames 
      ? pluginNames.map(name => this.router.getPlugin(name)).filter(p => p !== undefined)
      : this.router.getAllPlugins();

    for (const plugin of plugins) {
      try {
        const result = await plugin.processChunk(chunk);
        results.set(plugin.name(), result);
      } catch (error) {
        console.error(`Error in ${plugin.name()}:`, error);
        results.set(plugin.name(), { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  // Clear all plugin states
  clearAllStates(): void {
    this.router.getAllPlugins().forEach(plugin => plugin.clearState());
  }

  // Get current state of a specific plugin
  getPluginState(pluginName: string): any {
    const plugin = this.router.getPlugin(pluginName);
    return plugin ? plugin.getState() : null;
  }

  // Configuration methods
  setRoutingBatchSize(size: number): void {
    this.router.setBatchSize(size);
  }

  setRoutingCacheSize(size: number): void {
    this.router.setCacheSize(size);
  }

  clearRoutingCache(): void {
    this.router.clearCache();
  }

  /**
   * Simplified document analysis using new plugin API
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

    // Create chunks for plugins to use
    const chunks = createChunks(text);
    
    // Run all plugins in parallel
    const pluginResults = new Map<string, AnalysisResult>();
    const allComments: Comment[] = [];
    let totalCost = 0;
    
    await Promise.all(
      plugins.map(async (plugin) => {
        try {
          console.log(`🔍 Running ${plugin.name()} analysis...`);
          const result = await plugin.analyze(chunks, text);
          
          pluginResults.set(plugin.name(), result);
          allComments.push(...result.comments);
          totalCost += result.cost;
          
          console.log(`✅ ${plugin.name()}: ${result.comments.length} comments, $${result.cost.toFixed(4)}`);
        } catch (error) {
          console.error(`❌ ${plugin.name()} failed:`, error);
          // Store empty result for failed plugins
          pluginResults.set(plugin.name(), {
            summary: "",
            analysis: `Error: ${error instanceof Error ? error.message : String(error)}`,
            comments: [],
            llmInteractions: [],
            cost: 0
          });
        }
      })
    );

    // Generate overall summary
    const pluginSummaries = Array.from(pluginResults.entries())
      .filter(([_, result]) => result.summary)
      .map(([name, result]) => `**${name}**: ${result.summary}`)
      .join('\n');

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
  }

  // Router LLM interaction methods for monitoring
  getRouterLLMInteractions() {
    return this.router.getLLMInteractions();
  }

  clearRouterLLMInteractions(): void {
    this.router.clearLLMInteractions();
  }

  getLastRouterLLMInteraction() {
    return this.router.getLastLLMInteraction();
  }
}