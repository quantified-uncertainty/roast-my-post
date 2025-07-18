#!/usr/bin/env tsx
/**
 * Direct runner for the forecaster tool
 * Usage: tsx direct-run.ts "question" numForecasts
 */

import forecasterTool from './index';

// Mock logger to suppress output
const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger
};

// Suppress console output during execution
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

async function main() {
  const [question, numForecastsStr] = process.argv.slice(2);
  
  if (!question) {
    console.error('Usage: tsx direct-run.ts "question" [numForecasts]');
    process.exit(1);
  }
  
  const numForecasts = parseInt(numForecastsStr || '1', 10);
  
  try {
    // Suppress logs during execution
    console.log = () => {};
    console.error = () => {};
    
    const result = await forecasterTool.run(
      { question, numForecasts },
      { 
        userId: 'evaluation-script',
        logger: silentLogger as any,
        apiKey: undefined
      }
    );
    
    // Restore console and output clean JSON
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.log(JSON.stringify(result));
  } catch (error) {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.error(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }));
    process.exit(1);
  }
}

main().catch(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  process.exit(1);
});