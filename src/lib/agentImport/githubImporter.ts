import { z } from 'zod';
import { AgentConfigSchema, type AgentConfig, type GitHubFile } from './types';

/**
 * Imports agent configurations from GitHub repositories
 */
export class GitHubAgentImporter {
  private baseUrl: string;
  private owner: string;
  private repo: string;
  private branch: string = 'main';

  constructor(githubUrl: string) {
    const parsed = this.parseGitHubUrl(githubUrl);
    this.owner = parsed.owner;
    this.repo = parsed.repo;
    this.branch = parsed.branch || 'main';
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', ''),
      branch: match[3],
    };
  }

  async fetchRepositoryContents(): Promise<GitHubFile[]> {
    const url = `${this.baseUrl}/contents?ref=${this.branch}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Add GitHub token if available
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        })
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchFileContent(path: string): Promise<string> {
    const url = `${this.baseUrl}/contents/${path}?ref=${this.branch}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        })
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file ${path}: ${response.status}`);
    }

    const data = await response.json();
    
    // GitHub returns base64 encoded content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  }

  async findAgentConfigFile(files: GitHubFile[]): Promise<string | null> {
    // Look for common configuration file names
    const configPatterns = [
      'agent.yaml',
      'agent.yml',
      'agent.json',
      'agent.toml',
      '.roastmypost.yaml',
      '.roastmypost.yml',
      '.roastmypost.json',
      '.roastmypost.toml',
      'roastmypost.yaml',
      'roastmypost.yml',
      'roastmypost.json',
      'roastmypost.toml',
    ];

    for (const file of files) {
      if (file.type === 'file' && configPatterns.includes(file.name.toLowerCase())) {
        return file.path;
      }
    }

    return null;
  }

  async parseConfigFile(content: string, filename: string): Promise<AgentConfig> {
    let parsed: any;

    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      // Dynamic import for js-yaml
      const yaml = await import('js-yaml');
      parsed = yaml.load(content);
    } else if (filename.endsWith('.json')) {
      parsed = JSON.parse(content);
    } else if (filename.endsWith('.toml')) {
      // Would need to add toml package
      throw new Error('TOML parsing not yet implemented');
    } else {
      throw new Error('Unsupported configuration file format');
    }

    // Handle file references for instructions
    if (typeof parsed.primaryInstructions === 'string' && parsed.primaryInstructions.startsWith('./')) {
      const instructionPath = parsed.primaryInstructions.replace('./', '');
      parsed.primaryInstructions = await this.fetchFileContent(instructionPath);
    }

    if (parsed.selfCritiqueInstructions && 
        typeof parsed.selfCritiqueInstructions === 'string' && 
        parsed.selfCritiqueInstructions.startsWith('./')) {
      const instructionPath = parsed.selfCritiqueInstructions.replace('./', '');
      parsed.selfCritiqueInstructions = await this.fetchFileContent(instructionPath);
    }

    // Fetch README if exists
    try {
      parsed.readme = await this.fetchFileContent('README.md');
    } catch (error) {
      // No README.md found, which is fine
    }

    return AgentConfigSchema.parse(parsed);
  }

  async importAgent(): Promise<AgentConfig> {
    try {
      // Step 1: Fetch repository contents
      const files = await this.fetchRepositoryContents();

      // Step 2: Find agent configuration file
      const configPath = await this.findAgentConfigFile(files);
      if (!configPath) {
        throw new Error('No agent configuration file found in repository');
      }

      // Step 3: Fetch and parse configuration
      const configContent = await this.fetchFileContent(configPath);
      const agentConfig = await this.parseConfigFile(configContent, configPath);

      return agentConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Agent configuration validation failed: ${validationErrors}`);
      }
      throw error;
    }
  }
}