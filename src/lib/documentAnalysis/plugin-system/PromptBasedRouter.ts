/**
 * Prompt-based router that uses LLM to decide which plugins process which chunks
 */

import { AnalysisPlugin, RoutingDecision, TextChunk } from './types';
import { RoutingPlan } from './RoutingPlan';
import { RichLLMInteraction } from '@/types/llm';
import { callClaude, MODEL_CONFIG } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';

export interface RouterConfig {
  batchSize?: number;
  maxCacheSize?: number;
  maxPreviewLength?: number; // Max chars to show for routing decisions
}

export class PromptBasedRouter {
  private availablePlugins: Map<string, AnalysisPlugin> = new Map();
  private routingCache: Map<string, string[]> = new Map();
  private batchSize: number;
  private maxCacheSize: number;
  private maxPreviewLength: number;
  private llmInteractions: RichLLMInteraction[] = [];
  
  constructor(config: RouterConfig = {}) {
    this.batchSize = config.batchSize ?? 10;
    this.maxCacheSize = config.maxCacheSize ?? 1000;
    this.maxPreviewLength = config.maxPreviewLength ?? 2000; // Default to 2000 chars
  }

  registerPlugin(plugin: AnalysisPlugin): void {
    this.availablePlugins.set(plugin.name(), plugin);
  }

  getPlugin(name: string): AnalysisPlugin | undefined {
    return this.availablePlugins.get(name);
  }

  getAllPlugins(): AnalysisPlugin[] {
    return Array.from(this.availablePlugins.values());
  }

  async routeChunks(chunks: TextChunk[]): Promise<RoutingPlan> {
    if (chunks.length === 0) {
      return new RoutingPlan();
    }

    // Build routing prompt once
    const routingPrompt = this.buildRoutingPrompt();

    // Process chunks in batches
    const routingPlan = new RoutingPlan();
    
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const routingDecisions = await this.routeBatch(batch, routingPrompt);
      
      routingDecisions.forEach((decision) => {
        routingPlan.addRouting(decision.chunkId, decision.plugins);
      });
    }

    return routingPlan;
  }

  private buildRoutingPrompt(): string {
    const pluginDescriptions = Array.from(this.availablePlugins.values())
      .map(plugin => {
        let description = `- ${plugin.name()}: ${plugin.promptForWhenToUse()}`;
        
        // Add examples if available
        const examples = plugin.routingExamples?.() || [];
        if (examples.length > 0) {
          description += '\n  Examples:';
          examples.forEach(ex => {
            const marker = ex.shouldProcess ? '✓' : '✗';
            const preview = ex.chunkText.length > 100 
              ? ex.chunkText.slice(0, 100) + '...' 
              : ex.chunkText;
            description += `\n    ${marker} "${preview}"`;
            if (ex.reason) {
              description += ` (${ex.reason})`;
            }
          });
        }
        
        return description;
      })
      .join('\n\n');

    return `You are a routing system that determines which analysis tools should process each text chunk.

Available tools:
${pluginDescriptions}

For each chunk, return a JSON array of tool names that should process it.

Guidelines:
- Only select tools that are clearly relevant to the chunk content
- SPELLING should be applied to all chunks unless they are purely data/references
- Multiple tools can be applied to the same chunk
- If no tools apply (e.g., empty chunk), return an empty array
- Consider the cost of processing - only route to tools that will likely find something

Your response must be a JSON array with one element per chunk, like:
[["MATH", "FACT_CHECK"], ["SPELLING"], ["FORECAST", "SPELLING"]]

Do not include any explanation or other text, just the JSON array.`;
  }

  private async routeBatch(
    chunks: TextChunk[],
    systemPrompt: string
  ): Promise<RoutingDecision[]> {
    // Check cache first
    const uncachedChunks: TextChunk[] = [];
    const uncachedIndices: number[] = [];
    const cachedResults: Map<number, string[]> = new Map();
    
    chunks.forEach((chunk, index) => {
      const cacheKey = this.getCacheKey(chunk);
      const cached = this.routingCache.get(cacheKey);
      if (cached) {
        cachedResults.set(index, cached);
      } else {
        uncachedChunks.push(chunk);
        uncachedIndices.push(index);
      }
    });

    // If all chunks are cached, return immediately
    if (uncachedChunks.length === 0) {
      return chunks.map((chunk, index) => ({
        chunkId: chunk.id,
        plugins: cachedResults.get(index)!
      }));
    }

    // Build user prompt with uncached chunks
    const userPrompt = this.buildBatchPrompt(uncachedChunks);

    try {
      // Get session context if available
      const currentSession = sessionContext.getSession();
      const sessionConfig = currentSession ? 
        sessionContext.withPath('/plugins/router/batch') : 
        undefined;
      const heliconeHeaders = sessionConfig ? 
        createHeliconeHeaders(sessionConfig) : 
        undefined;
      
      // Call routing model using wrapper with prompt caching
      const { response, interaction } = await callClaude({
        model: MODEL_CONFIG.routing,
        max_tokens: 1000,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        heliconeHeaders,
        enablePromptCaching: true // Enable caching for routing system prompt
      }, this.llmInteractions);

      // Parse response
      const routingArrays = this.parseRoutingResponse(response);

      // Validate we got the right number of responses
      if (routingArrays.length !== uncachedChunks.length) {
        throw new Error(
          `Expected ${uncachedChunks.length} routing decisions but got ${routingArrays.length}`
        );
      }

      // Cache results
      uncachedChunks.forEach((chunk, idx) => {
        const cacheKey = this.getCacheKey(chunk);
        this.addToCache(cacheKey, routingArrays[idx]);
      });

      // Combine cached and new results
      const results: RoutingDecision[] = [];
      let uncachedIndex = 0;

      chunks.forEach((chunk, index) => {
        if (cachedResults.has(index)) {
          results.push({
            chunkId: chunk.id,
            plugins: cachedResults.get(index)!
          });
        } else {
          results.push({
            chunkId: chunk.id,
            plugins: routingArrays[uncachedIndex++]
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Routing error:', error);
      // Fallback: route all chunks to SPELLING only
      return chunks.map(chunk => ({
        chunkId: chunk.id,
        plugins: ['SPELLING']
      }));
    }
  }

  private buildBatchPrompt(chunks: TextChunk[]): string {
    const chunkTexts = chunks.map((chunk, index) => {
      // Truncate only if chunk exceeds maxPreviewLength
      const preview = chunk.text.length > this.maxPreviewLength
        ? chunk.text.slice(0, this.maxPreviewLength) + '...'
        : chunk.text;
      
      let chunkInfo = `Chunk ${index + 1}:\n${preview}`;
      
      // Add metadata if available
      if (chunk.metadata?.section) {
        chunkInfo = `Chunk ${index + 1} (Section: ${chunk.metadata.section}):\n${preview}`;
      }
      
      return chunkInfo;
    }).join('\n\n---\n\n');

    return `Analyze these ${chunks.length} text chunks and determine which tools should process each one:\n\n${chunkTexts}`;
  }

  private parseRoutingResponse(response: any): string[][] {
    const content = response.content[0].text.trim();

    try {
      // First try to parse as a proper JSON array
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and filter plugin names
      return parsed.map(pluginList => {
        if (!Array.isArray(pluginList)) {
          return [];
        }
        // Only keep valid plugin names
        return pluginList.filter(name => 
          typeof name === 'string' && this.availablePlugins.has(name)
        );
      });
    } catch (e) {
      // If direct JSON parsing fails, try to wrap the response
      // Handle cases like ["SPELLING"],["MATH"] by wrapping in outer array
      try {
        const wrappedContent = `[${content}]`;
        const parsed = JSON.parse(wrappedContent);
        if (Array.isArray(parsed)) {
          return parsed.map(pluginList => {
            if (!Array.isArray(pluginList)) {
              return [];
            }
            return pluginList.filter(name => 
              typeof name === 'string' && this.availablePlugins.has(name)
            );
          });
        }
      } catch (wrapError) {
        // Continue to fallback
      }

      console.error('Failed to parse routing response:', e);
      console.error('Response was:', content);
      
      // Fallback: try to extract arrays from text
      const matches = Array.from(content.matchAll(/\[(.*?)\]/g));
      const results: string[][] = [];

      for (const match of matches) {
        const matchText = (match as RegExpMatchArray)[1];
        const plugins = matchText
          .split(',')
          .map((s: string) => s.trim().replace(/["']/g, ''))
          .filter((s: string) => this.availablePlugins.has(s));
        results.push(plugins);
      }

      if (results.length === 0) {
        throw new Error('Could not parse any routing decisions from response');
      }

      return results;
    }
  }

  private getCacheKey(chunk: TextChunk): string {
    // Create a cache key from the first 200 chars + metadata
    const textKey = chunk.text.slice(0, 200);
    const metadataKey = chunk.metadata?.section || '';
    return `${textKey}::${metadataKey}`;
  }

  private addToCache(key: string, value: string[]): void {
    // Simple LRU-ish behavior: if cache is too large, remove oldest entries
    if (this.routingCache.size >= this.maxCacheSize) {
      // Remove first 10% of entries (oldest)
      const keysToRemove = Array.from(this.routingCache.keys())
        .slice(0, Math.floor(this.maxCacheSize * 0.1));
      keysToRemove.forEach(k => this.routingCache.delete(k));
    }
    
    this.routingCache.set(key, value);
  }

  clearCache(): void {
    this.routingCache.clear();
  }

  setCacheSize(size: number): void {
    this.maxCacheSize = size;
  }

  setBatchSize(size: number): void {
    this.batchSize = size;
  }

  getLLMInteractions(): RichLLMInteraction[] {
    return [...this.llmInteractions];
  }

  clearLLMInteractions(): void {
    this.llmInteractions = [];
  }

  getLastLLMInteraction(): RichLLMInteraction | undefined {
    return this.llmInteractions[this.llmInteractions.length - 1];
  }
}