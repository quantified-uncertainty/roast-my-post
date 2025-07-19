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

// Enhanced categories for better coverage
const CATEGORIES = {
  POLITICS: ['election', 'president', 'congress', 'senate', 'governor', 'policy', 'government', 'political', 'vote', 'confirm', 'cabinet', 'supreme court'],
  ECONOMICS: ['gdp', 'inflation', 'unemployment', 'fed', 'interest', 'recession', 'economy', 'stock', 'crypto', 'bitcoin', 'dollar', 'market', 'tariff', 'trade'],
  TECHNOLOGY: ['ai', 'tech', 'launch', 'release', 'software', 'hardware', 'startup', 'ipo', 'openai', 'google', 'apple', 'meta', 'browser', 'juul'],
  SCIENCE: ['space', 'nasa', 'research', 'discovery', 'climate', 'temperature', 'weather', 'science', 'study', 'asteroid', 'mission'],
  SPORTS: ['nfl', 'nba', 'mlb', 'soccer', 'tennis', 'olympics', 'championship', 'win', 'score', 'player', 'team', 'game', 'match', 'clutch', 'defensive'],
  ENTERTAINMENT: ['movie', 'oscar', 'grammy', 'album', 'song', 'tv', 'netflix', 'disney', 'actor', 'artist', 'show', 'joe rogan'],
  SOCIETY: ['population', 'birth', 'death', 'marriage', 'social', 'trend', 'culture', 'people', 'public', 'rent', 'housing'],
  BUSINESS: ['company', 'ceo', 'merger', 'acquisition', 'earnings', 'revenue', 'market', 'business', 'corporate', 'manchester united'],
  INTERNATIONAL: ['china', 'russia', 'europe', 'war', 'treaty', 'trade', 'global', 'country', 'nation', 'world', 'abraham accords', 'iran', 'saudi'],
  HEALTH: ['covid', 'vaccine', 'drug', 'fda', 'health', 'disease', 'medical', 'hospital', 'treatment', 'protected status']
};

function isValidMarketTitle(title: string): boolean {
  // Check for missing names (double spaces or leading/trailing spaces around words)
  if (title.includes('  ')) return false;
  if (title.includes(' as ')) {
    const beforeAs = title.split(' as ')[0];
    if (beforeAs.trim().split(' ').pop() === '') return false;
  }
  
  // Check for incomplete patterns
  const incompletePatterns = [
    /Who will\s+sign/,
    /Will\s+be/,
    /How many.*vote.*\s+as/,
    /When will\s+release/,
    /Will\s+win/,
    /defeat\s+in/,
  ];
  
  for (const pattern of incompletePatterns) {
    if (pattern.test(title)) return false;
  }
  
  // Ensure title has minimum length and substance
  if (title.length < 20) return false;
  
  // Check for other suspicious patterns
  if (title.startsWith(' ') || title.endsWith(' ')) return false;
  if (title.includes('?  ')) return false;
  
  return true;
}

function categorizeMarket(market: KalshiMarket): CategorizedMarket {
  const titleLower = market.title.toLowerCase();
  const subtitleLower = (market.subtitle || '').toLowerCase();
  const combined = `${titleLower} ${subtitleLower}`;
  
  // Determine category with enhanced matching
  let category = 'OTHER';
  let subcategory = '';
  
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      category = cat;
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
  
  // Enhanced reasoning type detection
  const reasoning_type: string[] = [];
  
  if (combined.includes('will') && combined.includes('before')) {
    reasoning_type.push('temporal_reasoning');
  }
  if (combined.includes('how many') || combined.includes('what percent') || combined.includes('how much') || combined.includes('how high')) {
    reasoning_type.push('quantitative_estimation');
  }
  if (combined.includes('win') || combined.includes('defeat') || combined.includes('beat')) {
    reasoning_type.push('competitive_outcome');
  }
  if (combined.includes('announce') || combined.includes('release') || combined.includes('launch')) {
    reasoning_type.push('event_prediction');
  }
  if (combined.includes('temperature') || combined.includes('weather') || combined.includes('rain')) {
    reasoning_type.push('physical_world_modeling');
  }
  if (combined.includes('policy') || combined.includes('law') || combined.includes('regulation')) {
    reasoning_type.push('policy_analysis');
  }
  if (combined.includes('price') || combined.includes('cost') || combined.includes('value') || combined.includes('revenue')) {
    reasoning_type.push('market_prediction');
  }
  if (combined.includes('who will')) {
    reasoning_type.push('selection_prediction');
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
  } while (cursor && pageCount < 50);

  return allMarkets;
}

function selectBenchmarkMarkets(markets: CategorizedMarket[]): CategorizedMarket[] {
  console.log('\nSelecting diverse benchmark markets...\n');
  
  // Filter criteria
  const eligibleMarkets = markets.filter(market => {
    // Must be active
    if (market.status !== 'active') return false;
    
    // Must have a valid, complete title
    if (!isValidMarketTitle(market.title)) return false;
    
    // Must close at least 30 days from now
    const closeDate = new Date(market.close_time);
    const now = new Date();
    const daysUntilClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilClose < 30) return false;
    
    // Must not close too far in future
    if (daysUntilClose > 730) return false;
    
    // Exclude markets that seem to be about very recent events
    const titleLower = market.title.toLowerCase();
    const recentTerms = ['yesterday', 'today', 'tomorrow', 'this week', 'next week'];
    if (recentTerms.some(term => titleLower.includes(term))) return false;
    
    // Exclude markets with placeholder text
    if (titleLower.includes('tbd') || titleLower.includes('to be determined')) return false;
    
    return true;
  });
  
  console.log(`Markets with valid titles: ${eligibleMarkets.length}`);
  
  // Group by title to handle multi-outcome markets
  const uniqueQuestions = new Map<string, CategorizedMarket[]>();
  for (const market of eligibleMarkets) {
    if (!uniqueQuestions.has(market.title)) {
      uniqueQuestions.set(market.title, []);
    }
    uniqueQuestions.get(market.title)!.push(market);
  }
  
  console.log(`Unique questions: ${uniqueQuestions.size}`);
  
  // For each unique question, pick the best representative
  const deduplicatedMarkets: CategorizedMarket[] = [];
  for (const [title, options] of uniqueQuestions) {
    // Sort by volume and probability availability
    const sorted = options.sort((a, b) => {
      // Prefer markets with probability data
      const aHasProb = (a.yes !== null && a.yes !== undefined) ? 1 : 0;
      const bHasProb = (b.yes !== null && b.yes !== undefined) ? 1 : 0;
      if (aHasProb !== bHasProb) return bHasProb - aHasProb;
      
      // Then by volume
      return (b.volume || 0) - (a.volume || 0);
    });
    
    deduplicatedMarkets.push(sorted[0]);
  }
  
  // Group by category
  const byCategory = new Map<string, CategorizedMarket[]>();
  for (const market of deduplicatedMarkets) {
    if (!byCategory.has(market.category)) {
      byCategory.set(market.category, []);
    }
    byCategory.get(market.category)!.push(market);
  }
  
  // Show category distribution
  console.log('\nCategory distribution after deduplication:');
  for (const [cat, markets] of byCategory) {
    console.log(`  ${cat}: ${markets.length} unique questions`);
  }
  
  // Select diverse set with better balance
  const selected: CategorizedMarket[] = [];
  
  // Target distribution (out of 200)
  const targetDistribution = {
    POLITICS: 25,
    ECONOMICS: 25,
    TECHNOLOGY: 25,
    SCIENCE: 20,
    SPORTS: 30,
    ENTERTAINMENT: 15,
    SOCIETY: 15,
    BUSINESS: 20,
    INTERNATIONAL: 15,
    HEALTH: 10
  };
  
  // First pass: try to meet targets for each category
  for (const [category, target] of Object.entries(targetDistribution)) {
    const categoryMarkets = byCategory.get(category) || [];
    
    // Sort by quality metrics
    const sorted = categoryMarkets.sort((a, b) => {
      // Calculate quality score
      const aScore = 
        (a.yes !== null && a.yes !== undefined ? 100 : 0) + // Has probability
        (a.volume || 0) * 0.1 + // Some volume weight
        (a.reasoning_type.length * 50) + // Complex reasoning
        (a.timeHorizon === 'medium' ? 50 : 0); // Medium-term preference
        
      const bScore = 
        (b.yes !== null && b.yes !== undefined ? 100 : 0) +
        (b.volume || 0) * 0.1 +
        (b.reasoning_type.length * 50) +
        (b.timeHorizon === 'medium' ? 50 : 0);
        
      return bScore - aScore;
    });
    
    // Take up to target
    const toTake = Math.min(sorted.length, target);
    selected.push(...sorted.slice(0, toTake));
    
    if (toTake < target) {
      console.log(`  Warning: ${category} only has ${toTake} questions (target: ${target})`);
    }
  }
  
  // Fill remaining slots with best available from any category
  if (selected.length < 200) {
    const remaining = deduplicatedMarkets
      .filter(m => !selected.includes(m))
      .sort((a, b) => {
        const aScore = (a.yes !== null && a.yes !== undefined ? 100 : 0) + (a.volume || 0);
        const bScore = (b.yes !== null && b.yes !== undefined ? 100 : 0) + (b.volume || 0);
        return bScore - aScore;
      });
    
    selected.push(...remaining.slice(0, 200 - selected.length));
  }
  
  return selected.slice(0, 200);
}

async function createBenchmark(): Promise<void> {
  try {
    // Fetch all markets
    const allMarkets = await fetchAllMarkets();
    console.log(`\nTotal markets fetched: ${allMarkets.length}`);
    
    // Show how many have invalid titles
    const invalidTitles = allMarkets.filter(m => !isValidMarketTitle(m.title));
    console.log(`Markets with invalid/incomplete titles: ${invalidTitles.length}`);
    
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
    
    // Show probability coverage
    const withProbability = benchmarkMarkets.filter(m => m.yes !== null && m.yes !== undefined);
    console.log(`\nMarkets with probability data: ${withProbability.length}/${benchmarkMarkets.length} (${(withProbability.length/benchmarkMarkets.length*100).toFixed(1)}%)`);
    
    // Prepare output
    const output = {
      metadata: {
        created_at: new Date().toISOString(),
        total_markets: benchmarkMarkets.length,
        unique_questions: benchmarkMarkets.length,
        source: 'Kalshi API',
        selection_criteria: {
          status: 'active',
          days_until_close: '30-730',
          excluded_terms: ['yesterday', 'today', 'tomorrow', 'this week', 'next week'],
          title_validation: 'excluded incomplete titles with missing names',
          deduplication: 'one market per unique question title'
        },
        category_distribution: Object.fromEntries(finalDistribution),
        probability_coverage: `${withProbability.length}/${benchmarkMarkets.length}`
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
    const filename = `kalshi-forecasting-benchmark-final-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\nBenchmark saved to: ${filename}`);
    
    // Show diverse examples
    console.log('\nDiverse example questions:');
    const examples = [
      'POLITICS', 'ECONOMICS', 'TECHNOLOGY', 'SCIENCE', 'INTERNATIONAL', 'SOCIETY'
    ];
    
    for (const cat of examples) {
      const example = benchmarkMarkets.find(m => m.category === cat);
      if (example) {
        console.log(`\n${cat}:`);
        console.log(`  "${example.title}"`);
        console.log(`  Probability: ${example.yes || example.last_price || 'N/A'}¢`);
        console.log(`  Reasoning types: ${example.reasoning_type.join(', ') || 'general'}`);
        console.log(`  Closes: ${new Date(example.close_time).toLocaleDateString()}`);
      }
    }
    
  } catch (error) {
    console.error('Error creating benchmark:', error);
  }
}

// Run the script
createBenchmark();