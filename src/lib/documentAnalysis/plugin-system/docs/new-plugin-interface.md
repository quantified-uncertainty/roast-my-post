# New Plugin Interface Design

## Core Principle
Each method transforms findings from one stage to the next, storing results internally.

## Proposed Interface

```typescript
interface AnalysisPlugin<TState = any> {
  // Identity
  name(): string;
  promptForWhenToUse(): string;
  routingExamples?(): RoutingExample[];
  
  // Stage 1: Extract potential findings from chunk
  // Reads: chunk
  // Writes: internal potential findings array
  extractPotentialFindings(chunk: TextChunk): Promise<void>;
  
  // Stage 2: Investigate findings (add severity, messages, analysis)
  // Reads: internal potential findings
  // Writes: internal investigated findings array
  investigateFindings(): Promise<void>;
  
  // Stage 3: Locate findings in document
  // Reads: internal investigated findings
  // Writes: internal located findings array
  locateFindings(documentText: string): Promise<void>;
  
  // Stage 4: Generate analysis summary
  // Reads: all internal findings arrays
  // Writes: nothing (returns summary)
  analyzeFindingPatterns(): Promise<SynthesisResult>;
  
  // Final output: Convert located findings to comments
  // Reads: internal located findings
  // Returns: Comment array for UI
  getComments(): Comment[];
  
  // State management
  getState(): TState;
  clearState(): void;
}
```

## Example Implementation Pattern

```typescript
class MathPlugin extends BasePlugin<{}> {
  private findings: FindingStorage = {
    potential: [],      // Stage 1 output
    investigated: [],   // Stage 2 output  
    located: [],        // Stage 3 output
    errors: []
  };

  async extractPotentialFindings(chunk: TextChunk): Promise<void> {
    // Extract math expressions
    const { result } = await this.extractWithTool(...);
    
    // Save as potential findings
    result.items.forEach(item => {
      if (!item.isCorrect) {
        this.findings.potential.push({
          id: generateId(),
          type: 'math_error',
          data: { equation: item.equation, error: item.error },
          highlightHint: { searchText: item.equation, chunkId: chunk.id }
        });
      }
    });
  }

  async investigateFindings(): Promise<void> {
    // Add severity and messages to findings
    this.findings.potential
      .filter(f => f.type === 'math_error')
      .forEach(finding => {
        this.findings.investigated.push({
          ...finding,
          severity: 'medium',
          message: `Math error in "${finding.data.equation}": ${finding.data.error}`
        });
      });
  }

  async locateFindings(documentText: string): Promise<void> {
    // Find exact positions in document
    this.findings.investigated.forEach(finding => {
      const location = findMathLocation(finding.highlightHint.searchText, documentText);
      
      if (location) {
        this.findings.located.push({
          ...finding,
          locationHint: {
            lineNumber: getLineNumber(documentText, location.startOffset),
            lineText: getLineText(documentText, location.startOffset),
            matchText: location.quotedText
          }
        });
      }
    });
  }

  async analyzeFindingPatterns(): Promise<SynthesisResult> {
    const errorRate = this.findings.potential.filter(f => f.type === 'math_error').length / 
                      this.findings.potential.length;
    
    return {
      summary: `Found ${this.findings.potential.length} expressions, ${errorRate * 100}% errors`,
      analysisSummary: this.buildMarkdownAnalysis(),
      recommendations: []
    };
  }

  getComments(): Comment[] {
    return this.findings.located.map(finding => ({
      description: finding.message,
      importance: severityToImportance(finding.severity),
      highlight: finding.locationHint,
      isValid: true
    }));
  }
}
```

## Benefits

1. **Clear progression**: Each method has one responsibility
2. **Testable**: Can test each stage independently
3. **Flexible**: Plugins can skip stages if not needed
4. **Debuggable**: Can inspect state after each stage
5. **No hidden behavior**: Clear what each method reads/writes

## Migration Path

For backwards compatibility, we could:
1. Keep old method names as aliases
2. Have default implementations that call the new methods
3. Gradually migrate plugins to new interface