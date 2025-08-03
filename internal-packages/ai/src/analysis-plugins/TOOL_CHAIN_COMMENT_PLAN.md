# Tool Chain Comment Structure Plan

## Core Comment Structure

```typescript
export interface Comment {
  // Display fields (extracted from tool results)
  header: string;
  description: string;
  level: 'error' | 'warning' | 'info' | 'success';
  source: string;
  importance: number;
  isValid: boolean;
  
  // Location
  highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix?: string;
    error?: string;
  };
  
  // Structured semantic fields (optional, extracted from tools)
  title?: string;
  observation?: string;
  significance?: string;
  grade?: number;
  
  // Complete tool chain data
  metadata: {
    // Base processing metadata
    pluginName: string;
    pluginVersion: string;
    timestamp: string;
    chunkId: string;
    processingTimeMs: number;
    
    // Complete tool results in order of execution
    toolChain: Array<{
      toolName: string;
      stage: 'extraction' | 'verification' | 'enhancement' | 'generation';
      timestamp: string;
      result: any;  // Complete, unmodified tool output
    }>;
    
    // Computed summary fields for quick access
    confidence?: number;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    primaryFinding?: string;
    verified?: boolean;
  };
}
```

## Plugin-Specific Implementations

### 1. Spelling Plugin

```typescript
// Example: Spelling error detection
{
  header: "their → there",
  description: "Misspelling: 'their' should be 'there'",
  level: 'error',
  source: 'spelling',
  importance: 6,
  isValid: true,
  
  highlight: {
    startOffset: 142,
    endOffset: 147,
    quotedText: "their",
    isValid: true
  },
  
  metadata: {
    pluginName: 'spelling',
    pluginVersion: '1.0.0',
    timestamp: '2024-01-01T12:00:00Z',
    chunkId: 'chunk-123',
    processingTimeMs: 45,
    
    toolChain: [
      {
        toolName: 'detectLanguageConvention',
        stage: 'extraction',
        timestamp: '2024-01-01T12:00:00.010Z',
        result: {
          convention: 'US',
          consistency: 0.92,
          examples: [
            { word: 'organize', count: 3 },
            { word: 'color', count: 2 }
          ]
        }
      },
      {
        toolName: 'checkSpellingGrammar',
        stage: 'verification',
        timestamp: '2024-01-01T12:00:00.040Z',
        result: {
          type: 'spelling',
          text: 'their',
          correction: 'there',
          conciseCorrection: 'their → there',
          importance: 75,
          confidence: 95,
          context: 'I went to their house yesterday',
          lineNumber: 42,
          columnNumber: 11,
          description: 'Common homophone confusion',
          rule: 'CONFUSION_RULE',
          category: 'TYPOS'
        }
      }
    ],
    
    // Quick access computed fields
    confidence: 95,
    severity: 'medium',
    primaryFinding: 'their → there',
    errorType: 'spelling',
    languageConvention: 'US'
  }
}
```

### 2. Math Plugin

```typescript
// Example: Math error with verification
{
  header: "Math error: 2 + 2 = 5",
  description: "Arithmetic error: 2 + 2 should equal 4, not 5",
  level: 'error',
  source: 'math',
  importance: 8,
  isValid: true,
  
  highlight: {
    startOffset: 256,
    endOffset: 267,
    quotedText: "2 + 2 = 5",
    isValid: true
  },
  
  metadata: {
    pluginName: 'math',
    pluginVersion: '1.0.0',
    timestamp: '2024-01-01T12:00:00Z',
    chunkId: 'chunk-456',
    processingTimeMs: 120,
    
    toolChain: [
      {
        toolName: 'extractMath',
        stage: 'extraction',
        timestamp: '2024-01-01T12:00:00.020Z',
        result: {
          originalText: '2 + 2 = 5',
          cleanedText: '2 + 2 = 5',
          hasEquality: true,
          leftSide: '2 + 2',
          rightSide: '5',
          mathType: 'arithmetic',
          complexityScore: 20,
          contextImportanceScore: 85,
          context: 'The fundamental principle shows that 2 + 2 = 5',
          requiresVerification: true,
          metadata: {
            lineNumber: 15,
            surroundingText: '...principle shows that 2 + 2 = 5, which proves...'
          }
        }
      },
      {
        toolName: 'checkMathWithMathJS',
        stage: 'verification',
        timestamp: '2024-01-01T12:00:00.050Z',
        result: {
          isValid: false,
          error: 'Calculation mismatch',
          expected: '4',
          actual: '5',
          leftSideValue: 4,
          rightSideValue: 5,
          discrepancy: 1,
          confidence: 100
        }
      },
      {
        toolName: 'checkMathWithLLM',
        stage: 'enhancement',
        timestamp: '2024-01-01T12:00:00.100Z',
        result: {
          hasError: true,
          errorType: 'calculation',
          severity: 'major',
          explanation: 'Basic arithmetic error: 2 + 2 equals 4, not 5',
          correction: '2 + 2 = 4',
          conciseCorrection: '5 → 4',
          confidence: 95,
          context: 'This appears to be a typo or fundamental misunderstanding',
          impact: 'Undermines mathematical credibility of the document'
        }
      }
    ],
    
    // Quick access fields
    confidence: 97.5,  // Average of mathjs (100) and LLM (95)
    severity: 'high',
    primaryFinding: '2 + 2 = 5 (should be 4)',
    verified: true,
    verificationMethod: 'hybrid',
    errorType: 'calculation'
  }
}
```

### 3. Forecast Plugin

```typescript
// Example: Forecast analysis with probability assessment
{
  header: "Low-quality forecast: AI will achieve AGI by 2025",
  description: "Forecast lacks precision and verifiability",
  level: 'warning',
  source: 'forecast',
  importance: 7,
  isValid: true,
  
  highlight: {
    startOffset: 512,
    endOffset: 548,
    quotedText: "AI will achieve AGI by 2025",
    isValid: true
  },
  
  metadata: {
    pluginName: 'forecast',
    pluginVersion: '1.0.0',
    timestamp: '2024-01-01T12:00:00Z',
    chunkId: 'chunk-789',
    processingTimeMs: 250,
    
    toolChain: [
      {
        toolName: 'extractForecastingClaims',
        stage: 'extraction',
        timestamp: '2024-01-01T12:00:00.030Z',
        result: {
          originalText: 'AI will achieve AGI by 2025',
          rewrittenPredictionText: 'Artificial General Intelligence (AGI) will be achieved by December 31, 2025',
          importanceScore: 9,
          precisionScore: 3,
          verifiabilityScore: 4,
          robustnessScore: 2,
          resolutionDate: '2025-12-31',
          topic: 'AGI timeline',
          authorProbability: null,  // No explicit probability given
          metadata: {
            hasDate: true,
            dateFormat: 'year',
            isConditional: false,
            confidence: 85
          }
        }
      },
      {
        toolName: 'generateProbabilityForecast',
        stage: 'verification',
        timestamp: '2024-01-01T12:00:00.200Z',
        result: {
          probability: 15,
          confidence: 'medium',
          reasoning: 'Current AI progress suggests AGI by 2025 is unlikely. Major technical challenges remain unsolved.',
          consensus: 'Most experts predict AGI timeline of 10-50 years',
          alternativeTimeline: '2035-2045',
          keyUncertainties: [
            'Definition of AGI remains contested',
            'Scaling laws may hit unexpected limits',
            'Safety considerations may slow deployment'
          ],
          sources: [
            'Expert surveys from 2023',
            'Current capability assessments'
          ]
        }
      }
    ],
    
    // Quick access fields
    confidence: 70,
    severity: 'medium',
    primaryFinding: 'Low-quality forecast lacking precision',
    forecastQuality: 3,  // Average of scores
    authorProbability: null,
    ourProbability: 15,
    disagreement: 'significant'
  }
}
```

### 4. Fact-Check Plugin

```typescript
// Example: False claim with research
{
  header: "False: The Earth is flat",
  description: "This claim is scientifically incorrect",
  level: 'error',
  source: 'fact-check',
  importance: 9,
  isValid: true,
  
  highlight: {
    startOffset: 892,
    endOffset: 910,
    quotedText: "The Earth is flat",
    isValid: true
  },
  
  metadata: {
    pluginName: 'fact-check',
    pluginVersion: '1.0.0',
    timestamp: '2024-01-01T12:00:00Z',
    chunkId: 'chunk-321',
    processingTimeMs: 3500,
    
    toolChain: [
      {
        toolName: 'extractCheckableClaims',
        stage: 'extraction',
        timestamp: '2024-01-01T12:00:00.040Z',
        result: {
          originalText: 'The Earth is flat',
          topic: 'Earth shape',
          claim: 'The Earth is flat',
          importanceScore: 95,
          checkabilityScore: 100,
          truthProbability: 5,
          category: 'scientific',
          explicitness: 'explicit',
          metadata: {
            hasEvidence: false,
            hasCitation: false,
            isOpinion: false,
            confidence: 100
          }
        }
      },
      {
        toolName: 'factCheckWithPerplexity',
        stage: 'verification',
        timestamp: '2024-01-01T12:00:00.500Z',
        result: {
          query: 'Is the Earth flat scientific evidence',
          perplexityResponse: {
            answer: 'The Earth is spherical, not flat. This has been proven through multiple lines of evidence...',
            sources: [
              'https://nasa.gov/earth-shape',
              'https://science.org/earth-spherical'
            ],
            confidence: 'very high'
          },
          searchResults: [
            {
              title: 'NASA: Earth is a sphere',
              snippet: 'Satellite imagery and physics prove Earth is spherical...',
              url: 'https://nasa.gov/earth-shape'
            }
          ]
        }
      },
      {
        toolName: 'verifyClaimWithLLM',
        stage: 'enhancement',
        timestamp: '2024-01-01T12:00:03.000Z',
        result: {
          verdict: 'false',
          confidence: 'high',
          explanation: 'The Earth is an oblate spheroid, not flat. This is proven by satellite imagery, physics, and direct observation.',
          corrections: 'The Earth is approximately spherical',
          conciseCorrection: 'flat → spherical',
          evidence: [
            'Satellite photographs from space',
            'Ships disappearing over horizon',
            'Different star visibility at different latitudes',
            'Gravity and physics models'
          ],
          sources: [
            'NASA Earth Observatory',
            'International Space Station imagery'
          ]
        }
      }
    ],
    
    // Quick access fields
    confidence: 95,
    severity: 'critical',
    primaryFinding: 'False claim about Earth shape',
    verified: true,
    verdict: 'false',
    wasResearched: true,
    researchMethod: 'perplexity',
    hasSources: true
  }
}
```

## Implementation Changes

### 1. Comment Builder Update

```typescript
export class CommentBuilder {
  static build(options: {
    plugin: string;
    location: DocumentLocation;
    chunkId: string;
    processingStartTime: number;
    
    // Tool chain results
    toolChain: Array<{
      toolName: string;
      stage: 'extraction' | 'verification' | 'enhancement' | 'generation';
      timestamp: string;
      result: any;
    }>;
    
    // Display fields (can be auto-generated from tool chain)
    header?: string;
    description?: string;
    level?: 'error' | 'warning' | 'info' | 'success';
    importance?: number;
    
    // Optional structured fields
    title?: string;
    observation?: string;
    significance?: string;
    grade?: number;
  }): Comment {
    const processingTimeMs = Date.now() - options.processingStartTime;
    
    // Auto-generate display fields from tool chain if not provided
    const displayFields = this.extractDisplayFields(options.toolChain, options);
    
    return {
      // Display fields
      header: options.header || displayFields.header,
      description: options.description || displayFields.description,
      level: options.level || displayFields.level,
      source: options.plugin,
      importance: options.importance || displayFields.importance,
      isValid: true,
      
      // Location
      highlight: {
        startOffset: options.location.startOffset ?? 0,
        endOffset: options.location.endOffset ?? 0,
        quotedText: options.location.quotedText ?? '',
        isValid: true,
        prefix: (options.location as any).prefix,
      },
      
      // Optional structured fields
      title: options.title,
      observation: options.observation,
      significance: options.significance,
      grade: options.grade,
      
      // Complete metadata
      metadata: {
        pluginName: options.plugin,
        pluginVersion: this.PLUGIN_VERSIONS[options.plugin] || '1.0.0',
        timestamp: new Date().toISOString(),
        chunkId: options.chunkId,
        processingTimeMs,
        toolChain: options.toolChain,
        
        // Quick access fields (computed from tool chain)
        ...this.computeQuickAccessFields(options.toolChain, options.plugin)
      }
    };
  }
  
  private static extractDisplayFields(toolChain: any[], options: any): any {
    // Plugin-specific logic to extract header/description/level from tool results
    // This keeps presentation logic centralized but uses tool data
    
    const plugin = options.plugin;
    const lastResult = toolChain[toolChain.length - 1]?.result;
    
    switch (plugin) {
      case 'spelling':
        const spellResult = toolChain.find(t => t.toolName === 'checkSpellingGrammar')?.result;
        return {
          header: spellResult?.conciseCorrection || `${spellResult?.text} → ${spellResult?.correction}`,
          description: spellResult?.description || 'Spelling/grammar error',
          level: 'error',
          importance: this.calculateImportance(spellResult?.importance, spellResult?.confidence)
        };
        
      case 'fact-check':
        const verifyResult = toolChain.find(t => t.stage === 'enhancement')?.result;
        return {
          header: `${verifyResult?.verdict === 'false' ? 'False' : verifyResult?.verdict}: ${toolChain[0]?.result?.topic}`,
          description: verifyResult?.explanation || 'Fact check result',
          level: verifyResult?.verdict === 'false' ? 'error' : 'warning',
          importance: this.calculateFactImportance(toolChain)
        };
        
      // ... other plugins
    }
  }
}
```

### 2. Plugin Updates

Each plugin would change from building formatted strings to just passing tool results:

```typescript
// Old approach (spelling plugin)
const message = generateSpellingComment(error);  // Formatted string with HTML

// New approach
return CommentBuilder.build({
  plugin: 'spelling',
  location,
  chunkId: chunk.id,
  processingStartTime: this.processingStartTime,
  
  toolChain: [
    {
      toolName: 'detectLanguageConvention',
      stage: 'extraction',
      timestamp: conventionDetectionTime,
      result: this.languageConvention  // Complete result
    },
    {
      toolName: 'checkSpellingGrammar',
      stage: 'verification', 
      timestamp: new Date().toISOString(),
      result: error  // Complete SpellingGrammarError object
    }
  ]
});
```

## Benefits

1. **Complete Data Preservation**: Every tool result is stored unmodified
2. **Full Traceability**: Can see exact sequence of analysis steps
3. **Debugging Power**: Can inspect any stage of the analysis
4. **Future Analytics**: All data available for new insights
5. **Tool Evolution**: Tools can add fields without breaking comments
6. **Flexible Display**: UI can use any data from any tool stage
7. **Research Enablement**: Can analyze tool performance across all comments