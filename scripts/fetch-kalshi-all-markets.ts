#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

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
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

async function fetchAllMarkets(): Promise<KalshiMarket[]> {
  const allMarkets: KalshiMarket[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    const url = cursor 
      ? `${KALSHI_API_BASE}/markets?cursor=${cursor}`
      : `${KALSHI_API_BASE}/markets`;
    
    console.log(`Fetching page ${++pageCount}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      break;
    }

    const data = await response.json() as KalshiMarketsResponse;
    allMarkets.push(...data.markets);
    cursor = data.cursor;
    
    console.log(`  Found ${data.markets.length} markets on this page`);
  } while (cursor && pageCount < 10); // Limit to 10 pages for safety

  return allMarkets;
}

async function analyzeMarkets(): Promise<void> {
  try {
    console.log('Fetching all markets from Kalshi...\n');

    const markets = await fetchAllMarkets();
    
    console.log(`\nTotal markets fetched: ${markets.length}`);
    
    // Analyze market activity
    const activeMarkets = markets.filter(m => m.status === 'active');
    const marketsWithVolume = markets.filter(m => (m.volume || 0) > 0);
    const marketsWithDollarVolume = markets.filter(m => (m.dollar_volume || 0) > 0);
    
    console.log(`Active markets: ${activeMarkets.length}`);
    console.log(`Markets with volume > 0: ${marketsWithVolume.length}`);
    console.log(`Markets with dollar volume > 0: ${marketsWithDollarVolume.length}`);
    
    // Sort by different metrics
    const byVolume = [...marketsWithVolume].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const byDollarVolume = [...marketsWithDollarVolume].sort((a, b) => (b.dollar_volume || 0) - (a.dollar_volume || 0));
    
    // Find markets with actual trading activity
    const tradingMarkets = markets.filter(m => 
      m.status === 'active' && 
      ((m.volume || 0) > 100 || (m.dollar_volume || 0) > 1000)
    );
    
    console.log(`\nMarkets with significant trading (>100 contracts or >$1000 volume): ${tradingMarkets.length}`);
    
    // Display top 10 by volume
    console.log('\n' + '='.repeat(80));
    console.log('TOP 10 MARKETS BY CONTRACT VOLUME:');
    console.log('='.repeat(80));
    
    byVolume.slice(0, 10).forEach((market, index) => {
      console.log(`\n${index + 1}. ${market.title}`);
      console.log(`   Ticker: ${market.ticker}`);
      console.log(`   Volume: ${market.volume?.toLocaleString() || 0} contracts`);
      console.log(`   Dollar Volume: $${market.dollar_volume?.toLocaleString() || 'N/A'}`);
      console.log(`   Current Price: ${market.yes || market.last_price || 'N/A'}¢`);
      console.log(`   Status: ${market.status}`);
    });
    
    // Display top 10 by dollar volume if different
    if (byDollarVolume.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('TOP 10 MARKETS BY DOLLAR VOLUME:');
      console.log('='.repeat(80));
      
      byDollarVolume.slice(0, 10).forEach((market, index) => {
        console.log(`\n${index + 1}. ${market.title}`);
        console.log(`   Ticker: ${market.ticker}`);
        console.log(`   Dollar Volume: $${market.dollar_volume?.toLocaleString() || 0}`);
        console.log(`   Volume: ${market.volume?.toLocaleString() || 'N/A'} contracts`);
        console.log(`   Current Price: ${market.yes || market.last_price || 'N/A'}¢`);
        console.log(`   Status: ${market.status}`);
      });
    }

  } catch (error) {
    console.error('Error analyzing Kalshi markets:', error);
  }
}

// Run the script
analyzeMarkets();