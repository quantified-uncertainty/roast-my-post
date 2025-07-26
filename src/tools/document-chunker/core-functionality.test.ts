import { documentChunkerTool } from './index';
import { DocumentChunkerInput } from './index';

describe('DocumentChunkerTool - Core Functionality', () => {
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