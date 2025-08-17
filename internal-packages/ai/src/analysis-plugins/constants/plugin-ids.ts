/**
 * Plugin ID constants - centralized definition of all plugin identifiers
 * 
 * These constants should match what the plugins return from their name() method.
 * Using constants instead of magic strings prevents typos and makes refactoring easier.
 */

// Plugin ID constants that match the plugin.name() values
export const PLUGIN_IDS = {
  MATH: 'MATH',
  SPELLING: 'SPELLING', 
  FORECAST: 'FORECAST',
  LINK_ANALYSIS: 'LINK_ANALYSIS',
  FACT_CHECK: 'FACT_CHECK',
} as const;

// Type for plugin IDs - ensures only valid IDs can be used
export type PluginId = typeof PLUGIN_IDS[keyof typeof PLUGIN_IDS];

// Utility functions for working with plugin IDs
export const PluginIdUtils = {
  /**
   * Check if a string is a valid plugin ID
   */
  isValidPluginId(id: string): id is PluginId {
    return Object.values(PLUGIN_IDS).includes(id as PluginId);
  },

  /**
   * Get all valid plugin IDs
   */
  getAllPluginIds(): PluginId[] {
    return Object.values(PLUGIN_IDS);
  },

  /**
   * Convert PluginType enum to PluginId (for backward compatibility)
   */
  fromPluginType(pluginType: string): PluginId | null {
    // Map PluginType enum values to PLUGIN_IDS
    const mapping: Record<string, PluginId> = {
      'MATH': PLUGIN_IDS.MATH,
      'SPELLING': PLUGIN_IDS.SPELLING,
      'FORECAST': PLUGIN_IDS.FORECAST,
      'LINK_ANALYSIS': PLUGIN_IDS.LINK_ANALYSIS,
      'FACT_CHECK': PLUGIN_IDS.FACT_CHECK,
    };
    
    return mapping[pluginType] || null;
  },
} as const;

// Export individual constants for convenience
export const {
  MATH,
  SPELLING, 
  FORECAST,
  LINK_ANALYSIS,
  FACT_CHECK,
} = PLUGIN_IDS;