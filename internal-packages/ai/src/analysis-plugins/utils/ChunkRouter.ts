/**
 * ChunkRouter - Routes text chunks to appropriate plugins based on content analysis
 * 
 * This system uses LLM analysis to determine which plugins should process each chunk,
 * preventing overlap and ensuring appropriate plugin selection.
 */

import { callClaudeWithTool } from '../../claude/wrapper';
import { logger } from '../../shared/logger';
import type { TextChunk } from '../TextChunk';
import type { SimpleAnalysisPlugin, RoutingExample } from '../types';

export interface RoutingDecision {
  chunkId: string;
  plugins: string[]; // Plugin names that should process this chunk
  reasoning?: string;
}

export interface ChunkRoutingResult {
  routingDecisions: Map<string, string[]>; // chunkId -> plugin names
  totalCost: number;
}

interface PluginRoutingInfo {
  name: string;
  prompt: string;
  examples: RoutingExample[];
}

export class ChunkRouter {
  private pluginInfo: PluginRoutingInfo[] = [];

  constructor(plugins: SimpleAnalysisPlugin[]) {
    // Extract routing information from plugins
    this.pluginInfo = plugins.map(plugin => ({
      name: plugin.name(),
      prompt: plugin.promptForWhenToUse(),
      examples: plugin.routingExamples?.() || []
    }));
  }

  /**
   * Route chunks to appropriate plugins using LLM analysis
   */
  async routeChunks(chunks: TextChunk[]): Promise<ChunkRoutingResult> {
    logger.info(`[ChunkRouter] Routing ${chunks.length} chunks to ${this.pluginInfo.length} plugins`);

    const startTime = Date.now();
    const routingDecisions = new Map<string, string[]>();

    try {
      // Process chunks in batches to avoid overwhelming the LLM
      const batchSize = 10;
      const batches: TextChunk[][] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize));
      }

      // Process each batch
      for (const batch of batches) {
        const batchDecisions = await this.routeBatch(batch);
        
        // Merge batch decisions into main map
        for (const decision of batchDecisions) {
          routingDecisions.set(decision.chunkId, decision.plugins);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[ChunkRouter] Routing completed in ${duration}ms`);

      // Log routing summary
      const pluginCounts = new Map<string, number>();
      for (const plugins of routingDecisions.values()) {
        for (const plugin of plugins) {
          pluginCounts.set(plugin, (pluginCounts.get(plugin) || 0) + 1);
        }
      }
      
      logger.info('[ChunkRouter] Routing summary:', Object.fromEntries(pluginCounts));

      return {
        routingDecisions,
        totalCost: 0.001 * batches.length // TODO: Track actual API costs from callClaudeWithTool responses
      };
    } catch (error) {
      logger.error('[ChunkRouter] Routing failed:', error);
      // Conservative fallback: only route to plugins without routing examples
      // This prevents overwhelming the system while still allowing basic functionality
      const fallbackPlugins = this.pluginInfo
        .filter(p => p.examples.length === 0)
        .map(p => p.name);
      
      if (fallbackPlugins.length > 0) {
        for (const chunk of chunks) {
          routingDecisions.set(chunk.id, fallbackPlugins);
        }
      } else {
        // If all plugins have routing examples, do basic keyword matching as last resort
        for (const chunk of chunks) {
          const assignedPlugins: string[] = [];
          
          // Simple keyword-based routing
          const chunkLower = chunk.text.toLowerCase();
          for (const plugin of this.pluginInfo) {
            const promptLower = plugin.prompt.toLowerCase();
            if (
              (promptLower.includes('math') && /\d+[\+\-\*\/\%]|\bmultipl|\bdivid|\bcalculat/.test(chunkLower)) ||
              (promptLower.includes('fact') && /\bwas\b|\bwere\b|\bin \d{4}\b|\baccording to\b/.test(chunkLower)) ||
              (promptLower.includes('forecast') && /\bwill\b|\bexpect|\bpredict|\bnext year\b|\bfuture\b/.test(chunkLower))
            ) {
              assignedPlugins.push(plugin.name);
            }
          }
          
          // If no keyword matches, skip this chunk
          if (assignedPlugins.length > 0) {
            routingDecisions.set(chunk.id, assignedPlugins);
          }
        }
      }
      
      return { routingDecisions, totalCost: 0 };
    }
  }

  private async routeBatch(chunks: TextChunk[]): Promise<RoutingDecision[]> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(chunks);

    
    const result = await callClaudeWithTool<{ decisions: RoutingDecision[] }>({
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }],
      max_tokens: 1000,
      temperature: 0,
      toolName: 'route_chunks',
      toolDescription: 'Decide which plugins should process each text chunk',
      toolSchema: {
        type: 'object',
        properties: {
          decisions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                chunkId: { 
                  type: 'string',
                  description: 'The chunk ID'
                },
                plugins: { 
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of plugin names that should process this chunk'
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation of routing decision (optional)'
                }
              },
              required: ['chunkId', 'plugins']
            }
          }
        },
        required: ['decisions']
      },
      enablePromptCaching: true
    });

    return result.toolResult.decisions || [];
  }

  private buildSystemPrompt(): string {
    return `You are a document analysis router. Your job is to decide which specialized plugins should analyze each text chunk.

CRITICAL ROUTING RULES:
1. Each chunk can be routed to ZERO, ONE, or MULTIPLE plugins
2. Only route to plugins when their specific criteria are clearly met
3. Avoid overlap - be strict about plugin boundaries
4. When in doubt, don't route (better to miss than over-process)

AVAILABLE PLUGINS AND THEIR STRICT CRITERIA:

${this.pluginInfo.map(plugin => `
**${plugin.name}**
${plugin.prompt}

Examples:
${plugin.examples.map(ex => `- "${ex.chunkText}" → ${ex.shouldProcess ? 'YES' : 'NO'} (${ex.reason})`).join('\n')}
`).join('\n')}

OVERLAP PREVENTION RULES:
- MATH: Only for computational errors, complex formulas, or mathematical proofs. NOT for simple percentages or correct calculations.
- FACT_CHECK: Only for verifiable historical/current facts. NOT for predictions or mathematical calculations.
- FORECAST: Only for future predictions with timeframes. NOT for historical data or current statistics.

When you see percentages or statistics:
- Route to MATH only if there's likely a calculation error
- Route to FACT_CHECK only if it's a verifiable claim about the past/present
- Route to FORECAST only if it's predicting future values`;
  }

  private buildUserPrompt(chunks: TextChunk[]): string {
    const chunkDescriptions = chunks.map(chunk => 
      `Chunk ${chunk.id}:\n${chunk.text.slice(0, 500)}${chunk.text.length > 500 ? '...' : ''}`
    ).join('\n\n---\n\n');

    return `Please route the following text chunks to the appropriate plugins:

${chunkDescriptions}

Remember:
- Be strict about plugin boundaries
- A chunk might need NO plugins if it's just narrative text
- Only route when criteria are clearly met
- Prevent overlap between similar plugins`;
  }
}