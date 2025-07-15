/**
 * Implementation of RoutingPlan
 */

import { RoutingPlan as IRoutingPlan } from './types';

export class RoutingPlan implements IRoutingPlan {
  decisions: Map<string, string[]> = new Map();

  addRouting(chunkId: string, plugins: string[]): void {
    this.decisions.set(chunkId, plugins);
  }

  getPluginsForChunk(chunkId: string): string[] {
    return this.decisions.get(chunkId) || [];
  }

  getAllChunks(): string[] {
    return Array.from(this.decisions.keys());
  }

  getStats(): {
    totalChunks: number;
    totalRoutings: number;
    pluginUsage: Map<string, number>;
  } {
    const pluginUsage = new Map<string, number>();
    let totalRoutings = 0;

    const values = Array.from(this.decisions.values());
    for (const plugins of values) {
      totalRoutings += plugins.length;
      for (const plugin of plugins) {
        pluginUsage.set(plugin, (pluginUsage.get(plugin) || 0) + 1);
      }
    }

    return {
      totalChunks: this.decisions.size,
      totalRoutings,
      pluginUsage
    };
  }

  merge(other: RoutingPlan): void {
    for (const [chunkId, plugins] of Array.from(other.decisions.entries())) {
      this.decisions.set(chunkId, plugins);
    }
  }

  // Helper to create from array of decisions
  static fromDecisions(decisions: Array<{ chunkId: string; plugins: string[] }>): RoutingPlan {
    const plan = new RoutingPlan();
    for (const decision of decisions) {
      plan.addRouting(decision.chunkId, decision.plugins);
    }
    return plan;
  }
}