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
  volume_24h?: number;
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
  rules_primary?: string;
  category?: string;
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
  full_question: string;
}

// Enhanced categories
const CATEGORIES = {
  POLITICS: ['election', 'president', 'congress', 'senate', 'governor', 'policy', 'government', 'political', 'vote', 'confirm', 'cabinet', 'supreme court'],
  ECONOMICS: ['gdp', 'inflation', 'unemployment', 'fed', 'interest', 'recession', 'economy', 'stock', 'crypto', 'bitcoin', 'dollar', 'market', 'tariff', 'trade', 'revenue'],
  TECHNOLOGY: ['ai', 'tech', 'launch', 'release', 'software', 'hardware', 'startup', 'ipo', 'openai', 'google', 'apple', 'meta', 'browser', 'juul'],
  SCIENCE: ['space', 'nasa', 'research', 'discovery', 'climate', 'temperature', 'weather', 'science', 'study', 'asteroid', 'mission'],
  SPORTS: ['nfl', 'nba', 'mlb', 'soccer', 'tennis', 'olympics', 'championship', 'win', 'score', 'player', 'team', 'game', 'match', 'mvp', 'defensive', 'coach'],
  ENTERTAINMENT: ['movie', 'oscar', 'grammy', 'album', 'song', 'tv', 'netflix', 'disney', 'actor', 'artist', 'show', 'joe rogan'],
  SOCIETY: ['population', 'birth', 'death', 'marriage', 'social', 'trend', 'culture', 'people', 'public', 'rent', 'housing'],
  BUSINESS: ['company', 'ceo', 'merger', 'acquisition', 'earnings', 'revenue', 'market', 'business', 'corporate', 'manchester united', 'acquire'],
  INTERNATIONAL: ['china', 'russia', 'europe', 'war', 'treaty', 'trade', 'global', 'country', 'nation', 'world', 'abraham accords', 'iran', 'saudi', 'japan'],
  HEALTH: ['covid', 'vaccine', 'drug', 'fda', 'health', 'disease', 'medical', 'hospital', 'treatment', 'protected status']
};

function isValidMarketTitle(title: string): boolean {
  // More lenient validation
  if (title.length < 10) return false; // Reduced from 20
  if (title.includes('  ')) return false; // No double spaces
  if (!title.includes('?') && !title.includes('will') && !title.includes('Who') && !title.includes('What') && !title.includes('When')) {
    return false; // Should be a question or prediction
  }
  return true;
}

function getFullQuestion(market: KalshiMarket): string {
  // Combine title with answer option for multi-outcome markets
  if (market.yes_sub_title && !market.title.includes(market.yes_sub_title)) {
    // For questions like "Who will win MVP?" -> "Who will win MVP? (Player Name)"
    return `${market.title} [${market.yes_sub_title}]`;
  }
  return market.title;
}

function categorizeMarket(market: KalshiMarket): CategorizedMarket {
  const titleLower = market.title.toLowerCase();
  const subtitleLower = (market.subtitle || '').toLowerCase();
  const yesSubTitleLower = (market.yes_sub_title || '').toLowerCase();
  const combined = `${titleLower} ${subtitleLower} ${yesSubTitleLower}`;
  
  // Determine category
  let category = 'OTHER';
  let subcategory = '';
  
  // Check market.category first if available
  if (market.category) {
    const marketCatLower = market.category.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
      if (keywords.some(keyword => marketCatLower.includes(keyword))) {
        category = cat;
        break;
      }
    }
  }
  
  // If still OTHER, check title/subtitle
  if (category === 'OTHER') {
    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        category = cat;
        const matchedKeyword = keywords.find(keyword => combined.includes(keyword));
        if (matchedKeyword) subcategory = matchedKeyword;
        break;
      }
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
  
  // Determine reasoning types
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
  if (titleLower.startsWith('who will') || titleLower.startsWith('who wins')) {
    reasoning_type.push('selection_prediction');
  }
  
  return {
    ...market,
    category,
    subcategory,
    timeHorizon,
    reasoning_type,
    full_question: getFullQuestion(market)
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
    
    // Must have a valid title
    if (!isValidMarketTitle(market.title)) return false;
    
    // Must close at least 30 days from now
    const closeDate = new Date(market.close_time);
    const now = new Date();
    const daysUntilClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilClose < 30) return false;
    
    // Must not close too far in future
    if (daysUntilClose > 730) return false;
    
    // Exclude very recent events
    const titleLower = market.title.toLowerCase();
    const recentTerms = ['yesterday', 'today', 'tomorrow', 'this week', 'next week'];
    if (recentTerms.some(term => titleLower.includes(term))) return false;
    
    return true;
  });
  
  console.log(`Eligible markets: ${eligibleMarkets.length}`);
  
  // Group by base question (for multi-outcome markets)
  const questionGroups = new Map<string, CategorizedMarket[]>();
  for (const market of eligibleMarkets) {
    if (!questionGroups.has(market.title)) {
      questionGroups.set(market.title, []);
    }
    questionGroups.get(market.title)!.push(market);
  }
  
  console.log(`Unique base questions: ${questionGroups.size}`);
  
  // Select markets with strategic multi-outcome inclusion
  const selected: CategorizedMarket[] = [];
  const maxOptionsPerQuestion = 3; // Limit duplicates
  
  // Group by category for balanced selection
  const byCategory = new Map<string, { question: string, markets: CategorizedMarket[] }[]>();
  
  for (const [question, options] of questionGroups) {
    const category = options[0].category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push({ question, markets: options });
  }
  
  // Show category distribution
  console.log('\nCategory distribution:');
  for (const [cat, groups] of byCategory) {
    const totalMarkets = groups.reduce((sum, g) => sum + g.markets.length, 0);
    console.log(`  ${cat}: ${groups.length} questions, ${totalMarkets} total markets`);
  }
  
  // Target distribution
  const targetPerCategory = {
    POLITICS: 20,
    ECONOMICS: 20,
    TECHNOLOGY: 25,
    SCIENCE: 15,
    SPORTS: 40,
    ENTERTAINMENT: 15,
    SOCIETY: 15,
    BUSINESS: 20,
    INTERNATIONAL: 15,
    HEALTH: 10,
    OTHER: 5
  };
  
  // Select from each category
  for (const [category, target] of Object.entries(targetPerCategory)) {
    const categoryGroups = byCategory.get(category) || [];
    let categoryCount = 0;
    
    // Sort by quality (prefer markets with data)
    const sortedGroups = categoryGroups.sort((a, b) => {
      const aScore = a.markets.reduce((sum, m) => sum + (m.volume || 0) + (m.last_price ? 100 : 0), 0);
      const bScore = b.markets.reduce((sum, m) => sum + (m.volume || 0) + (m.last_price ? 100 : 0), 0);
      return bScore - aScore;
    });
    
    for (const group of sortedGroups) {
      if (categoryCount >= target) break;
      
      // Sort options by volume/price availability
      const sortedOptions = group.markets.sort((a, b) => {
        const aScore = (a.volume || 0) + (a.last_price ? 100 : 0);
        const bScore = (b.volume || 0) + (b.last_price ? 100 : 0);
        return bScore - aScore;
      });
      
      // Take up to maxOptionsPerQuestion
      const toTake = Math.min(
        sortedOptions.length, 
        maxOptionsPerQuestion,
        target - categoryCount
      );
      
      selected.push(...sortedOptions.slice(0, toTake));
      categoryCount += toTake;
    }
  }
  
  // If we don't have 200 yet, add more from any category
  if (selected.length < 200) {
    const remaining = eligibleMarkets
      .filter(m => !selected.includes(m))
      .sort((a, b) => {
        const aScore = (a.volume || 0) + (a.last_price ? 100 : 0) + (a.reasoning_type.length * 50);
        const bScore = (b.volume || 0) + (b.last_price ? 100 : 0) + (b.reasoning_type.length * 50);
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
    
    // Categorize markets
    const categorizedMarkets = allMarkets.map(categorizeMarket);
    
    // Select benchmark set
    const benchmarkMarkets = selectBenchmarkMarkets(categorizedMarkets);
    
    console.log(`\nSelected ${benchmarkMarkets.length} markets for benchmark`);
    
    // Analyze final selection
    const finalCategories = new Map<string, number>();
    const uniqueQuestions = new Set<string>();
    
    for (const market of benchmarkMarkets) {
      finalCategories.set(market.category, (finalCategories.get(market.category) || 0) + 1);
      uniqueQuestions.add(market.title);
    }
    
    console.log('\nFinal selection:');
    console.log(`  Total markets: ${benchmarkMarkets.length}`);
    console.log(`  Unique questions: ${uniqueQuestions.size}`);
    
    console.log('\nCategory distribution:');
    for (const [cat, count] of finalCategories) {
      console.log(`  ${cat}: ${count} markets`);
    }
    
    // Check data quality
    const withPrice = benchmarkMarkets.filter(m => m.last_price !== null && m.last_price !== undefined);
    const withVolume = benchmarkMarkets.filter(m => (m.volume || 0) > 0);
    
    console.log('\nData quality:');
    console.log(`  Markets with price data: ${withPrice.length} (${(withPrice.length/benchmarkMarkets.length*100).toFixed(1)}%)`);
    console.log(`  Markets with volume > 0: ${withVolume.length} (${(withVolume.length/benchmarkMarkets.length*100).toFixed(1)}%)`);
    
    // Prepare output
    const output = {
      metadata: {
        created_at: new Date().toISOString(),
        total_markets: benchmarkMarkets.length,
        unique_questions: uniqueQuestions.size,
        source: 'Kalshi API',
        selection_criteria: {
          status: 'active',
          days_until_close: '30-730',
          excluded_terms: ['yesterday', 'today', 'tomorrow', 'this week', 'next week'],
          multi_outcome_handling: 'max 3 options per question',
          prioritized_data_quality: true
        },
        category_distribution: Object.fromEntries(finalCategories),
        data_quality: {
          with_price_data: withPrice.length,
          with_volume: withVolume.length
        }
      },
      markets: benchmarkMarkets.map(market => ({
        ticker: market.ticker,
        title: market.title,
        full_question: market.full_question,
        category: market.category,
        subcategory: market.subcategory,
        time_horizon: market.timeHorizon,
        reasoning_types: market.reasoning_type,
        close_time: market.close_time,
        current_probability: market.last_price || null,
        volume: market.volume || 0,
        yes_option: market.yes_sub_title,
        rules: market.rules_primary
      }))
    };
    
    // Save to file
    const filename = `kalshi-forecasting-benchmark-v2-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\nBenchmark saved to: ${filename}`);
    
    // Show examples
    console.log('\nExample questions by category:');
    const exampleCategories = ['POLITICS', 'ECONOMICS', 'TECHNOLOGY', 'SCIENCE', 'SPORTS'];
    
    for (const cat of exampleCategories) {
      const examples = benchmarkMarkets.filter(m => m.category === cat).slice(0, 2);
      if (examples.length > 0) {
        console.log(`\n${cat}:`);
        examples.forEach(ex => {
          console.log(`  - "${ex.full_question}"`);
          console.log(`    Price: ${ex.last_price || 'N/A'}¢, Volume: ${ex.volume || 0}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error creating benchmark:', error);
  }
}

// Run the script
createBenchmark();