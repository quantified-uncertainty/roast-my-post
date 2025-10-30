import { describe, it, expect } from 'vitest';
import { toolRegistry as serverRegistry } from '@roast/ai/server';
import { allToolConfigs } from '@roast/ai';

describe('Server registry and frontend configs stay in sync', () => {
  it('IDs match exactly (no drift)', () => {
    const serverIds = new Set(serverRegistry.getMetadata().map(t => t.id));
    const clientIds = new Set(allToolConfigs.map(c => c.id));

    // Symmetric equality: both sets must match
    expect(serverIds).toEqual(clientIds);
  });
});


