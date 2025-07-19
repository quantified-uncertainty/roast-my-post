#!/usr/bin/env tsx

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

async function fetchKalshiMarkets(): Promise<void> {
  try {
    console.log('Fetching markets from Kalshi...\n');

    const url = `${KALSHI_API_BASE}/markets`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);

    const responseText = await response.text();
    console.log(`Response body (first 500 chars): ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }

    try {
      const data = JSON.parse(responseText);
      console.log('\nParsed response:');
      console.log(`Number of markets: ${data.markets?.length || 0}`);
      
      if (data.markets && data.markets.length > 0) {
        console.log('\nFirst 5 markets:');
        data.markets.slice(0, 5).forEach((market: any, idx: number) => {
          console.log(`\n${idx + 1}. ${market.title || market.ticker}`);
          console.log(`   Status: ${market.status}`);
          console.log(`   Volume: ${market.volume || 'N/A'}`);
        });
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
    }

  } catch (error) {
    console.error('Error fetching Kalshi markets:', error);
  }
}

// Run the script
fetchKalshiMarkets();