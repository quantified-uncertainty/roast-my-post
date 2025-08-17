/**
 * Plugin Registry - Manages plugin registration and retrieval
 * 
 * Separated from PluginManager to have a single responsibility:
 * managing the available plugins and their metadata.
 */

import { SimpleAnalysisPlugin } from "../types";
import { PluginType } from "../types/plugin-types";
import { logger } from "../../shared/logger";

export interface PluginMetadata {
  type: PluginType;
  name: string;
  description: string;
  runOnAllChunks: boolean;
  constructor: new () => SimpleAnalysisPlugin;
}

/**
 * Central registry for all available plugins
 */
export class PluginRegistry {
  private plugins = new Map<PluginType, PluginMetadata>();

  /**
   * Register a plugin with its metadata
   */
  register(
    type: PluginType,
    PluginClass: new () => SimpleAnalysisPlugin,
    description?: string
  ): void {
    // Create a temporary instance to get metadata
    const instance = new PluginClass();
    
    const metadata: PluginMetadata = {
      type,
      name: instance.name(),
      description: description || instance.promptForWhenToUse(),
      runOnAllChunks: instance.runOnAllChunks || false,
      constructor: PluginClass,
    };

    this.plugins.set(type, metadata);
    logger.info(`Registered plugin: ${metadata.name} (${type})`);
  }

  /**
   * Get plugin metadata by type
   */
  get(type: PluginType): PluginMetadata | undefined {
    return this.plugins.get(type);
  }

  /**
   * Get plugin metadata by name
   */
  getByName(name: string): PluginMetadata | undefined {
    for (const metadata of this.plugins.values()) {
      if (metadata.name === name) {
        return metadata;
      }
    }
    return undefined;
  }

  /**
   * Get all registered plugins
   */
  getAll(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by selection criteria
   */
  getByTypes(types: PluginType[]): PluginMetadata[] {
    return types
      .map(type => this.plugins.get(type))
      .filter((p): p is PluginMetadata => p !== undefined);
  }

  /**
   * Check if a plugin type is registered
   */
  has(type: PluginType): boolean {
    return this.plugins.has(type);
  }

  /**
   * Get plugins that should run on all chunks
   */
  getAlwaysRunPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).filter(p => p.runOnAllChunks);
  }

  /**
   * Get plugins that need routing
   */
  getRoutedPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).filter(p => !p.runOnAllChunks);
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    alwaysRun: number;
    routed: number;
    byType: Record<string, number>;
  } {
    const all = this.getAll();
    const byType: Record<string, number> = {};
    
    for (const plugin of all) {
      byType[plugin.type] = (byType[plugin.type] || 0) + 1;
    }

    return {
      total: all.length,
      alwaysRun: all.filter(p => p.runOnAllChunks).length,
      routed: all.filter(p => !p.runOnAllChunks).length,
      byType,
    };
  }
}