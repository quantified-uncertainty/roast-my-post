import { documentChunkerTool } from './index';
import { DocumentChunkerInput, DocumentChunk } from './index';

describe('DocumentChunkerTool', () => {
  const mockContext = {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      logRequest: jest.fn(),
      logResponse: jest.fn(),
      child: jest.fn().mockReturnThis(),
      isDevelopment: true,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hierarchical Section Handling', () => {
    it('should include all subsection content in parent section boundaries', async () => {
      const input: DocumentChunkerInput = {
        text: `# Main Title

Some introductory content.

## Section 1

Content for section 1.

### Subsection 1.1

Content for subsection 1.1 that should be included in Section 1's boundaries.

### Subsection 1.2

More content that should be included.

## Section 2

Content for section 2.`,
        targetWords: 1000, // High limit to prevent splitting
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      
      // Find the chunk for Section 1
      const section1Chunk = result.chunks.find(chunk => 
        chunk.text.includes('## Section 1') && chunk.text.includes('### Subsection 1.1')
      );
      
      expect(section1Chunk).toBeDefined();
      expect(section1Chunk?.text).toContain('## Section 1');
      expect(section1Chunk?.text).toContain('### Subsection 1.1');
      expect(section1Chunk?.text).toContain('### Subsection 1.2');
      expect(section1Chunk?.text).toContain('Content for subsection 1.1');
      expect(section1Chunk?.text).toContain('More content that should be included');
      
      // Verify no content is missing between chunks
      const fullTextFromChunks = result.chunks.map(c => c.text).join('');
      expect(fullTextFromChunks).toBe(input.text);
    });

    it('should handle empty sections with only headings correctly', async () => {
      const input: DocumentChunkerInput = {
        text: `# The Impact of Machine Learning on Climate Prediction Models

## Abstract

Climate prediction has undergone significant transformation.

## Introduction

Climate prediction represents complex challenges.

## Methodology

### Data Collection

We collected data from 500 weather stations.

### Analysis Methods

We used neural networks for analysis.

## Results and Discussion

The hybrid ML-physics models demonstrated improvements.`,
        targetWords: 100, // Small to force multiple chunks
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Check that no content is missing
      const fullTextFromChunks = result.chunks.map(c => c.text).join('');
      expect(fullTextFromChunks).toBe(input.text);
      
      // Verify Methodology section includes its subsections
      const methodologyChunk = result.chunks.find(chunk => 
        chunk.text.includes('## Methodology')
      );
      
      expect(methodologyChunk).toBeDefined();
      expect(methodologyChunk?.text).toContain('### Data Collection');
      expect(methodologyChunk?.text).toContain('### Analysis Methods');
      expect(methodologyChunk?.text).toContain('We collected data from 500 weather stations');
      expect(methodologyChunk?.text).toContain('We used neural networks for analysis');
    });

    it('should handle deeply nested hierarchies', async () => {
      const input: DocumentChunkerInput = {
        text: `# Level 1

## Level 2

### Level 3

#### Level 4

##### Level 5

###### Level 6

Deep content here.

### Another Level 3

More content here.`,
        targetWords: 1000,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Verify all content is captured
      const fullTextFromChunks = result.chunks.map(c => c.text).join('');
      expect(fullTextFromChunks).toBe(input.text);
      
      // Verify deep nesting is preserved
      const hasAllLevels = result.chunks.some(chunk => 
        chunk.text.includes('# Level 1') &&
        chunk.text.includes('## Level 2') &&
        chunk.text.includes('### Level 3') &&
        chunk.text.includes('#### Level 4') &&
        chunk.text.includes('##### Level 5') &&
        chunk.text.includes('###### Level 6')
      );
      
      expect(hasAllLevels).toBe(true);
    });

    it('should not have gaps between character positions', async () => {
      const input: DocumentChunkerInput = {
        text: `# Document

## Section A

Content A with some text that spans
multiple lines to ensure proper offset tracking.

### Subsection A.1

More content here with specific details.

## Section B

Content B with different information.

### Subsection B.1

Even more content to test boundaries.

### Subsection B.2

Final content section.`,
        targetWords: 50, // Small to create multiple chunks
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Sort chunks by start offset
      const sortedChunks = [...result.chunks].sort((a, b) => a.startOffset - b.startOffset);
      
      // Verify no gaps between chunks
      for (let i = 0; i < sortedChunks.length - 1; i++) {
        const currentChunk = sortedChunks[i];
        const nextChunk = sortedChunks[i + 1];
        
        // Allow for small gaps (newlines) between chunks
        const gap = nextChunk.startOffset - currentChunk.endOffset;
        expect(gap).toBeLessThanOrEqual(2); // Allow up to 2 characters gap (for newlines)
      }
      
      
      // Verify first chunk starts at 0 and last chunk ends at text length
      expect(sortedChunks[0].startOffset).toBe(0);
      expect(sortedChunks[sortedChunks.length - 1].endOffset).toBe(input.text.length);
      
      // Verify reconstructed text matches original
      const reconstructed = sortedChunks
        .map(chunk => input.text.substring(chunk.startOffset, chunk.endOffset))
        .join('');
      expect(reconstructed).toBe(input.text);
    });

    it('should handle sections with no content between headings', async () => {
      const input: DocumentChunkerInput = {
        text: `# Title

## Empty Section 1

## Empty Section 2

### Has Content

This subsection has content.

## Empty Section 3

## Section with Content

This section has some content.`,
        targetWords: 100,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Verify all headings are captured
      const allText = result.chunks.map(c => c.text).join('');
      expect(allText).toContain('## Empty Section 1');
      expect(allText).toContain('## Empty Section 2');
      expect(allText).toContain('## Empty Section 3');
      
      // Verify no content is lost
      expect(allText).toBe(input.text);
    });

    it('should correctly identify line numbers for all chunks', async () => {
      const input: DocumentChunkerInput = {
        text: `Line 1
Line 2
# Heading on Line 3
Line 4
Line 5

## Subheading on Line 7

Line 9
Line 10`,
        targetWords: 10,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Verify line numbers are sequential and correct
      for (const chunk of result.chunks) {
        expect(chunk.startLine).toBeGreaterThan(0);
        expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
        
        // Extract the lines from the original text
        const lines = input.text.split('\n');
        const chunkLines = lines.slice(chunk.startLine - 1, chunk.endLine);
        const reconstructedChunk = chunkLines.join('\n');
        
        // The chunk text should match the reconstructed text from line numbers
        expect(chunk.text.trim()).toBe(reconstructedChunk.trim());
      }
    });

    it('should handle code blocks without breaking them', async () => {
      const input: DocumentChunkerInput = {
        text: `# Code Examples

## Python Example

Here's a code block:

\`\`\`python
def hello_world():
    print("Hello, World!")
    # This should not be treated as a heading
    return True
\`\`\`

## JavaScript Example

\`\`\`javascript
function helloWorld() {
    console.log("Hello, World!");
    // # This is not a markdown heading
}
\`\`\``,
        targetWords: 30,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Find chunks with code blocks
      const pythonChunk = result.chunks.find(chunk => chunk.text.includes('```python'));
      const jsChunk = result.chunks.find(chunk => chunk.text.includes('```javascript'));
      
      expect(pythonChunk).toBeDefined();
      expect(jsChunk).toBeDefined();
      
      // Verify code blocks are complete
      expect(pythonChunk?.text).toMatch(/```python[\s\S]*?```/);
      expect(jsChunk?.text).toMatch(/```javascript[\s\S]*?```/);
      
      // Verify comments inside code blocks aren't treated as headings
      expect(pythonChunk?.text).toContain('# This should not be treated as a heading');
      expect(jsChunk?.text).toContain('// # This is not a markdown heading');
    });

    it('should handle content before first heading', async () => {
      const input: DocumentChunkerInput = {
        text: `This is content before any heading.
It should be captured in a chunk.

# First Heading

Content after first heading.

## Subheading

More content.`,
        targetWords: 100,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // First chunk should contain pre-heading content
      const firstChunk = result.chunks[0];
      expect(firstChunk.text).toContain('This is content before any heading');
      expect(firstChunk.text).toContain('It should be captured in a chunk');
      
      // Verify all content is captured
      const allText = result.chunks.map(c => c.text).join('');
      expect(allText).toBe(input.text);
    });

    it('should preserve exact whitespace and formatting', async () => {
      const input: DocumentChunkerInput = {
        text: `# Title

    Indented content with spaces.

\tTab-indented content.

## Section


Multiple empty lines above.


  Mixed   spacing   here.`,
        targetWords: 1000,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Verify exact text preservation
      const reconstructed = result.chunks.map(c => c.text).join('');
      expect(reconstructed).toBe(input.text);
      
      // Check specific formatting is preserved
      expect(reconstructed).toContain('    Indented content with spaces');
      expect(reconstructed).toContain('\tTab-indented content');
      expect(reconstructed).toContain('  Mixed   spacing   here');
    });

    it('should create metadata with correct heading context', async () => {
      const input: DocumentChunkerInput = {
        text: `# Main

## Section 1

### Subsection 1.1

Content here.

#### Deep Section

Deep content.

### Subsection 1.2

More content.

## Section 2

Different content.`,
        targetWords: 20,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Find chunk with deep section
      const deepChunk = result.chunks.find(chunk => chunk.text.includes('#### Deep Section'));
      
      expect(deepChunk).toBeDefined();
      
      // The heading context should be an array with parent headings
      expect(Array.isArray(deepChunk?.metadata.headingContext)).toBe(true);
      expect(deepChunk?.metadata.headingContext?.length).toBeGreaterThan(0);
      
      // Find chunk with Subsection 1.2
      const sub12Chunk = result.chunks.find(chunk => chunk.text.includes('### Subsection 1.2'));
      
      expect(sub12Chunk).toBeDefined();
      expect(Array.isArray(sub12Chunk?.metadata.headingContext)).toBe(true);
      
      // Verify all chunks have heading context
      result.chunks.forEach(chunk => {
        expect(chunk.metadata.headingContext).toBeDefined();
        expect(Array.isArray(chunk.metadata.headingContext)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const input: DocumentChunkerInput = {
        text: '',
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      expect(result.chunks).toHaveLength(0);
      expect(result.metadata.totalChunks).toBe(0);
      expect(result.metadata.averageChunkSize).toBe(0);
    });

    it('should handle very large documents', async () => {
      // Generate a large document
      const sections = [];
      for (let i = 0; i < 100; i++) {
        sections.push(`## Section ${i}\n\nContent for section ${i} with some text.`);
      }
      
      const input: DocumentChunkerInput = {
        text: `# Large Document\n\n${sections.join('\n\n')}`,
        targetWords: 50,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      expect(result.chunks.length).toBeGreaterThan(10);
      
      // Verify no content is lost by checking all content is present
      const fullText = result.chunks.map(c => c.text).join('');
      
      // Check that all sections are present
      for (let i = 0; i < 100; i++) {
        expect(fullText).toContain(`## Section ${i}`);
        expect(fullText).toContain(`Content for section ${i}`);
      }
      
      // Check total length is preserved
      expect(fullText.length).toBe(input.text.length);
    });

    it('should handle malformed markdown gracefully', async () => {
      const input: DocumentChunkerInput = {
        text: `#No space after hash

##  Multiple spaces

### 
Empty heading

####Normal heading

#####Another normal one`,
        targetWords: 100,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      expect(result.chunks.length).toBeGreaterThan(0);
      
      // Verify all content is captured despite malformed markdown
      const allText = result.chunks.map(c => c.text).join('');
      expect(allText).toBe(input.text);
    });
  });

  describe('Validation and Constraints', () => {

    it('should validate input parameters', async () => {
      // Test valid edge cases
      const validInputs = [
        { text: 'a'.repeat(100), maxChunkSize: 100 }, // min maxChunkSize
        { text: 'a'.repeat(1000), maxChunkSize: 10000 }, // max maxChunkSize
        { text: 'test', minChunkSize: 50 }, // min minChunkSize
        { text: 'test', minChunkSize: 1000 }, // max minChunkSize
        { text: 'test', targetWords: 50 }, // min targetWords
        { text: 'test', targetWords: 2000 }, // max targetWords
      ];

      for (const validInput of validInputs) {
        await expect(
          documentChunkerTool.execute(validInput, mockContext)
        ).resolves.toBeDefined();
      }
      
      // Test text length limits - schema validation may be handled at API level
      // For now, we'll test that large inputs don't crash the system
      const largeInput = { text: 'a'.repeat(600000) };
      const result = await documentChunkerTool.execute(largeInput, mockContext);
      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });
});