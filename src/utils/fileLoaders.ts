import fs from 'fs';
import path from 'path';
import type { EvaluationAgent } from '../types/evaluationAgents';

// Load JSON5 file
// This is a simplified version that uses JSON.parse instead of json5.parse
// In a production environment, you should install the json5 package
export const loadJson5 = (filePath: string) => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Remove JSON5 comments (single-line comments)
    const contentWithoutComments = fileContent
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('//');
        return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      })
      .join('\n');
    
    // Parse using standard JSON parser
    // In production, use: import json5 from 'json5'; return json5.parse(fileContent);
    return JSON.parse(contentWithoutComments);
  } catch (error) {
    console.error(`Error loading JSON5 file ${filePath}:`, error);
    throw error;
  }
};

// Load an agent from a JSON5 file and return it as an EvaluationAgent
export const loadAgentFromJson5 = (filePath: string): EvaluationAgent => {
  const data = loadJson5(filePath);
  return data as EvaluationAgent;
};

// Get all JSON5 files from a directory
export const getAgentFilesFromDirectory = (directoryPath: string): string[] => {
  try {
    const files = fs.readdirSync(directoryPath);
    return files
      .filter(file => file.endsWith('.json5'))
      .map(file => path.join(directoryPath, file));
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
    return [];
  }
};