/**
 * Helper functions for working with findings
 */

import type { 
  PotentialFinding, 
  InvestigatedFinding, 
  LocatedFinding, 
  GlobalFinding,
  PluginError 
} from '../types';

/**
 * Generate a unique ID for findings
 */
export function generateFindingId(pluginName: string, type: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${pluginName}-${type}-${timestamp}-${random}`;
}

/**
 * Convert severity string to importance number (1-10)
 */
export function severityToImportance(severity: string): number {
  switch (severity) {
    case 'high': return 8;
    case 'medium': return 5;
    case 'low': return 3;
    case 'info': return 2;
    default: return 3;
  }
}

/**
 * Create a plugin error object
 */
export function createPluginError(
  phase: PluginError['phase'],
  error: any,
  context?: any
): PluginError {
  return {
    timestamp: new Date(),
    phase,
    error: error instanceof Error ? error.message : String(error),
    context
  };
}

/**
 * Convert potential findings to investigated findings
 * This is where plugins would add severity and messages
 */
export function investigateFindings(
  potentials: PotentialFinding[],
  investigator: (finding: PotentialFinding) => {
    severity: InvestigatedFinding['severity'];
    message: string;
  }
): InvestigatedFinding[] {
  return potentials.map(potential => {
    const { severity, message } = investigator(potential);
    return {
      id: potential.id,
      type: potential.type,
      data: potential.data,
      severity,
      message,
      highlightHint: potential.highlightHint
    };
  });
}

/**
 * Filter findings by severity
 */
export function filterBySeverity(
  findings: InvestigatedFinding[],
  minSeverity: 'info' | 'low' | 'medium' | 'high'
): InvestigatedFinding[] {
  const severityOrder = { info: 0, low: 1, medium: 2, high: 3 };
  const minLevel = severityOrder[minSeverity];
  
  return findings.filter(f => severityOrder[f.severity] >= minLevel);
}

/**
 * Group findings by type
 */
export function groupByType<T extends { type: string }>(
  findings: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  findings.forEach(finding => {
    if (!groups.has(finding.type)) {
      groups.set(finding.type, []);
    }
    groups.get(finding.type)!.push(finding);
  });
  
  return groups;
}

/**
 * Sort findings by importance (for comment generation)
 */
export function sortByImportance(
  findings: InvestigatedFinding[]
): InvestigatedFinding[] {
  return [...findings].sort((a, b) => {
    const aImportance = severityToImportance(a.severity);
    const bImportance = severityToImportance(b.severity);
    return bImportance - aImportance;
  });
}

/**
 * Create a debug summary of findings
 */
export function createFindingsSummary(state: {
  potential: PotentialFinding[];
  investigated: InvestigatedFinding[];
  located: LocatedFinding[];
  global: GlobalFinding[];
  errors: PluginError[];
}): any {
  return {
    counts: {
      potential: state.potential.length,
      investigated: state.investigated.length,
      located: state.located.length,
      global: state.global.length,
      errors: state.errors.length
    },
    byType: {
      potential: Array.from(groupByType(state.potential).entries()).map(([type, items]) => ({
        type,
        count: items.length
      })),
      investigated: Array.from(groupByType(state.investigated).entries()).map(([type, items]) => ({
        type,
        count: items.length
      }))
    },
    errorSummary: state.errors.map(e => ({
      phase: e.phase,
      error: e.error,
      timestamp: e.timestamp
    }))
  };
}