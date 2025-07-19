#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

async function debugTitles(): Promise<void> {
  try {
    console.log('Fetching first 200 markets to debug titles...\n');

    const response = await fetch(`${KALSHI_API_BASE}/markets?limit=200`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }

    const data = await response.json();
    const markets = data.markets || [];
    
    console.log(`Fetched ${markets.length} markets\n`);
    
    // Check title patterns
    const titlePatterns = {
      complete: [],
      withDoubleSpaces: [],
      tooShort: [],
      missingSubject: [],
      other: []
    };
    
    markets.forEach((market: any, idx: number) => {
      const title = market.title;
      
      if (title.includes('  ')) {
        titlePatterns.withDoubleSpaces.push(title);
      } else if (title.length < 20) {
        titlePatterns.tooShort.push(title);
      } else if (
        title.match(/Who will\s+sign/) ||
        title.match(/Will\s+be/) ||
        title.match(/defeat\s+in/)
      ) {
        titlePatterns.missingSubject.push(title);
      } else {
        titlePatterns.complete.push(title);
      }
    });
    
    console.log('Title Analysis:');
    console.log(`Complete titles: ${titlePatterns.complete.length}`);
    console.log(`With double spaces: ${titlePatterns.withDoubleSpaces.length}`);
    console.log(`Too short (<20 chars): ${titlePatterns.tooShort.length}`);
    console.log(`Missing subject: ${titlePatterns.missingSubject.length}`);
    
    console.log('\nExamples of "invalid" titles:');
    
    if (titlePatterns.withDoubleSpaces.length > 0) {
      console.log('\nDouble spaces:');
      titlePatterns.withDoubleSpaces.slice(0, 5).forEach(t => {
        console.log(`  "${t}" (length: ${t.length})`);
      });
    }
    
    if (titlePatterns.tooShort.length > 0) {
      console.log('\nToo short:');
      titlePatterns.tooShort.slice(0, 5).forEach(t => {
        console.log(`  "${t}" (length: ${t.length})`);
      });
    }
    
    if (titlePatterns.missingSubject.length > 0) {
      console.log('\nMissing subject:');
      titlePatterns.missingSubject.slice(0, 5).forEach(t => {
        console.log(`  "${t}"`);
      });
    }
    
    console.log('\nExamples of valid titles:');
    titlePatterns.complete.slice(0, 10).forEach(t => {
      console.log(`  "${t}"`);
    });
    
    // Check if we need authentication
    console.log('\n\nChecking market details for patterns...');
    const sampleMarkets = markets.slice(0, 5);
    sampleMarkets.forEach((market: any) => {
      console.log(`\nMarket: ${market.ticker}`);
      console.log(`  Title: "${market.title}"`);
      console.log(`  Status: ${market.status}`);
      console.log(`  Has subtitle: ${!!market.subtitle}`);
      console.log(`  Has yes_sub_title: ${!!market.yes_sub_title}`);
    });

  } catch (error) {
    console.error('Error debugging titles:', error);
  }
}

// Run the script
debugTitles();