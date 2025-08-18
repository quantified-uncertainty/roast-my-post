import { documentChunkerTool } from './index';
import { DocumentChunkerInput } from './index';

describe('DocumentChunkerTool - First Heading Bug', () => {
  const mockContext = {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      child: vi.fn().mockReturnThis(),
      isDevelopment: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include the first heading when document starts with a heading', async () => {
    const input: DocumentChunkerInput = {
      text: `# The Impact of Machine Learning on Climate Prediction Models

## Abstract

Climate prediction has undergone significant transformation.`,
      targetWords: 1000,
    };

    const result = await documentChunkerTool.execute(input, mockContext);
    
    // First chunk should start at character 0
    expect(result.chunks[0].startOffset).toBe(0);
    
    // First chunk should include the main title
    expect(result.chunks[0].text).toContain('# The Impact of Machine Learning');
    
    // Verify no content is lost
    const fullText = result.chunks.map(c => c.text).join('');
    expect(fullText).toBe(input.text);
  });

  it('should handle documents that start with content before first heading', async () => {
    const input: DocumentChunkerInput = {
      text: `Some introductory text before any heading.

# Main Title

Content after title.`,
      targetWords: 1000,
    };

    const result = await documentChunkerTool.execute(input, mockContext);
    
    // First chunk should start at 0
    expect(result.chunks[0].startOffset).toBe(0);
    
    // Should include pre-heading content
    expect(result.chunks[0].text).toContain('Some introductory text');
    
    // Should also include the heading
    expect(result.chunks[0].text).toContain('# Main Title');
  });

  it('should calculate correct offsets for all scenarios', async () => {
    const testCases = [
      {
        name: 'starts with heading',
        text: '# Title\n\nContent',
      },
      {
        name: 'starts with content',
        text: 'Content\n\n# Title',
      },
      {
        name: 'starts with empty lines',
        text: '\n\n# Title\n\nContent',
      },
      {
        name: 'multiple headings',
        text: '# Title 1\n\n## Title 2\n\nContent',
      },
    ];

    for (const testCase of testCases) {
      const input: DocumentChunkerInput = {
        text: testCase.text,
        targetWords: 1000,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // First chunk must start at 0
      expect(result.chunks[0].startOffset).toBe(0);
      
      // All content must be preserved
      const fullText = result.chunks.map(c => c.text).join('');
      expect(fullText).toBe(input.text);
      
      // Verify character count
      const totalChars = result.chunks.reduce((sum, chunk) => {
        return sum + (chunk.endOffset - chunk.startOffset);
      }, 0);
      expect(totalChars).toBe(testCase.text.length);
    }
  });
});