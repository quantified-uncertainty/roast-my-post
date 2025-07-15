#!/usr/bin/env tsx
import { extractForecasts } from '../forecaster';

async function main() {
  const text = `
    Market analysts believe there's a 70% probability that the Federal Reserve will 
    cut interest rates by at least 50 basis points before the end of 2025. This 
    could trigger a significant rally in tech stocks.
    
    Meanwhile, climate scientists warn that without immediate action, global 
    temperatures will almost certainly rise by 2°C above pre-industrial levels 
    by 2040, with catastrophic consequences.
    
    In the AI space, several experts predict that we'll see the first genuinely 
    useful humanoid robots in commercial settings within the next 3-5 years, 
    though full deployment might take a decade.
  `;
  
  console.log('📊 Extracting forecasts from text...\n');
  
  const forecasts = await extractForecasts(text);
  
  console.log(`Found ${forecasts.length} forecasts:\n`);
  
  forecasts.forEach((f, i) => {
    console.log(`${i + 1}. ${f.topic}`);
    console.log(`   📝 "${f.text}"`);
    if (f.probability) console.log(`   📊 Probability: ${f.probability}%`);
    if (f.timeframe) console.log(`   📅 Timeframe: ${f.timeframe}`);
    console.log();
  });
}

main().catch(console.error);