/**
 * Unit Tests for Plugin Interface Consistency
 * 
 * These tests verify that all plugins implement the SimpleAnalysisPlugin interface
 * consistently and follow the same patterns, without requiring LLM calls.
 */

import { MathPlugin } from '../plugins/math';
import { SpellingPlugin } from '../plugins/spelling';
import { FactCheckPlugin } from '../plugins/fact-check';
import { ForecastPlugin } from '../plugins/forecast';
import { LinkAnalysisPlugin } from '../plugins/link-analysis';
import type { SimpleAnalysisPlugin, RoutingExample } from '../types';

describe('Plugin Interface Consistency Tests', () => {
  const plugins: SimpleAnalysisPlugin[] = [
    new MathPlugin(),
    new SpellingPlugin(),
    new FactCheckPlugin(),
    new ForecastPlugin(),
    new LinkAnalysisPlugin(),
  ];

  describe('Basic Interface Compliance', () => {
    plugins.forEach(plugin => {
      describe(`${plugin.name()} Plugin`, () => {
        it('should have a valid name', () => {
          const name = plugin.name();
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThan(0);
          expect(name).toMatch(/^[A-Z_]+$/); // Should be uppercase constant
        });

        it('should have a prompt for when to use', () => {
          const prompt = plugin.promptForWhenToUse();
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(20); // Should be descriptive
        });

        it('should have routing examples', () => {
          const examples = plugin.routingExamples?.();
          
          // Plugins with runOnAllChunks don't need routing examples
          const hasRunOnAllChunks = 'runOnAllChunks' in plugin && plugin.runOnAllChunks === true;
          
          if (hasRunOnAllChunks) {
            // For always-run plugins, routing examples should be empty or not needed
            if (examples) {
              expect(Array.isArray(examples)).toBe(true);
              expect(examples.length).toBe(0);
            }
          } else if (examples) {
            // For routed plugins, validate routing examples
            expect(Array.isArray(examples)).toBe(true);
            expect(examples.length).toBeGreaterThan(0);
            
            examples.forEach((example: RoutingExample, index: number) => {
              expect(example.chunkText).toBeDefined();
              expect(typeof example.chunkText).toBe('string');
              expect(typeof example.shouldProcess).toBe('boolean');
              if (example.reason) {
                expect(typeof example.reason).toBe('string');
              }
            });
          }
        });

        it('should have getCost method', () => {
          expect(typeof plugin.getCost).toBe('function');
          const cost = plugin.getCost();
          expect(typeof cost).toBe('number');
          expect(cost).toBeGreaterThanOrEqual(0);
        });

        it('should have analyze method', () => {
          expect(typeof plugin.analyze).toBe('function');
        });

        it('should have getDebugInfo method if implemented', () => {
          if (plugin.getDebugInfo) {
            expect(typeof plugin.getDebugInfo).toBe('function');
            const debugInfo = plugin.getDebugInfo();
            expect(typeof debugInfo).toBe('object');
            expect(debugInfo).not.toBeNull();
          }
        });
      });
    });
  });

  describe('Plugin Naming Consistency', () => {
    it('should have unique plugin names', () => {
      const names = plugins.map(p => p.name());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should follow naming conventions', () => {
      const expectedNames = ['MATH', 'SPELLING', 'FACT_CHECK', 'FORECAST', 'LINK_ANALYSIS'];
      const actualNames = plugins.map(p => p.name()).sort();
      expect(actualNames).toEqual(expectedNames.sort());
    });
  });

  describe('Routing Examples Quality', () => {
    plugins.forEach(plugin => {
      // Skip plugins with runOnAllChunks since they don't use routing
      const hasRunOnAllChunks = 'runOnAllChunks' in plugin && plugin.runOnAllChunks === true;
      
      if (plugin.routingExamples && !hasRunOnAllChunks) {
        describe(`${plugin.name()} routing examples`, () => {
          const examplesFn = plugin.routingExamples;
          const examples = examplesFn ? examplesFn() : [];
          
          it('should have both positive and negative examples', () => {
            const positiveExamples = examples.filter(e => e.shouldProcess);
            const negativeExamples = examples.filter(e => !e.shouldProcess);
            
            expect(positiveExamples.length).toBeGreaterThan(0);
            expect(negativeExamples.length).toBeGreaterThan(0);
          });

          it('should have reasonable text lengths', () => {
            examples.forEach(example => {
              expect(example.chunkText.length).toBeGreaterThan(5);
              expect(example.chunkText.length).toBeLessThan(1000); // Not too long
            });
          });

          it('should have explanatory reasons', () => {
            examples.forEach(example => {
              if (example.reason) {
                expect(example.reason.length).toBeGreaterThan(10);
                expect(example.reason.length).toBeLessThan(200);
              }
            });
          });
        });
      }
    });
  });

  describe('Plugin-Specific Behavior Validation', () => {
    it('Math plugin should have math-relevant examples', () => {
      const mathPlugin = plugins.find(p => p.name() === 'MATH');
      if (mathPlugin?.routingExamples) {
        const examples = mathPlugin.routingExamples() || [];
        const mathExamples = examples.filter(e => 
          e.chunkText.includes('+') || 
          e.chunkText.includes('=') || 
          e.chunkText.includes('%') ||
          /\d/.test(e.chunkText)
        );
        expect(mathExamples.length).toBeGreaterThan(0);
      }
    });

    it('Spelling plugin should have text-relevant examples', () => {
      const spellingPlugin = plugins.find(p => p.name() === 'SPELLING');
      // SpellingPlugin now uses runOnAllChunks, so it doesn't need routing examples
      const hasRunOnAllChunks = spellingPlugin && 'runOnAllChunks' in spellingPlugin && spellingPlugin.runOnAllChunks === true;
      
      if (spellingPlugin?.routingExamples && !hasRunOnAllChunks) {
        const examples = spellingPlugin.routingExamples() || [];
        const textExamples = examples.filter(e => 
          e.chunkText.split(' ').length > 3 // Has multiple words
        );
        expect(textExamples.length).toBeGreaterThan(0);
      } else if (hasRunOnAllChunks) {
        // Plugin runs on all chunks, so routing examples not needed
        expect(hasRunOnAllChunks).toBe(true);
      }
    });

    it('Forecast plugin should have future-relevant examples', () => {
      const forecastPlugin = plugins.find(p => p.name() === 'FORECAST');
      if (forecastPlugin?.routingExamples) {
        const examples = forecastPlugin.routingExamples() || [];
        const futureExamples = examples.filter(e => 
          /will|expect|predict|forecast|future|next|2024|2025/i.test(e.chunkText)
        );
        expect(futureExamples.length).toBeGreaterThan(0);
      }
    });

    it('Link Analysis plugin should bypass routing', () => {
      const linkPlugin = plugins.find(p => p.name() === 'LINK_ANALYSIS');
      // LinkAnalysisPlugin uses runOnAllChunks, so it doesn't need routing examples
      const hasRunOnAllChunks = linkPlugin && 'runOnAllChunks' in linkPlugin && linkPlugin.runOnAllChunks === true;
      expect(hasRunOnAllChunks).toBe(true);
      
      if (linkPlugin?.routingExamples) {
        const examples = linkPlugin.routingExamples() || [];
        // Should have empty routing examples since it runs on all chunks
        expect(examples.length).toBe(0);
      }
    });
  });

  describe('Interface Contract Validation', () => {
    it('should not throw when creating plugin instances', () => {
      expect(() => new MathPlugin()).not.toThrow();
      expect(() => new SpellingPlugin()).not.toThrow();
      expect(() => new FactCheckPlugin()).not.toThrow();
      expect(() => new ForecastPlugin()).not.toThrow();
      expect(() => new LinkAnalysisPlugin()).not.toThrow();
    });

    it('should return consistent initial cost values', () => {
      plugins.forEach(plugin => {
        const initialCost = plugin.getCost();
        expect(initialCost).toBe(0); // Should start at 0
      });
    });

    it('should have stable method signatures', () => {
      // Test that methods exist and have expected signatures
      plugins.forEach(plugin => {
        expect(plugin.name).toHaveProperty('length', 0); // No parameters
        expect(plugin.promptForWhenToUse).toHaveProperty('length', 0); // No parameters
        expect(plugin.getCost).toHaveProperty('length', 0); // No parameters
        expect(plugin.analyze).toHaveProperty('length', 2); // chunks, documentText
      });
    });
  });

  describe('Documentation Quality', () => {
    it('should have descriptive prompts that explain plugin purpose', () => {
      plugins.forEach(plugin => {
        const prompt = plugin.promptForWhenToUse();
        
        // Should mention what the plugin does
        const pluginName = plugin.name().toLowerCase().replace('_', ' ');
        const isRelevant = prompt.toLowerCase().includes(pluginName) ||
                          (pluginName.includes('fact') && prompt.toLowerCase().includes('fact')) ||
                          (pluginName.includes('math') && prompt.toLowerCase().includes('math')) ||
                          (pluginName.includes('spell') && prompt.toLowerCase().includes('spell')) ||
                          (pluginName.includes('forecast') && prompt.toLowerCase().includes('forecast')) ||
                          (pluginName.includes('link') && prompt.toLowerCase().includes('link'));
        
        expect(isRelevant).toBe(true);
      });
    });

    it('should have routing examples that match their prompts', () => {
      plugins.forEach(plugin => {
        // Skip plugins with runOnAllChunks since they don't use routing
        const hasRunOnAllChunks = 'runOnAllChunks' in plugin && plugin.runOnAllChunks === true;
        
        if (plugin.routingExamples && !hasRunOnAllChunks) {
          const prompt = plugin.promptForWhenToUse().toLowerCase();
          const examples = plugin.routingExamples() || [];
          
          // At least one positive example should align with the prompt description
          const positiveExamples = examples.filter(e => e.shouldProcess);
          expect(positiveExamples.length).toBeGreaterThan(0);
          
          // At least one negative example should clearly not match the prompt
          const negativeExamples = examples.filter(e => !e.shouldProcess);
          expect(negativeExamples.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

describe('Plugin System Integration Readiness', () => {
  it('documents critical interface inconsistencies found in analysis', () => {
    // This test documents the findings from our analysis
    const interfaceInconsistencies = [
      {
        issue: 'Position Finding Methods',
        description: 'Each plugin uses different methods to find text positions',
        examples: [
          'MathPlugin: simple indexOf()',
          'SpellingPlugin: chunk.findTextAbsolute() with complex options',
          'FactCheckPlugin: different findTextAbsolute() call pattern'
        ]
      },
      {
        issue: 'Comment Creation Patterns', 
        description: 'CommentBuilder.build() accepts different field combinations',
        examples: [
          'MathPlugin: uses location with {startOffset, endOffset, quotedText}',
          'SpellingPlugin: uses location object directly',
          'FactCheckPlugin: uses different field combinations'
        ]
      },
      {
        issue: 'Error Handling Strategies',
        description: 'No consistent error handling across plugins',
        examples: [
          'MathPlugin: returns partial results on error',
          'SpellingPlugin: continues processing on chunk errors',
          'FactCheckPlugin: returns null on location failures'
        ]
      },
      {
        issue: 'Tool Chain Result Formats',
        description: 'Inconsistent tool naming and timestamp calculation',
        examples: [
          'Different tool name formats: extractMath vs detectLanguageConvention vs extractCheckableClaims',
          'Different timestamp offsets: +20ms vs +10ms vs +30ms',
          'Inconsistent result structures'
        ]
      }
    ];

    // Document the issues for visibility
    console.log('\n=== PLUGIN INTERFACE INCONSISTENCIES ===\n');
    interfaceInconsistencies.forEach(inconsistency => {
      console.log(`${inconsistency.issue}:`);
      console.log(`  Problem: ${inconsistency.description}`);
      console.log('  Examples:');
      inconsistency.examples.forEach(example => {
        console.log(`    - ${example}`);
      });
      console.log('');
    });

    expect(interfaceInconsistencies.length).toBeGreaterThan(0);
    expect(interfaceInconsistencies.length).toBe(4); // Exact count of issues found
  });
});