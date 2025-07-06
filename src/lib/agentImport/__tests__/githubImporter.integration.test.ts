/**
 * Integration tests for GitHub agent import functionality
 * These tests verify the import flow works correctly
 */

import * as fs from 'fs';
import * as path from 'path';
import { GitHubAgentImporter } from '../githubImporter';
import { verifyAgentConfig } from '../agentValidator';

describe('GitHub Agent Import Integration', () => {
  describe('Local file parsing', () => {
    it('should parse test YAML config correctly', async () => {
      const yaml = await import('js-yaml');
      const testConfigPath = path.join(__dirname, '../../../../scripts/test-agent-config.yaml');
      
      // Check if test file exists, if not create it
      if (!fs.existsSync(testConfigPath)) {
        const testContent = `name: "Test Academic Reviewer"
description: "A test agent for validating GitHub import functionality"
primaryInstructions: |
  You are an academic reviewer tasked with evaluating research papers.
  
  Focus on:
  1. Methodology rigor
  2. Statistical validity
  3. Literature review completeness
  4. Clarity of presentation
  
  Provide specific, actionable feedback.
selfCritiqueInstructions: |
  Before finalizing your review, consider:
  - Have I been fair and objective?
  - Are my criticisms constructive?
  - Have I acknowledged the paper's strengths?
providesGrades: true
extendedCapabilityId: null`;
        fs.writeFileSync(testConfigPath, testContent);
      }
      
      const content = fs.readFileSync(testConfigPath, 'utf-8');
      const parsed = yaml.load(content) as any;

      expect(parsed.name).toBe('Test Academic Reviewer');
      expect(parsed.description).toBe('A test agent for validating GitHub import functionality');
      expect(parsed.providesGrades).toBe(true);
    });
  });

  describe('Mock GitHub import', () => {
    it('should successfully import and validate agent configuration', async () => {
      // Create a test class that overrides fetch behavior
      class TestGitHubImporter extends GitHubAgentImporter {
        override async fetchRepositoryContents() {
          return [
            { name: 'agent.yaml', path: 'agent.yaml', type: 'file' as const },
            { name: 'README.md', path: 'README.md', type: 'file' as const },
          ];
        }

        override async fetchFileContent(filePath: string) {
          if (filePath === 'agent.yaml') {
            return `name: "Test Academic Reviewer"
description: "A test agent for validating GitHub import functionality"
primaryInstructions: |
  You are an academic reviewer tasked with evaluating research papers.
  
  Focus on:
  1. Methodology rigor
  2. Statistical validity
  3. Literature review completeness
  4. Clarity of presentation
  
  Provide specific, actionable feedback.
selfCritiqueInstructions: |
  Before finalizing your review, consider:
  - Have I been fair and objective?
  - Are my criticisms constructive?
  - Have I acknowledged the paper's strengths?
providesGrades: true`;
          }
          
          if (filePath === 'README.md') {
            return `# Test Academic Reviewer

## Overview
This agent provides comprehensive academic paper reviews with a focus on methodology, statistics, and clarity.

## Features
- Detailed methodology assessment
- Statistical validity checks
- Literature review evaluation
- Clear, actionable feedback

## Usage
Submit research papers for thorough academic review and constructive criticism.`;
          }
          
          throw new Error(`File not found: ${filePath}`);
        }
      }

      const importer = new TestGitHubImporter('https://github.com/test/agent-repo');
      const agentConfig = await importer.importAgent();
      
      expect(agentConfig.name).toBe('Test Academic Reviewer');
      expect(agentConfig.description).toBe('A test agent for validating GitHub import functionality');
      expect(agentConfig.providesGrades).toBe(true);
      expect(agentConfig.readme).toContain('Test Academic Reviewer');

      // Verify the configuration
      const verification = verifyAgentConfig(agentConfig);
      expect(verification.valid).toBe(true);
      expect(verification.warnings).toContain('Agent provides grades but self-critique instructions don\'t mention scoring/grading');
    });
  });
});