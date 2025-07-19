#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

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
  event_ticker?: string;
  series_ticker?: string;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

interface CategorizedMarket extends KalshiMarket {
  category: string;
  subcategory?: string;
  timeHorizon: 'short' | 'medium' | 'long';
  reasoning_type: string[];
}

// Categories for diverse coverage
const CATEGORIES = {
  POLITICS: ['election', 'president', 'congress', 'senate', 'governor', 'policy', 'government', 'political'],
  ECONOMICS: ['gdp', 'inflation', 'unemployment', 'fed', 'interest', 'recession', 'economy', 'stock', 'crypto', 'bitcoin'],
  TECHNOLOGY: ['ai', 'tech', 'launch', 'release', 'software', 'hardware', 'startup', 'ipo'],
  SCIENCE: ['space', 'nasa', 'research', 'discovery', 'climate', 'temperature', 'weather'],
  SPORTS: ['nfl', 'nba', 'mlb', 'soccer', 'tennis', 'olympics', 'championship', 'win', 'score'],
  ENTERTAINMENT: ['movie', 'oscar', 'grammy', 'album', 'song', 'tv', 'netflix', 'disney'],
  SOCIETY: ['population', 'birth', 'death', 'marriage', 'social', 'trend', 'culture'],
  BUSINESS: ['company', 'ceo', 'merger', 'acquisition', 'earnings', 'revenue', 'market'],
  INTERNATIONAL: ['china', 'russia', 'europe', 'war', 'treaty', 'trade', 'global'],
  HEALTH: ['covid', 'vaccine', 'drug', 'fda', 'health', 'disease', 'medical']
};

function categorizeMarket(market: KalshiMarket): CategorizedMarket {
  const titleLower = market.title.toLowerCase();
  const subtitleLower = (market.subtitle || '').toLowerCase();
  const combined = `${titleLower} ${subtitleLower}`;
  
  // Determine category
  let category = 'OTHER';
  let subcategory = '';
  
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      category = cat;
      // Find the specific keyword for subcategory
      const matchedKeyword = keywords.find(keyword => combined.includes(keyword));
      if (matchedKeyword) subcategory = matchedKeyword;
      break;
    }
  }
  
  // Determine time horizon
  const closeDate = new Date(market.close_time);
  const now = new Date();
  const daysUntilClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  let timeHorizon: 'short' | 'medium' | 'long';
  if (daysUntilClose < 90) timeHorizon = 'short';
  else if (daysUntilClose < 365) timeHorizon = 'medium';
  else timeHorizon = 'long';
  
  // Determine reasoning types this question tests
  const reasoning_type: string[] = [];
  
  // Pattern matching for different reasoning types
  if (combined.includes('will') && combined.includes('before')) {
    reasoning_type.push('temporal_reasoning');
  }
  if (combined.includes('how many') || combined.includes('what percent')) {
    reasoning_type.push('quantitative_estimation');
  }
  if (combined.includes('win') || combined.includes('defeat')) {
    reasoning_type.push('competitive_outcome');
  }
  if (combined.includes('announce') || combined.includes('release')) {
    reasoning_type.push('event_prediction');
  }
  if (combined.includes('temperature') || combined.includes('weather')) {
    reasoning_type.push('physical_world_modeling');
  }
  if (combined.includes('policy') || combined.includes('law')) {
    reasoning_type.push('policy_analysis');
  }
  
  return {
    ...market,
    category,
    subcategory,
    timeHorizon,
    reasoning_type
  };
}

async function fetchAllMarkets(): Promise<KalshiMarket[]> {
  const allMarkets: KalshiMarket[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  console.log('Fetching all markets from Kalshi...\n');

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
  } while (cursor && pageCount < 50); // Get more pages for better selection

  return allMarkets;
}

function selectBenchmarkMarkets(markets: CategorizedMarket[]): CategorizedMarket[] {
  console.log('\nSelecting diverse benchmark markets...\n');
  
  // Filter criteria
  const eligibleMarkets = markets.filter(market => {
    // Must be active
    if (market.status !== 'active') return false;
    
    // Must close at least 30 days from now (not too immediate)
    const closeDate = new Date(market.close_time);
    const now = new Date();
    const daysUntilClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilClose < 30) return false;
    
    // Must not close too far in future (less interesting for benchmark)
    if (daysUntilClose > 730) return false; // 2 years
    
    // Exclude markets that seem to be about very recent events
    const titleLower = market.title.toLowerCase();
    const recentTerms = ['yesterday', 'today', 'tomorrow', 'this week', 'next week'];
    if (recentTerms.some(term => titleLower.includes(term))) return false;
    
    // Must have reasonable liquidity or be interesting
    // We'll be more lenient here to get diversity
    return true;
  });
  
  console.log(`Eligible markets after filtering: ${eligibleMarkets.length}`);
  
  // Group by category
  const byCategory = new Map<string, CategorizedMarket[]>();
  for (const market of eligibleMarkets) {
    if (!byCategory.has(market.category)) {
      byCategory.set(market.category, []);
    }
    byCategory.get(market.category)!.push(market);
  }
  
  // Show category distribution
  console.log('\nCategory distribution:');
  for (const [cat, markets] of byCategory) {
    console.log(`  ${cat}: ${markets.length} markets`);
  }
  
  // Select diverse set
  const selected: CategorizedMarket[] = [];
  const targetPerCategory = Math.ceil(200 / byCategory.size);
  
  // First pass: get up to targetPerCategory from each category
  for (const [category, categoryMarkets] of byCategory) {
    // Sort by interestingness (volume + time horizon diversity)
    const sorted = categoryMarkets.sort((a, b) => {
      // Prefer some volume but not requiring high volume
      const aScore = (a.volume || 0) + (a.timeHorizon === 'medium' ? 100 : 0);
      const bScore = (b.volume || 0) + (b.timeHorizon === 'medium' ? 100 : 0);
      return bScore - aScore;
    });
    
    // Take up to target, ensuring diversity within category
    const taken = new Set<string>();
    for (const market of sorted) {
      if (taken.size >= targetPerCategory) break;
      
      // Avoid too similar titles
      const simplified = market.title.toLowerCase().replace(/[0-9]/g, '').slice(0, 30);
      if (!taken.has(simplified)) {
        selected.push(market);
        taken.add(simplified);
      }
    }
  }
  
  // Second pass: fill up to 200 with most interesting remaining
  if (selected.length < 200) {
    const remaining = eligibleMarkets.filter(m => !selected.includes(m));
    remaining.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    selected.push(...remaining.slice(0, 200 - selected.length));
  }
  
  return selected.slice(0, 200);
}

async function createBenchmark(): Promise<void> {
  try {
    // Fetch all markets
    const allMarkets = await fetchAllMarkets();
    console.log(`\nTotal markets fetched: ${allMarkets.length}`);
    
    // Categorize markets
    const categorizedMarkets = allMarkets.map(categorizeMarket);
    
    // Select benchmark set
    const benchmarkMarkets = selectBenchmarkMarkets(categorizedMarkets);
    
    console.log(`\nSelected ${benchmarkMarkets.length} markets for benchmark`);
    
    // Show final category distribution
    const finalDistribution = new Map<string, number>();
    for (const market of benchmarkMarkets) {
      finalDistribution.set(market.category, (finalDistribution.get(market.category) || 0) + 1);
    }
    
    console.log('\nFinal category distribution:');
    for (const [cat, count] of finalDistribution) {
      console.log(`  ${cat}: ${count} markets`);
    }
    
    // Prepare output
    const output = {
      metadata: {
        created_at: new Date().toISOString(),
        total_markets: benchmarkMarkets.length,
        source: 'Kalshi API',
        selection_criteria: {
          status: 'active',
          days_until_close: '30-730',
          excluded_terms: ['yesterday', 'today', 'tomorrow', 'this week', 'next week']
        },
        category_distribution: Object.fromEntries(finalDistribution)
      },
      markets: benchmarkMarkets.map(market => ({
        ticker: market.ticker,
        title: market.title,
        subtitle: market.subtitle,
        category: market.category,
        subcategory: market.subcategory,
        time_horizon: market.timeHorizon,
        reasoning_types: market.reasoning_type,
        close_time: market.close_time,
        current_probability: market.yes || market.last_price || null,
        volume: market.volume || 0,
        yes_subtitle: market.yes_sub_title,
        no_subtitle: market.no_sub_title
      }))
    };
    
    // Save to file
    const filename = `kalshi-forecasting-benchmark-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\nBenchmark saved to: ${filename}`);
    
    // Show some examples
    console.log('\nExample questions from each category:');
    for (const [cat, _] of finalDistribution) {
      const example = benchmarkMarkets.find(m => m.category === cat);
      if (example) {
        console.log(`\n${cat}:`);
        console.log(`  "${example.title}"`);
        console.log(`  Current probability: ${example.yes || example.last_price || 'N/A'}¢`);
        console.log(`  Closes: ${new Date(example.close_time).toLocaleDateString()}`);
      }
    }
    
  } catch (error) {
    console.error('Error creating benchmark:', error);
  }
}

// Run the script
createBenchmark();