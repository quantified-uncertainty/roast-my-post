#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

async function checkApiFields(): Promise<void> {
  try {
    console.log('Checking Kalshi API response structure...\n');

    // Try different parameter combinations
    const urls = [
      `${KALSHI_API_BASE}/markets?limit=5`,
      `${KALSHI_API_BASE}/markets?limit=5&status=active`,
    ];

    for (const url of urls) {
      console.log(`\nTesting: ${url}`);
      console.log('=' .repeat(80));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`Response has ${data.markets?.length || 0} markets`);
      
      if (data.markets && data.markets.length > 0) {
        const firstMarket = data.markets[0];
        console.log('\nFirst market structure:');
        console.log(JSON.stringify(firstMarket, null, 2));
        
        // Check for fields that might contain the full title
        console.log('\nTitle-related fields:');
        console.log(`  title: "${firstMarket.title}"`);
        console.log(`  subtitle: "${firstMarket.subtitle || 'null'}"`);
        console.log(`  yes_sub_title: "${firstMarket.yes_sub_title || 'null'}"`);
        console.log(`  no_sub_title: "${firstMarket.no_sub_title || 'null'}"`);
        
        // Check if there's a pattern with the titles
        console.log('\nAll titles in response:');
        data.markets.forEach((m: any, idx: number) => {
          console.log(`  ${idx + 1}. "${m.title}" (${m.ticker})`);
          if (m.yes_sub_title) {
            console.log(`     -> Answer: ${m.yes_sub_title}`);
          }
        });
      }
    }

    // Let's also check if there's a specific market endpoint
    console.log('\n\nChecking specific market endpoint...');
    const sampleTicker = 'KXELONJREGUEST-26JAN';
    const marketUrl = `${KALSHI_API_BASE}/markets/${sampleTicker}`;
    console.log(`Testing: ${marketUrl}`);
    
    const marketResponse = await fetch(marketUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (marketResponse.ok) {
      const marketData = await marketResponse.json();
      console.log('Single market response:');
      console.log(JSON.stringify(marketData, null, 2));
    } else {
      console.log(`Single market request failed: ${marketResponse.status}`);
    }

  } catch (error) {
    console.error('Error checking API:', error);
  }
}

// Run the script
checkApiFields();