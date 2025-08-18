import { documentChunkerTool } from './index';
import { DocumentChunkerInput } from './index';

describe('DocumentChunkerTool - Core Functionality', () => {
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

  describe('Critical Bug Fix: Hierarchical Sections', () => {
    it('should NOT create empty chunks for sections with subsections', async () => {
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
        targetWords: 100,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // No chunk should be nearly empty (like the old "3 words" bug)
      for (const chunk of result.chunks) {
        const wordCount = chunk.text.split(/\s+/).filter(w => w.length > 0).length;
        expect(wordCount).toBeGreaterThan(10); // Should have substantial content
      }
      
      // Verify Methodology section includes its subsections
      const methodologyChunk = result.chunks.find(chunk => 
        chunk.text.includes('## Methodology')
      );
      
      expect(methodologyChunk).toBeDefined();
      expect(methodologyChunk?.text).toContain('### Data Collection');
      expect(methodologyChunk?.text).toContain('We collected data from 500 weather stations');
    });

    it('should include ALL content from parent sections including subsections', async () => {
      const input: DocumentChunkerInput = {
        text: `# Document

## Section A

Content before subsections.

### Subsection A.1

Content in A.1

### Subsection A.2

Content in A.2

## Section B

Different content.`,
        targetWords: 1000, // High to keep sections together
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Find Section A chunk
      const sectionAChunk = result.chunks.find(chunk => 
        chunk.text.includes('## Section A')
      );
      
      expect(sectionAChunk).toBeDefined();
      // Should contain ALL subsection content
      expect(sectionAChunk?.text).toContain('### Subsection A.1');
      expect(sectionAChunk?.text).toContain('### Subsection A.2');
      expect(sectionAChunk?.text).toContain('Content in A.1');
      expect(sectionAChunk?.text).toContain('Content in A.2');
      expect(sectionAChunk?.text).toContain('Content before subsections');
    });

    it('should never lose content between chunks', async () => {
      const input: DocumentChunkerInput = {
        text: `# Title

## Section 1

Content 1

### Sub 1.1

Sub content 1

## Section 2

Content 2

### Sub 2.1

Sub content 2

### Sub 2.2

More sub content`,
        targetWords: 50, // Small to force splitting
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Reconstruct the full text from chunks
      const reconstructed = result.chunks.map(c => c.text).join('');
      
      // Should contain ALL original content
      expect(reconstructed).toContain('# Title');
      expect(reconstructed).toContain('## Section 1');
      expect(reconstructed).toContain('### Sub 1.1');
      expect(reconstructed).toContain('## Section 2');
      expect(reconstructed).toContain('### Sub 2.1');
      expect(reconstructed).toContain('### Sub 2.2');
      expect(reconstructed).toContain('Content 1');
      expect(reconstructed).toContain('Sub content 1');
      expect(reconstructed).toContain('Content 2');
      expect(reconstructed).toContain('Sub content 2');
      expect(reconstructed).toContain('More sub content');
      
      // Total length should be preserved
      expect(reconstructed.length).toBe(input.text.length);
    });

    it('should handle the exact failing case from the bug report', async () => {
      // This is the structure that was failing
      const input: DocumentChunkerInput = {
        text: `# The Impact of Machine Learning on Climate Prediction Models

## Abstract

Climate prediction has undergone significant transformation with the integration of machine learning algorithms. This study examines the effectiveness of neural networks, ensemble methods, and deep learning architectures in improving the accuracy of long-term climate forecasts. We analyzed temperature and precipitation data from 1950-2023 across 500 global weather stations, comparing traditional statistical models with modern ML approaches.

## Introduction

Climate prediction represents one of the most complex challenges in environmental science, requiring the integration of vast amounts of atmospheric, oceanic, and terrestrial data. Traditional climate models rely heavily on physical equations describing atmospheric dynamics, but these approaches often struggle with nonlinear interactions and chaotic behavior inherent in climate systems.

## Methodology

### Data Collection

We collected data from various sources including satellite observations, weather stations, and ocean buoys.

### Model Architecture

Our approach combines traditional physics-based models with neural network components.

## Results and Discussion

The hybrid ML-physics models demonstrated substantial improvements over baseline approaches.`,
        targetWords: 200,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Check that there's no massive character gap like 1773-3252
      const sortedChunks = [...result.chunks].sort((a, b) => a.startOffset - b.startOffset);
      
      for (let i = 0; i < sortedChunks.length - 1; i++) {
        const currentChunk = sortedChunks[i];
        const nextChunk = sortedChunks[i + 1];
        const gap = nextChunk.startOffset - currentChunk.endOffset;
        
        // Should not have huge gaps (allowing small gaps for newlines)
        expect(gap).toBeLessThan(10);
      }
      
      // Verify Methodology section is complete
      const methodologyChunk = result.chunks.find(chunk => 
        chunk.text.includes('## Methodology')
      );
      
      expect(methodologyChunk).toBeDefined();
      expect(methodologyChunk?.text.length).toBeGreaterThan(100); // Not just "## Methodology" (15 chars)
      expect(methodologyChunk?.text).toContain('### Data Collection');
      expect(methodologyChunk?.text).toContain('### Model Architecture');
    });

    it('should update parent section boundaries after building hierarchy', async () => {
      const input: DocumentChunkerInput = {
        text: `# Main

## Parent Section

Parent intro content.

### Child Section 1

Child 1 content that should be included in parent boundaries.

### Child Section 2

Child 2 content that should also be included.

## Another Parent

Different content.`,
        targetWords: 1000, // Keep together
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // The Parent Section chunk should span all the way to the end of Child Section 2
      const parentChunk = result.chunks.find(chunk => 
        chunk.text.includes('## Parent Section')
      );
      
      expect(parentChunk).toBeDefined();
      
      // Verify the chunk includes everything up to "## Another Parent"
      expect(parentChunk?.text).toContain('Parent intro content');
      expect(parentChunk?.text).toContain('### Child Section 1');
      expect(parentChunk?.text).toContain('Child 1 content');
      expect(parentChunk?.text).toContain('### Child Section 2');
      expect(parentChunk?.text).toContain('Child 2 content');
      // When targetWords is high, it might include everything in one chunk
      // The important thing is that parent boundaries include all children
    });
  });

  describe('Complete Content Coverage', () => {
    it('should ensure every single character appears in exactly one chunk', async () => {
      const testCases = [
        {
          name: 'simple document',
          text: 'Hello world',
        },
        {
          name: 'document with heading',
          text: '# Title\n\nContent here',
        },
        {
          name: 'complex document',
          text: `# Main Title

Some intro text.

## Section 1

Content for section 1.

### Subsection 1.1

Nested content.

## Section 2

Different content.

### Subsection 2.1

More nested content.

### Subsection 2.2

Even more content.

## Conclusion

Final thoughts.`,
        },
        {
          name: 'document with code blocks',
          text: `# Code Examples

\`\`\`python
def hello():
    print("Hello")
\`\`\`

## More Examples

\`\`\`javascript
console.log("World");
\`\`\``,
        },
      ];

      for (const testCase of testCases) {
        const input: DocumentChunkerInput = {
          text: testCase.text,
          targetWords: 50, // Small to force multiple chunks
        };

        const result = await documentChunkerTool.execute(input, mockContext);
        
        // Create a character tracking array
        const charCoverage = new Array(testCase.text.length).fill(false);
        
        // Mark which characters are covered by chunks
        for (const chunk of result.chunks) {
          for (let i = chunk.startOffset; i < chunk.endOffset; i++) {
            if (charCoverage[i]) {
              throw new Error(`Character at position ${i} appears in multiple chunks for test case: ${testCase.name}`);
            }
            charCoverage[i] = true;
          }
          
          // Verify chunk text matches the source text exactly
          const expectedText = testCase.text.substring(chunk.startOffset, chunk.endOffset);
          expect(chunk.text).toBe(expectedText);
        }
        
        // Check if any character was missed
        const uncoveredIndices = [];
        for (let i = 0; i < charCoverage.length; i++) {
          if (!charCoverage[i]) {
            uncoveredIndices.push(i);
          }
        }
        
        if (uncoveredIndices.length > 0) {
          const missedChars = uncoveredIndices.map(i => ({
            index: i,
            char: testCase.text[i],
            context: testCase.text.substring(Math.max(0, i - 10), Math.min(testCase.text.length, i + 10))
          }));
          
          console.error('Missed characters:', missedChars);
          throw new Error(`${uncoveredIndices.length} characters were not included in any chunk for test case: ${testCase.name}`);
        }
        
        // Additional verification: reconstruct the document
        const sortedChunks = [...result.chunks].sort((a, b) => a.startOffset - b.startOffset);
        const reconstructed = sortedChunks.map(c => c.text).join('');
        expect(reconstructed).toBe(testCase.text);
      }
    });

    it('should never have overlapping chunks', async () => {
      const input: DocumentChunkerInput = {
        text: `# Document

## Section A

Lots of content here to ensure multiple chunks.
${Array(50).fill('More content. ').join('')}

### Subsection A.1

${Array(50).fill('Even more content. ').join('')}

## Section B

${Array(50).fill('Different content. ').join('')}`,
        targetWords: 50,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Sort chunks by start offset
      const sortedChunks = [...result.chunks].sort((a, b) => a.startOffset - b.startOffset);
      
      // Check for overlaps
      for (let i = 0; i < sortedChunks.length - 1; i++) {
        const currentChunk = sortedChunks[i];
        const nextChunk = sortedChunks[i + 1];
        
        if (currentChunk.endOffset > nextChunk.startOffset) {
          throw new Error(
            `Chunks ${i} and ${i + 1} overlap: ` +
            `chunk ${i} ends at ${currentChunk.endOffset}, ` +
            `chunk ${i + 1} starts at ${nextChunk.startOffset}`
          );
        }
      }
    });
  });

  describe('Edge Cases that Should Work', () => {
    it('should handle empty sections correctly', async () => {
      const input: DocumentChunkerInput = {
        text: `# Doc

## Empty 1

## Empty 2

### Has Content

This has content.

## Empty 3`,
        targetWords: 100,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      const allText = result.chunks.map(c => c.text).join('');
      expect(allText).toBe(input.text);
      
      // Empty sections should still appear in chunks
      expect(allText).toContain('## Empty 1');
      expect(allText).toContain('## Empty 2');
      expect(allText).toContain('## Empty 3');
    });

    it('should preserve code blocks', async () => {
      const input: DocumentChunkerInput = {
        text: `# Code Doc

## Example

Here's code:

\`\`\`python
def test():
    # This is not a heading
    return True
\`\`\`

More text.`,
        targetWords: 50,
      };

      const result = await documentChunkerTool.execute(input, mockContext);
      
      // Code block should be intact
      const codeChunk = result.chunks.find(chunk => chunk.text.includes('```python'));
      expect(codeChunk).toBeDefined();
      expect(codeChunk?.text).toContain('# This is not a heading');
      expect(codeChunk?.text).toMatch(/```python[\s\S]*?```/);
    });
  });
});