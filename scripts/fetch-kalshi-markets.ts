#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_API_KEY = process.env.KALSHI_API_KEY;

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  open_time: string;
  close_time: string;
  expected_expiration_time: string;
  status: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  market_type: string;
  volume?: number;
  dollar_volume?: number;
  open_interest?: number;
  liquidity?: number;
  yes?: number;
  no?: number;
  last_price?: number;
  yes_ask?: number;
  yes_bid?: number;
  previous_yes_ask?: number;
  previous_yes_bid?: number;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

async function fetchKalshiMarkets(): Promise<void> {
  try {
    console.log('Fetching popular markets from Kalshi...\n');

    // First, let's try without authentication (public endpoint)
    // Remove parameters that might be causing issues
    const url = `${KALSHI_API_BASE}/markets`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return;
    }

    const data = await response.json() as KalshiMarketsResponse;
    displayMarkets(data.markets);

  } catch (error) {
    console.error('Error fetching Kalshi markets:', error);
  }
}

function displayMarkets(markets: KalshiMarket[]): void {
  if (!markets || markets.length === 0) {
    console.log('No markets found');
    return;
  }

  // Filter out markets with no volume and sort by dollar_volume, then volume
  const activeMarkets = markets.filter(m => (m.dollar_volume || m.volume || 0) > 0);
  
  const sortedMarkets = [...activeMarkets].sort((a, b) => {
    const aVolume = a.dollar_volume || a.volume || 0;
    const bVolume = b.dollar_volume || b.volume || 0;
    return bVolume - aVolume;
  });

  // Get top 10 markets
  const top10Markets = sortedMarkets.slice(0, 10);
  
  if (top10Markets.length === 0) {
    console.log('No markets with trading volume found. Showing most recent markets instead:\n');
    // If no markets with volume, show the first 10 markets
    const recentMarkets = markets.slice(0, 10);
    displayMarketsDetailed(recentMarkets);
    return;
  }
  
  displayMarketsDetailed(top10Markets);
}

function displayMarketsDetailed(markets: KalshiMarket[]): void {
  console.log('Top 10 Most Popular Markets on Kalshi:\n');
  console.log('=' .repeat(80));

  markets.forEach((market, index) => {
    console.log(`\n${index + 1}. ${market.title}`);
    console.log(`   Ticker: ${market.ticker}`);
    if (market.subtitle) {
      console.log(`   Subtitle: ${market.subtitle}`);
    }
    console.log(`   Status: ${market.status}`);
    console.log(`   Market Type: ${market.market_type}`);
    
    if (market.dollar_volume !== undefined) {
      console.log(`   Dollar Volume: $${market.dollar_volume.toLocaleString()}`);
    } else if (market.volume !== undefined) {
      console.log(`   Volume: ${market.volume.toLocaleString()} contracts`);
    }
    
    if (market.yes !== undefined) {
      console.log(`   Current Price: ${market.yes}¢`);
    } else if (market.last_price !== undefined) {
      console.log(`   Last Price: ${market.last_price}¢`);
    }
    
    if (market.yes_bid !== undefined && market.yes_ask !== undefined) {
      console.log(`   Yes: Bid ${market.yes_bid}¢ / Ask ${market.yes_ask}¢`);
    }
    
    console.log(`   Closes: ${new Date(market.close_time).toLocaleString()}`);
  });
  
  console.log('\n' + '=' .repeat(80));
}

// Run the script
fetchKalshiMarkets();