import { describe, it, expect } from 'vitest';
import { parseAndExpandYaml, parseYamlContent, expandClaims } from '../yaml-parser';

describe('YAML Parser', () => {
  describe('parseYamlContent', () => {
    it('should parse valid YAML with claims only', () => {
      const yaml = `
claims:
  - claim: "Test claim"
    runs: 1
`;
      const result = parseYamlContent(yaml);
      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].claim).toBe('Test claim');
      expect(result.claims[0].runs).toBe(1);
    });

    it('should parse YAML with variables', () => {
      const yaml = `
variables:
  my_var: "test value"
  my_number: 42

claims:
  - claim: "Test"
`;
      const result = parseYamlContent(yaml);
      expect(result.variables).toEqual({
        my_var: 'test value',
        my_number: 42,
      });
    });

    it('should parse YAML with templates', () => {
      const yaml = `
templates:
  my_template:
    context: "test context"
    runs: 2

claims:
  - claim: "Test"
`;
      const result = parseYamlContent(yaml);
      expect(result.templates?.my_template).toEqual({
        context: 'test context',
        runs: 2,
      });
    });

    it('should throw on invalid YAML syntax', () => {
      const yaml = `
claims:
  - claim: "Test"
    invalid: [unclosed array
`;
      expect(() => parseYamlContent(yaml)).toThrow('Invalid YAML syntax');
    });

    it('should throw on missing claims array', () => {
      const yaml = `
variables:
  test: "value"
`;
      expect(() => parseYamlContent(yaml)).toThrow('Invalid YAML structure');
    });
  });

  describe('expandClaims - Variable Substitution', () => {
    it('should substitute string variables', () => {
      const bulkRequest = {
        variables: { my_context: 'Test context' },
        claims: [{ claim: 'Test', context: '{{my_context}}' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].context).toBe('Test context');
    });

    it('should substitute array variables', () => {
      const bulkRequest = {
        variables: { my_tags: ['tag1', 'tag2'] },
        claims: [{ claim: 'Test', tags: '{{my_tags}}' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('should substitute number variables', () => {
      const bulkRequest = {
        variables: { my_runs: 3 },
        claims: [{ claim: 'Test', runs: '{{my_runs}}' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].runs).toBe(3);
    });

    it('should handle inline string substitution', () => {
      const bulkRequest = {
        variables: { year: '2025', topic: 'healthcare' },
        claims: [{ claim: 'Test', context: 'In {{year}} {{topic}}' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].context).toBe('In 2025 healthcare');
    });

    it('should throw on undefined variable reference', () => {
      const bulkRequest = {
        variables: { defined_var: 'value' },
        claims: [{ claim: 'Test', context: '{{undefined_var}}' }],
      };

      expect(() => expandClaims(bulkRequest)).toThrow(
        'Variable {{undefined_var}} not found'
      );
    });

    it('should throw on inline substitution of array variable', () => {
      const bulkRequest = {
        variables: { my_array: ['a', 'b'] },
        claims: [{ claim: 'Test', context: 'Prefix {{my_array}}' }],
      };

      expect(() => expandClaims(bulkRequest)).toThrow(
        'Cannot substitute complex variable {{my_array}} inline'
      );
    });
  });

  describe('expandClaims - Templates', () => {
    it('should apply template to claim', () => {
      const bulkRequest = {
        templates: {
          my_template: {
            context: 'template context',
            runs: 2,
            temperature: 0.5,
          },
        },
        claims: [{ claim: 'Test', template: 'my_template' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0]).toMatchObject({
        claim: 'Test',
        context: 'template context',
        runs: 2,
        temperature: 0.5,
      });
    });

    it('should allow claim to override template fields', () => {
      const bulkRequest = {
        templates: {
          my_template: {
            context: 'template context',
            runs: 2,
          },
        },
        claims: [{ claim: 'Test', template: 'my_template', runs: 5 }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].runs).toBe(5); // Override
      expect(result[0].context).toBe('template context'); // From template
    });

    it('should throw on undefined template reference', () => {
      const bulkRequest = {
        templates: { defined_template: { context: 'test' } },
        claims: [{ claim: 'Test', template: 'undefined_template' }],
      };

      expect(() => expandClaims(bulkRequest)).toThrow(
        'Template "undefined_template" not found'
      );
    });

    it('should substitute variables in template', () => {
      const bulkRequest = {
        variables: { my_context: 'var context' },
        templates: {
          my_template: {
            context: '{{my_context}}',
            runs: 2,
          },
        },
        claims: [{ claim: 'Test', template: 'my_template' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].context).toBe('var context');
    });
  });

  describe('expandClaims - variationOf', () => {
    it('should preserve numeric variationOf', () => {
      const bulkRequest = {
        claims: [
          { claim: 'Parent' },
          { claim: 'Child', variationOf: 0 },
        ],
      };

      const result = expandClaims(bulkRequest);
      expect(result[1].variationOf).toBe(0);
    });

    it('should preserve string variationOf', () => {
      const bulkRequest = {
        claims: [{ claim: 'Child', variationOf: 'parent-id-123' }],
      };

      const result = expandClaims(bulkRequest);
      expect(result[0].variationOf).toBe('parent-id-123');
    });
  });

  describe('parseAndExpandYaml - Integration', () => {
    it('should handle complete YAML with variables, templates, and claims', () => {
      const yaml = `
variables:
  shared_context: "2025 healthcare"
  common_tags: ["healthcare", "2025"]

templates:
  healthcare:
    context: "{{shared_context}}"
    tags: "{{common_tags}}"
    runs: 2

claims:
  - claim: "SSRIs work"
    template: healthcare

  - claim: "SSRIs work for mild depression"
    template: healthcare
    variationOf: 0
`;

      const result = parseAndExpandYaml(yaml);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        claim: 'SSRIs work',
        context: '2025 healthcare',
        tags: ['healthcare', '2025'],
        runs: 2,
      });
      expect(result[1]).toMatchObject({
        claim: 'SSRIs work for mild depression',
        context: '2025 healthcare',
        variationOf: 0,
      });
    });

    it('should handle claims without variables or templates', () => {
      const yaml = `
claims:
  - claim: "Simple claim"
    context: "Simple context"
    runs: 1
`;

      const result = parseAndExpandYaml(yaml);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        claim: 'Simple claim',
        context: 'Simple context',
        runs: 1,
      });
    });

    it('should validate expanded claims', () => {
      const yaml = `
claims:
  - claim: ""  # Empty claim should fail validation
`;

      expect(() => parseAndExpandYaml(yaml)).toThrow();
    });

    it('should handle complex array variables', () => {
      const yaml = `
variables:
  models:
    - "anthropic/claude-sonnet-4.5"
    - "openai/gpt-5-mini"

claims:
  - claim: "Test"
    models: "{{models}}"
`;

      const result = parseAndExpandYaml(yaml);
      expect(result[0].models).toEqual([
        'anthropic/claude-sonnet-4.5',
        'openai/gpt-5-mini',
      ]);
    });
  });
});
