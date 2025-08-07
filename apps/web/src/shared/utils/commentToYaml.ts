import type { Comment } from "@roast/ai";

/**
 * Convert a comment object to YAML format
 */
export function commentToYaml(comment: Comment, agentName: string): string {
  const yamlLines: string[] = ['comment:'];
  
  // Basic fields
  if (comment.header) {
    yamlLines.push(`  header: "${comment.header.replace(/"/g, '\\"')}"`);
  }
  
  if (comment.description) {
    // Handle multiline descriptions
    const descriptionLines = comment.description.split('\n');
    if (descriptionLines.length === 1) {
      yamlLines.push(`  description: "${comment.description.replace(/"/g, '\\"')}"`);
    } else {
      yamlLines.push('  description: |');
      descriptionLines.forEach(line => {
        yamlLines.push(`    ${line}`);
      });
    }
  }
  
  // Metadata
  yamlLines.push(`  agent: "${agentName}"`);
  
  if (comment.level) {
    yamlLines.push(`  level: ${comment.level}`);
  }
  
  if (comment.source) {
    yamlLines.push(`  source: "${comment.source}"`);
  }
  
  if (comment.grade !== undefined) {
    yamlLines.push(`  grade: ${comment.grade}`);
  }
  
  if (comment.importance !== undefined) {
    yamlLines.push(`  importance: ${comment.importance}`);
  }
  
  // Highlight information
  if (comment.highlight) {
    yamlLines.push('  highlight:');
    
    if (comment.highlight.startOffset !== undefined) {
      yamlLines.push(`    startOffset: ${comment.highlight.startOffset}`);
    }
    
    if (comment.highlight.endOffset !== undefined) {
      yamlLines.push(`    endOffset: ${comment.highlight.endOffset}`);
    }
    
    if (comment.highlight.quotedText) {
      const quotedLines = comment.highlight.quotedText.split('\n');
      if (quotedLines.length === 1) {
        yamlLines.push(`    quotedText: "${comment.highlight.quotedText.replace(/"/g, '\\"')}"`);
      } else {
        yamlLines.push('    quotedText: |');
        quotedLines.forEach(line => {
          yamlLines.push(`      ${line}`);
        });
      }
    }
  }
  
  // Additional metadata if present
  if (comment.metadata && Object.keys(comment.metadata).length > 0) {
    yamlLines.push('  metadata:');
    Object.entries(comment.metadata).forEach(([key, value]) => {
      if (typeof value === 'string') {
        yamlLines.push(`    ${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        yamlLines.push(`    ${key}: ${JSON.stringify(value)}`);
      }
    });
  }
  
  return yamlLines.join('\n');
}