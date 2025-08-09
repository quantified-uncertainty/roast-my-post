/**
 * Tool Discovery System
 * Dynamically discovers available tools from their API routes
 * This replaces the need for redundant tool config paths
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'analysis' | 'research' | 'utility';
  costEstimate?: string;
  status: 'stable' | 'beta' | 'experimental';
  apiPath: string;      // Derived: /api/tools/{id}
  pagePath: string;     // Derived: /tools/{id}
}

/**
 * Discovers all available tools by scanning the API routes directory
 * and extracting metadata from the actual tool implementations
 */
export function discoverAvailableTools(): ToolMetadata[] {
  const toolsApiDir = join(process.cwd(), 'src/app/api/tools');
  
  if (!existsSync(toolsApiDir)) {
    console.warn('Tools API directory not found:', toolsApiDir);
    return [];
  }

  const toolDirs = readdirSync(toolsApiDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const tools: ToolMetadata[] = [];

  for (const toolId of toolDirs) {
    const routePath = join(toolsApiDir, toolId, 'route.ts');
    
    if (!existsSync(routePath)) {
      continue; // Skip directories without route.ts
    }

    try {
      // Import the actual tool to get its metadata
      const { toolRegistry } = require('@roast/ai');
      const tool = toolRegistry.get(toolId);
      
      if (!tool) {
        console.warn(`Tool ${toolId} not found in registry`);
        continue;
      }

      tools.push({
        id: toolId,
        name: tool.config.name,
        description: tool.config.description,
        version: tool.config.version,
        category: tool.config.category,
        costEstimate: tool.config.costEstimate,
        status: tool.config.status || 'experimental',
        apiPath: `/api/tools/${toolId}`,     // Derived from directory structure
        pagePath: `/tools/${toolId}`        // Derived from directory structure
      });

    } catch (error) {
      console.warn(`Failed to load metadata for tool ${toolId}:`, error);
    }
  }

  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get metadata for a specific tool
 */
export function getToolMetadata(toolId: string): ToolMetadata | null {
  const tools = discoverAvailableTools();
  return tools.find(tool => tool.id === toolId) || null;
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: 'analysis' | 'research' | 'utility'): ToolMetadata[] {
  return discoverAvailableTools().filter(tool => tool.category === category);
}