import { GitHubAgentImporter } from '../githubImporter';
import { AgentConfigSchema } from '../types';
import { verifyAgentConfig } from '../agentValidator';

// Mock fetch globally
global.fetch = jest.fn();

describe('GitHubAgentImporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseGitHubUrl', () => {
    it('should parse standard GitHub URLs', () => {
      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      expect(importer['owner']).toBe('user');
      expect(importer['repo']).toBe('repo');
      expect(importer['branch']).toBe('main');
    });

    it('should parse GitHub URLs with branch', () => {
      const importer = new GitHubAgentImporter('https://github.com/user/repo/tree/develop');
      expect(importer['owner']).toBe('user');
      expect(importer['repo']).toBe('repo');
      expect(importer['branch']).toBe('develop');
    });

    it('should handle .git suffix', () => {
      const importer = new GitHubAgentImporter('https://github.com/user/repo.git');
      expect(importer['repo']).toBe('repo');
    });

    it('should throw on invalid URLs', () => {
      expect(() => new GitHubAgentImporter('not-a-github-url')).toThrow('Invalid GitHub URL format');
    });
  });

  describe('fetchRepositoryContents', () => {
    it('should fetch repository contents successfully', async () => {
      const mockFiles = [
        { name: 'agent.yaml', path: 'agent.yaml', type: 'file' },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      });

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const files = await importer.fetchRepositoryContents();

      expect(files).toEqual(mockFiles);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents?ref=main',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      await expect(importer.fetchRepositoryContents()).rejects.toThrow('GitHub API error: 404 Not Found');
    });
  });

  describe('findAgentConfigFile', () => {
    it('should find agent.yaml', async () => {
      const files = [
        { name: 'agent.yaml', path: 'agent.yaml', type: 'file' as const },
        { name: 'README.md', path: 'README.md', type: 'file' as const },
      ];

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const configPath = await importer.findAgentConfigFile(files);

      expect(configPath).toBe('agent.yaml');
    });

    it('should find .roastmypost.yaml', async () => {
      const files = [
        { name: '.roastmypost.yaml', path: '.roastmypost.yaml', type: 'file' as const },
        { name: 'README.md', path: 'README.md', type: 'file' as const },
      ];

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const configPath = await importer.findAgentConfigFile(files);

      expect(configPath).toBe('.roastmypost.yaml');
    });

    it('should return null if no config file found', async () => {
      const files = [
        { name: 'README.md', path: 'README.md', type: 'file' as const },
        { name: 'src', path: 'src', type: 'dir' as const },
      ];

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const configPath = await importer.findAgentConfigFile(files);

      expect(configPath).toBeNull();
    });
  });

  describe('parseConfigFile', () => {
    it('should parse YAML configuration', async () => {
      const yamlContent = `
name: Test Agent
description: A test agent for unit testing
primaryInstructions: You are a helpful assistant.
selfCritiqueInstructions: Rate your response quality.
providesGrades: true
`;

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const config = await importer.parseConfigFile(yamlContent, 'agent.yaml');

      expect(config.name).toBe('Test Agent');
      expect(config.description).toBe('A test agent for unit testing');
      expect(config.primaryInstructions).toBe('You are a helpful assistant.');
      expect(config.providesGrades).toBe(true);
    });

    it('should parse JSON configuration', async () => {
      const jsonContent = JSON.stringify({
        name: 'Test Agent',
        description: 'A test agent for unit testing',
        primaryInstructions: 'You are a helpful assistant.',
        providesGrades: false,
      });

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const config = await importer.parseConfigFile(jsonContent, 'agent.json');

      expect(config.name).toBe('Test Agent');
      expect(config.providesGrades).toBe(false);
    });

    it('should handle file references for instructions', async () => {
      const yamlContent = `
name: Test Agent
description: A test agent for unit testing
primaryInstructions: ./instructions/primary.md
`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: Buffer.from('You are a helpful assistant from file.').toString('base64'),
        }),
      });

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      const config = await importer.parseConfigFile(yamlContent, 'agent.yaml');

      expect(config.primaryInstructions).toBe('You are a helpful assistant from file.');
    });

    it('should validate configuration with schema', async () => {
      const invalidYaml = `
name: X
description: Too short
primaryInstructions: ""
`;

      const importer = new GitHubAgentImporter('https://github.com/user/repo');
      await expect(importer.parseConfigFile(invalidYaml, 'agent.yaml')).rejects.toThrow();
    });
  });
});

describe('verifyAgentConfig', () => {
  it('should pass valid configuration', () => {
    const config = {
      name: 'Valid Agent',
      description: 'This is a valid agent with a proper description',
      primaryInstructions: 'You are a helpful assistant that provides detailed analysis of documents.',
      providesGrades: false,
      extendedCapabilityId: null,
    };

    const result = verifyAgentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail with short name', () => {
    const config = {
      name: 'AB',
      description: 'This is a valid agent with a proper description',
      primaryInstructions: 'You are a helpful assistant that provides detailed analysis.',
      providesGrades: false,
    };

    const result = verifyAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is too short (minimum 3 characters)');
  });

  it('should fail with short description', () => {
    const config = {
      name: 'Valid Agent',
      description: 'Too short',
      primaryInstructions: 'You are a helpful assistant that provides detailed analysis.',
      providesGrades: false,
    };

    const result = verifyAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Description is too short (minimum 30 characters)');
  });

  it('should warn about missing grading instructions', () => {
    const config = {
      name: 'Grading Agent',
      description: 'An agent that provides grades for documents',
      primaryInstructions: 'You are a helpful assistant that provides detailed analysis.',
      selfCritiqueInstructions: 'Review your analysis for quality.',
      providesGrades: true,
    };

    const result = verifyAgentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Agent provides grades but self-critique instructions don\'t mention scoring/grading');
  });

  it('should provide token estimation', () => {
    const config = {
      name: 'Test Agent',
      description: 'This is a test agent for token estimation',
      primaryInstructions: 'A'.repeat(1000), // 1000 characters
      providesGrades: false,
    };

    const result = verifyAgentConfig(config);
    expect(result.info).toContain('Estimated token usage: ~250 tokens');
  });
});