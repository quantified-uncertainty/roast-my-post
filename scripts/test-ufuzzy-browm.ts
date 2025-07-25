#!/usr/bin/env npx tsx

/**
 * Test why "browm" doesn't match "brown"
 */

import uFuzzy from '@leeoniya/ufuzzy';

async function testBrowm() {
  console.log('Testing why "browm" doesn\'t match "brown"...\n');

  const tests = [
    { needle: 'brown', haystack: 'The quick brown fox' },
    { needle: 'browm', haystack: 'The quick brown fox' },
    { needle: 'brow', haystack: 'The quick brown fox' },
    { needle: 'bron', haystack: 'The quick brown fox' },
    { needle: 'brwn', haystack: 'The quick brown fox' },
  ];

  for (const test of tests) {
    console.log(`\nSearching for "${test.needle}" in "${test.haystack}"`);
    
    const uf = new uFuzzy({
      intraMode: 1,
      intraSub: 1,
      intraTrn: 1,
      intraDel: 1,
      intraIns: 1,
    });
    
    const haystack = [test.haystack];
    const idxs = uf.filter(haystack, test.needle);
    
    if (idxs && idxs.length > 0) {
      const info = uf.info(idxs, haystack, test.needle);
      const ranges = info.ranges[0];
      const matched = test.haystack.slice(ranges[0], ranges[1]);
      console.log(`✅ Found: "${matched}" at [${ranges[0]}, ${ranges[1]}]`);
    } else {
      console.log('❌ Not found');
      
      // Try with intraMode 0 (more permissive)
      const uf2 = new uFuzzy({
        intraMode: 0,
        intraIns: 5,
      });
      
      const idxs2 = uf2.filter(haystack, test.needle);
      if (idxs2 && idxs2.length > 0) {
        const info2 = uf2.info(idxs2, haystack, test.needle);
        const ranges2 = info2.ranges[0];
        const matched2 = test.haystack.slice(ranges2[0], ranges2[1]);
        console.log(`✅ Found with intraMode=0: "${matched2}" at [${ranges2[0]}, ${ranges2[1]}]`);
      }
    }
  }
  
  // Test specifically the transposition case
  console.log('\n\nTesting transposition specifically:');
  const uf = new uFuzzy({
    intraMode: 1,
    intraTrn: 1, // Should allow "nm" -> "wn"
  });
  
  const haystack = ['brown'];
  const needle = 'browm';
  const idxs = uf.filter(haystack, needle);
  console.log('Filter result:', idxs);
  
  if (!idxs || idxs.length === 0) {
    // Try character by character comparison
    console.log('\nCharacter comparison:');
    console.log('needle:', needle.split('').join(' '));
    console.log('target:', 'brown'.split('').join(' '));
    console.log('b=b ✓, r=r ✓, o=o ✓, w≠n ✗, m≠w ✗');
    console.log('\nThis requires TWO edits (substitution of w->n and m->w), but intraMode=1 only allows ONE edit per term.');
  }
}

// Run the test
testBrowm().catch(console.error);