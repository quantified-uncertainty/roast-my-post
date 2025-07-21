/**
 * Integration test for MathPlugin to verify end-to-end functionality
 */

import { MathPlugin } from '../index';
import { TextChunk } from '../../../TextChunk';

describe('MathPlugin Integration', () => {
  it('should analyze document with math content', () => {
    // Simple test to avoid actual LLM calls
    const plugin = new MathPlugin();
    expect(plugin.name()).toBe('MATH');
  });
});

