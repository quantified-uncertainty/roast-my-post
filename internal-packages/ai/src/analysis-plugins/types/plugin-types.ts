/**
 * Plugin type enum for selecting which plugins to use
 */
export enum PluginType {
  MATH = 'math',
  SPELLING = 'spelling',
  FACT_CHECK = 'fact-check',
  FORECAST = 'forecast',
  LINK_ANALYSIS = 'link-analysis',
  EPISTEMIC_CRITIC = 'epistemic-critic',
}

/**
 * Plugin configuration options
 */
export interface PluginSelection {
  /**
   * Which plugins to include. If not specified, uses defaults.
   */
  include?: PluginType[];
  
  /**
   * Which plugins to exclude from defaults. Ignored if 'include' is specified.
   */
  exclude?: PluginType[];
}