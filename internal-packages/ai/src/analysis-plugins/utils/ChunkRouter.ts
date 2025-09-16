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

      // Log detailed routing decisions for each chunk
      logger.info('[ChunkRouter] === DETAILED ROUTING DECISIONS ===');
      for (const chunk of chunks) {
        const assignedPlugins = routingDecisions.get(chunk.id) || [];
        
        // Get first and last few words of chunk for identification
        const chunkText = chunk.text.trim();
        const words = chunkText.split(/\s+/);
        const preview = words.length > 10 
          ? `"${words.slice(0, 5).join(' ')} ... ${words.slice(-5).join(' ')}"`
          : `"${chunkText.substring(0, 100)}${chunkText.length > 100 ? '...' : ''}"`;
        
        logger.info(`[ChunkRouter] Chunk ${chunk.id}:`);
        logger.info(`  Preview: ${preview}`);
        logger.info(`  Length: ${chunk.text.length} chars`);
        logger.info(`  Routed to: ${assignedPlugins.length > 0 ? assignedPlugins.join(', ') : '(none - skipped)'}`);
      }

      // Log routing summary
      const pluginCounts = new Map<string, number>();
      for (const plugins of routingDecisions.values()) {
        for (const plugin of plugins) {
          pluginCounts.set(plugin, (pluginCounts.get(plugin) || 0) + 1);
        }
      }
      
      logger.info('[ChunkRouter] === ROUTING SUMMARY ===');
      logger.info('[ChunkRouter] Total chunks:', chunks.length);
      logger.info('[ChunkRouter] Chunks routed:', routingDecisions.size);
      logger.info('[ChunkRouter] Chunks skipped:', chunks.length - routingDecisions.size);
      logger.info('[ChunkRouter] Plugin assignments:', Object.fromEntries(pluginCounts));

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

    logger.info(`[ChunkRouter] Processing batch of ${chunks.length} chunks...`);
    
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

    const decisions = result.toolResult.decisions || [];
    
    // Log what the LLM decided for this batch
    logger.info(`[ChunkRouter] LLM routing decisions for batch:`);
    for (const decision of decisions) {
      logger.info(`  - Chunk ${decision.chunkId} → ${decision.plugins.length > 0 ? decision.plugins.join(', ') : '(none)'}`);
      if (decision.reasoning) {
        logger.info(`    Reasoning: ${decision.reasoning}`);
      }
    }
    
    return decisions;
  }

  private buildSystemPrompt(): string {
    return `You are a document analysis router. Your job is to decide which specialized plugins should analyze each text chunk.

ROUTING PRINCIPLES:
1. Each chunk can be routed to ZERO, ONE, or MULTIPLE plugins
2. DEFAULT TO INCLUDING chunks for fact-checking unless they are PURELY:
   - Personal feelings/emotions with zero factual content
   - Pure hypothetical scenarios
   - Questions without any statements
3. ALWAYS route to FACT_CHECK if the chunk contains ANY of:
   - Numbers, statistics, percentages (even rough estimates like "many" or "most")
   - Comparisons ("more than", "less than", "same as")
   - Claims about the real world (health, society, economics, etc.)
   - References to studies, research, or sources
   - Statements about what things cause or prevent
   - Claims about organizations, people, events, or places
   - Any statement that could be true or false
4. Even if a chunk has personal opinion, if it ALSO has factual claims, route it to FACT_CHECK

AVAILABLE PLUGINS AND THEIR CRITERIA:

${this.pluginInfo.map(plugin => `
**${plugin.name}**
${plugin.prompt}

Examples:
${plugin.examples.map(ex => `- "${ex.chunkText}" → ${ex.shouldProcess ? 'YES' : 'NO'} (${ex.reason})`).join('\n')}
`).join('\n')}

PLUGIN GUIDELINES:
- MATH: For computational errors, complex formulas, or mathematical proofs
- FACT_CHECK: For ANY verifiable claims - be very inclusive here. This includes:
  * All statistics, percentages, and numerical claims
  * Historical facts, dates, and events
  * Scientific and technical statements
  * Claims about real people, companies, or organizations
  * Any statement that could be fact-checked against sources
- FORECAST: For future predictions with timeframes

When you see data or claims:
- Route to FACT_CHECK liberally - it's better to verify than to miss false information
- Can route to multiple plugins if content overlaps (e.g., a statistic about the past → FACT_CHECK, a calculation error → MATH)
- Default to including FACT_CHECK when unsure if something is verifiable`;
  }

  private buildUserPrompt(chunks: TextChunk[]): string {
    const chunkDescriptions = chunks.map(chunk => 
      `Chunk ${chunk.id}:\n${chunk.text.slice(0, 500)}${chunk.text.length > 500 ? '...' : ''}`
    ).join('\n\n---\n\n');

    return `Please route the following text chunks to the appropriate plugins:

${chunkDescriptions}

Remember:
- Be inclusive for FACT_CHECK - route any chunk with verifiable claims
- A chunk can go to multiple plugins if it contains different types of content
- Pure narrative without any claims can skip all plugins
- When in doubt about factual content, include FACT_CHECK
- It's better to check too many facts than to miss misinformation`;
  }
}