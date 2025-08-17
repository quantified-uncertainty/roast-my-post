/**
 * Plugin Router - Determines which plugins should process which chunks
 * 
 * Separated from PluginManager to handle the routing logic independently.
 */

import { SimpleAnalysisPlugin } from "../types";
import { TextChunk } from "../TextChunk";
import { ChunkRouter } from "../utils/ChunkRouter";
import { logger } from "../../shared/logger";

export interface RoutingDecision {
  pluginName: string;
  chunks: TextChunk[];
  reason: 'always-run' | 'routed' | 'skipped';
}

export interface RoutingResult {
  decisions: Map<string, RoutingDecision>;
  totalCost: number;
  routingTime: number;
}

/**
 * Routes document chunks to appropriate plugins
 */
export class PluginRouter {
  private chunkRouter: ChunkRouter | null = null;

  /**
   * Route chunks to plugins based on their requirements
   */
  async route(
    plugins: SimpleAnalysisPlugin[],
    chunks: TextChunk[]
  ): Promise<RoutingResult> {
    const startTime = Date.now();
    const decisions = new Map<string, RoutingDecision>();
    let totalCost = 0;

    // Separate plugins by routing type
    const alwaysRunPlugins: SimpleAnalysisPlugin[] = [];
    const routedPlugins: SimpleAnalysisPlugin[] = [];

    for (const plugin of plugins) {
      if (plugin.runOnAllChunks) {
        alwaysRunPlugins.push(plugin);
      } else {
        routedPlugins.push(plugin);
      }
    }

    // Assign all chunks to always-run plugins
    for (const plugin of alwaysRunPlugins) {
      decisions.set(plugin.name(), {
        pluginName: plugin.name(),
        chunks: [...chunks], // Copy array to prevent mutations
        reason: 'always-run',
      });
      
      logger.info(`Plugin ${plugin.name()} will run on all ${chunks.length} chunks (always-run)`);
    }

    // Route chunks for plugins that need routing
    if (routedPlugins.length > 0 && chunks.length > 0) {
      // Create chunk router if needed
      if (!this.chunkRouter) {
        this.chunkRouter = new ChunkRouter(routedPlugins);
      }

      // Perform routing
      const routingResult = await this.chunkRouter.routeChunks(chunks);
      totalCost += routingResult.totalCost;

      // Convert routing decisions to our format
      const chunkMap = new Map<string, TextChunk[]>();
      
      // Initialize empty arrays for all routed plugins
      for (const plugin of routedPlugins) {
        chunkMap.set(plugin.name(), []);
      }

      // Populate chunks based on routing decisions
      for (const [chunkId, pluginNames] of routingResult.routingDecisions) {
        const chunk = chunks.find(c => c.id === chunkId);
        if (chunk) {
          for (const pluginName of pluginNames) {
            const pluginChunks = chunkMap.get(pluginName);
            if (pluginChunks) {
              pluginChunks.push(chunk);
            }
          }
        }
      }

      // Create routing decisions
      for (const plugin of routedPlugins) {
        const assignedChunks = chunkMap.get(plugin.name()) || [];
        
        decisions.set(plugin.name(), {
          pluginName: plugin.name(),
          chunks: assignedChunks,
          reason: assignedChunks.length > 0 ? 'routed' : 'skipped',
        });

        logger.info(
          `Plugin ${plugin.name()} assigned ${assignedChunks.length} chunks via routing`
        );
      }
    }

    const routingTime = Date.now() - startTime;

    return {
      decisions,
      totalCost,
      routingTime,
    };
  }

  /**
   * Get routing statistics for analysis
   */
  getRoutingStats(result: RoutingResult): {
    totalPlugins: number;
    alwaysRun: number;
    routed: number;
    skipped: number;
    avgChunksPerPlugin: number;
    routingTimeMs: number;
  } {
    let alwaysRun = 0;
    let routed = 0;
    let skipped = 0;
    let totalChunks = 0;

    for (const decision of result.decisions.values()) {
      switch (decision.reason) {
        case 'always-run':
          alwaysRun++;
          break;
        case 'routed':
          routed++;
          break;
        case 'skipped':
          skipped++;
          break;
      }
      totalChunks += decision.chunks.length;
    }

    return {
      totalPlugins: result.decisions.size,
      alwaysRun,
      routed,
      skipped,
      avgChunksPerPlugin: result.decisions.size > 0 
        ? Math.round(totalChunks / result.decisions.size) 
        : 0,
      routingTimeMs: result.routingTime,
    };
  }

  /**
   * Reset the router (clears cached chunk router)
   */
  reset(): void {
    this.chunkRouter = null;
  }
}