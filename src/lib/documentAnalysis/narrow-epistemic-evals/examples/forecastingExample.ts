#!/usr/bin/env tsx
/**
 * Example usage of the forecasting module's clean API
 */

import { getForecast, extractForecasts } from '../forecaster';

async function main() {
  console.log('🔮 Forecasting Module Examples\n');
  
  // Example 1: Simple forecast generation
  console.log('1️⃣ Simple Forecast Generation:');
  console.log('--------------------------------');
  
  const forecast1 = await getForecast(
    "Will SpaceX successfully land humans on Mars by 2035?"
  );
  
  console.log(`Question: Will SpaceX successfully land humans on Mars by 2035?`);
  console.log(`Probability: ${forecast1.probability}%`);
  console.log(`Analysis: ${forecast1.description}\n`);
  
  // Example 2: Forecast with context
  console.log('2️⃣ Forecast with Context:');
  console.log('---------------------------');
  
  const forecast2 = await getForecast(
    "Will global EV sales exceed 50% of new car sales?",
    "Current EV market share is around 15%, growing at 30% annually",
    "By 2030"
  );
  
  console.log(`Question: Will global EV sales exceed 50% of new car sales by 2030?`);
  console.log(`Context: Current market share ~15%, growing 30% annually`);
  console.log(`Probability: ${forecast2.probability}%`);
  console.log(`Analysis: ${forecast2.description}\n`);
  
  // Example 3: Extract forecasts from text
  console.log('3️⃣ Extract Forecasts from Text:');
  console.log('---------------------------------');
  
  const text = `
    Industry analysts predict that artificial general intelligence (AGI) has a 
    60-70% chance of being achieved within the next 20 years. Meanwhile, quantum 
    computers will likely reach 1000+ qubit systems by 2026, enabling practical 
    applications. There's also growing consensus that renewable energy will 
    constitute over 80% of global electricity generation by 2050.
  `;
  
  const extractedForecasts = await extractForecasts(text);
  
  console.log('Found forecasts:');
  extractedForecasts.forEach((f, i) => {
    console.log(`\n${i + 1}. ${f.topic}`);
    console.log(`   Statement: "${f.text}"`);
    if (f.probability) console.log(`   Probability: ${f.probability}%`);
    if (f.timeframe) console.log(`   Timeframe: ${f.timeframe}`);
  });
}

// Run examples
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});