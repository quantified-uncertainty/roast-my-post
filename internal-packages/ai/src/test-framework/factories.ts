import type { TestDocument, TestScenario } from './types';
import type { AnalysisResult } from '../analysis-plugins/types';
import type { Comment } from '../shared/types';
import type { RichLLMInteraction } from '../types';
import { scenario } from './builders';

/**
 * Factories for creating common test objects
 */

export class DocumentFactory {
  static withSpellingErrors(): TestDocument {
    return {
      content: `This document contians spelling mistaks and grammer issues.
Their are many reasons why we should fix these erors.`,
      metadata: {
        expectedErrors: ['contians', 'mistaks', 'grammer', 'Their', 'erors']
      }
    };
  }

  static withMathErrors(): TestDocument {
    return {
      content: `Our revenue increased by 15%: from $1000 to $1200.
The total of 100 + 200 + 300 is 500.`,
      metadata: {
        expectedErrors: ['20% not 15%', '600 not 500']
      }
    };
  }

  static withFactErrors(): TestDocument {
    return {
      content: `The moon landing happened in 1971.
Einstein discovered DNA in 1955.`,
      metadata: {
        expectedErrors: ['1969 not 1971', 'Watson and Crick, not Einstein']
      }
    };
  }

  static withBrokenLinks(): TestDocument {
    return {
      content: `Check our docs at [https://broken.example.com/404](https://broken.example.com/404).
More info at [https://invalid-domain-xyz.com](https://invalid-domain-xyz.com).`,
      metadata: {
        expectedErrors: ['broken.example.com', 'invalid-domain-xyz.com']
      }
    };
  }

  static withForecasts(): TestDocument {
    return {
      content: `We predict 70% chance of success by Q2 2025.
There's a 90% probability that costs will decrease by 30% within 2 years.`,
      metadata: {
        expectedErrors: []
      }
    };
  }

  static clean(): TestDocument {
    return {
      content: `This document is well-written and contains no errors.
All facts are accurate and the grammar is correct.`,
      metadata: {
        expectedErrors: [],
        expectedGrade: { min: 90, max: 100 }
      }
    };
  }

  static custom(content: string, metadata?: TestDocument['metadata']): TestDocument {
    return { content, metadata };
  }
}

export class CommentFactory {
  static create(options: {
    text: string;
    description?: string;
    startOffset?: number;
    endOffset?: number;
    importance?: number;
  }): Comment {
    return {
      description: options.description || `Issue with "${options.text}"`,
      highlight: (options.startOffset !== undefined && options.endOffset !== undefined) ? {
        startOffset: options.startOffset,
        endOffset: options.endOffset,
        quotedText: options.text,
        isValid: true
      } : {
        startOffset: 0,
        endOffset: 0,
        quotedText: options.text,
        isValid: false
      },
      importance: options.importance
    };
  }

  static spellingError(text: string, correction: string, offset = 0): Comment {
    return this.create({
      text,
      description: `Spelling error: "${text}" should be "${correction}"`,
      startOffset: offset,
      endOffset: offset + text.length,
      importance: 30
    });
  }

  static grammarError(text: string, correction: string, offset = 0): Comment {
    return this.create({
      text,
      description: `Grammar error: "${text}" should be "${correction}"`,
      startOffset: offset,
      endOffset: offset + text.length,
      importance: 40
    });
  }

  static mathError(text: string, correction: string, offset = 0): Comment {
    return this.create({
      text,
      description: `Math error: ${text} should be ${correction}`,
      startOffset: offset,
      endOffset: offset + text.length,
      importance: 80
    });
  }

  static factError(text: string, correction: string, offset = 0): Comment {
    return this.create({
      text,
      description: `Factual error: "${text}" should be "${correction}"`,
      startOffset: offset,
      endOffset: offset + text.length,
      importance: 90
    });
  }
}

export class AnalysisResultFactory {
  static success(options: {
    comments?: Comment[];
    summary?: string;
    analysis?: string;
    grade?: number;
    cost?: number;
  } = {}): AnalysisResult {
    return {
      comments: options.comments || [],
      summary: options.summary || 'Analysis complete',
      analysis: options.analysis || '# Analysis\n\nNo issues found.',
      grade: options.grade,
      cost: options.cost || 0.001
    };
  }

  static withErrors(errorCount: number, type: 'spelling' | 'math' | 'fact' = 'spelling'): AnalysisResult {
    const comments: Comment[] = [];
    for (let i = 0; i < errorCount; i++) {
      switch (type) {
        case 'spelling':
          comments.push(CommentFactory.spellingError(`error${i}`, `correction${i}`, i * 10));
          break;
        case 'math':
          comments.push(CommentFactory.mathError(`calc${i}`, `fix${i}`, i * 10));
          break;
        case 'fact':
          comments.push(CommentFactory.factError(`fact${i}`, `truth${i}`, i * 10));
          break;
      }
    }

    return {
      comments,
      summary: `Found ${errorCount} ${type} errors`,
      analysis: `# Analysis\n\nDetected ${errorCount} ${type} errors in the document.`,
      grade: Math.max(0, 100 - errorCount * 10),
      cost: 0.01
    };
  }

  static noErrors(): AnalysisResult {
    return {
      comments: [],
      summary: 'No errors found',
      analysis: '# Analysis\n\nThe document is error-free.',
      grade: 100,
      cost: 0.005
    };
  }
}

export class LLMInteractionFactory {
  static create(options: Partial<RichLLMInteraction> = {}): RichLLMInteraction {
    return {
      model: options.model || 'claude-3-sonnet-20240229',
      prompt: options.prompt || 'Test prompt',
      response: options.response || 'Test response',
      tokensUsed: options.tokensUsed || {
        prompt: 100,
        completion: 50,
        total: 150
      },
      timestamp: options.timestamp || new Date(),
      duration: options.duration || 100
    };
  }

  static chain(count: number, baseOptions?: Partial<RichLLMInteraction>): RichLLMInteraction[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({
        ...baseOptions,
        prompt: `Prompt ${i + 1}`,
        response: `Response ${i + 1}`,
        duration: 100 + i * 50
      })
    );
  }
}

export class ScenarioFactory {
  static spellingScenarios(): TestScenario[] {
    return [
      scenario()
        .name('Detects spelling errors')
        .document(DocumentFactory.withSpellingErrors().content)
        .expectComments({ 
          count: { min: 3 }, 
          mustFind: ['contians', 'mistaks'],
          verifyHighlights: true 
        })
        .expectPerformance({ maxCost: 0.05 })
        .build(),
      
      scenario()
        .name('Clean document - no false positives')
        .document(DocumentFactory.clean().content)
        .expectComments({ count: { max: 2 } })
        .expectAnalysis({ minGrade: 90 })
        .build()
    ];
  }

  static mathScenarios(): TestScenario[] {
    return [
      scenario()
        .name('Detects calculation errors')
        .document(DocumentFactory.withMathErrors().content)
        .expectComments({ 
          count: { min: 2 },
          mustFind: ['600', '20%']
        })
        .expectAnalysis({ maxGrade: 70 })
        .build()
    ];
  }

  static allErrorTypes(): TestScenario[] {
    return [
      ...this.spellingScenarios(),
      ...this.mathScenarios(),
      // Add more as needed
    ];
  }
}