#!/usr/bin/env npx tsx

/**
 * Detailed test to understand uFuzzy behavior with multi-word searches
 */

import uFuzzy from '@leeoniya/ufuzzy';

async function testUFuzzyDetails() {
  console.log('Testing uFuzzy behavior with multi-word searches...\n');

  const document = 'The quick brown fox jumps over the lazy dog.';
  const searches = [
    'browm fox',      // typo in first word
    'brown fax',      // typo in second word
    'bron fox',       // missing letter
    'algorithm efficiently', // correct spelling
    'algoritm eficiently',   // multiple typos
  ];

  for (const searchText of searches) {
    console.log(`\nSearching for: "${searchText}"`);
    console.log('Document:', document);
    
    const uf = new uFuzzy({
      intraMode: 1,
      interLft: 2,
      interRgt: 2,
      intraSub: 1,
      intraTrn: 1,
      intraDel: 1,
      intraIns: 1,
    });
    
    const haystack = [document];
    const idxs = uf.filter(haystack, searchText);
    
    console.log('Filter result (idxs):', idxs);
    
    if (idxs && idxs.length > 0) {
      const info = uf.info(idxs, haystack, searchText);
      console.log('Info result:', JSON.stringify(info, null, 2));
      
      if (info.ranges && info.ranges[0]) {
        console.log('Ranges for first match:', info.ranges[0]);
        
        // Show what each range captures
        for (let i = 0; i < info.ranges[0].length; i += 2) {
          const start = info.ranges[0][i];
          const end = info.ranges[0][i + 1];
          const text = document.slice(start, end);
          console.log(`  Range ${i/2}: [${start}, ${end}] = "${text}"`);
        }
      }
    } else {
      console.log('No match found');
    }
  }
}

// Run the test
testUFuzzyDetails().catch(console.error);